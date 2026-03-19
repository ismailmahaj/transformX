const express = require("express");
const { z } = require("zod");

const { pool } = require("../db/pool");
const { upsertUserLog } = require("../db/queries/userLogs");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { rows } = await pool.query(
      `
      SELECT id, user_id, date, day_number, workout_done, meals_done, xp_earned, created_at
      FROM user_logs
      WHERE user_id = $1
      ORDER BY date ASC
      `,
      [userId]
    );
    return res.json({ logs: rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const schema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      day_number: z.number().int().min(1).max(180),
      workout_done: z.boolean().optional(),
      meals_done: z.boolean().optional(),
      xp_earned: z.number().int().min(0).optional(),
    });

    const body = schema.parse(req.body);
    const userId = req.user?.userId;

    const saved = await upsertUserLog(userId, {
      date: body.date ?? new Date().toISOString().slice(0, 10),
      dayNumber: body.day_number,
      workoutDone: body.workout_done ?? false,
      mealsDone: body.meals_done ?? false,
      xpEarned: body.xp_earned ?? 0,
    });

    return res.status(201).json({ log: saved });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Invalid payload", details: err.errors });
    return next(err);
  }
});

module.exports = router;
