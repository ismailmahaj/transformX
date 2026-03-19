const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const { createUser, getUserByEmail } = require("../db/queries/users");
const { ensureStreakRow } = require("../db/queries/streaks");

const router = express.Router();

function signToken(user) {
  const secret = process.env.API_JWT_SECRET;
  if (!secret) throw new Error("Missing API_JWT_SECRET");
  const expiresIn = process.env.API_JWT_EXPIRES_IN || "7d";

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name ?? null,
      is_admin: Boolean(user.is_admin),
    },
    secret,
    { expiresIn }
  );
}

router.post("/register", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8).max(128),
      name: z.string().min(1).max(120).optional(),
      height_cm: z.number().int().min(100).max(250).optional(),
      weight_start_kg: z.number().min(30).max(250).optional(),
      goal: z.string().max(240).optional(),
    });

    const body = schema.parse(req.body);

    const existing = await getUserByEmail(body.email.toLowerCase());
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await createUser({
      email: body.email.toLowerCase(),
      passwordHash,
      name: body.name,
      heightCm: body.height_cm,
      weightStartKg: body.weight_start_kg,
      goal: body.goal,
    });

    await ensureStreakRow(user.id);

    const token = signToken(user);
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      height_cm: user.height_cm,
      weight_start_kg: user.weight_start_kg,
      goal: user.goal,
      is_admin: Boolean(user.is_admin),
      created_at: user.created_at,
    };
    return res.status(201).json({ token, user: safeUser });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Invalid payload", details: err.errors });
    return next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(1).max(128),
    });

    const body = schema.parse(req.body);
    const userRow = await getUserByEmail(body.email.toLowerCase());
    if (!userRow || !userRow.password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(body.password, userRow.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    const user = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      height_cm: userRow.height_cm,
      weight_start_kg: userRow.weight_start_kg,
      goal: userRow.goal,
      is_admin: Boolean(userRow.is_admin),
      created_at: userRow.created_at,
    };

    const token = signToken(userRow);
    return res.json({ token, user });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Invalid payload", details: err.errors });
    return next(err);
  }
});

module.exports = router;
