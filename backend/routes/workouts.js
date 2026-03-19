const express = require("express");
const { z } = require("zod");

const { getWorkoutByDay } = require("../db/queries/workouts");
const { getUserById } = require("../db/queries/users");
const { upsertUserLog, getUserLogByDate } = require("../db/queries/userLogs");

const router = express.Router();

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

function daysBetweenUtc(a, b) {
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bUtc - aUtc) / (24 * 60 * 60 * 1000));
}

function goalToGoalType(goal) {
  if (goal === "Perdre du gras") return "crossfit";
  if (goal === "Prendre du muscle") return "muscle";
  if (goal === "Les deux") return "mixed";
  return "crossfit";
}

async function getTodayDayNumberAndGoalType(userId) {
  const user = await getUserById(userId);
  if (!user) return null;

  const createdAt = new Date(user.created_at);
  const today = new Date();
  const offset = daysBetweenUtc(createdAt, today);
  const dayNumber = Math.min(180, Math.max(1, offset + 1));
  return { dayNumber, goalType: goalToGoalType(user.goal) };
}

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const today = await getTodayDayNumberAndGoalType(userId);
    if (!today) return res.status(404).json({ error: "User not found" });

    const workout = await getWorkoutByDay(today.dayNumber, today.goalType);
    if (!workout)
      return res.status(404).json({ error: "Workout not found for today", day_number: today.dayNumber });

    return res.json({ day_number: today.dayNumber, workout });
  } catch (err) {
    return next(err);
  }
});

router.get("/:day", async (req, res, next) => {
  try {
    const day = Number(req.params.day);
    if (!Number.isFinite(day) || day < 1 || day > 180) return res.status(400).json({ error: "Invalid day" });

    const userId = req.user?.userId;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const goalType = goalToGoalType(user.goal);

    const workout = await getWorkoutByDay(day, goalType);
    if (!workout) return res.status(404).json({ error: "Workout not found" });

    return res.json({ workout });
  } catch (err) {
    return next(err);
  }
});

router.post("/:day/complete", async (req, res, next) => {
  try {
    const schema = z.object({
      meals_done: z.boolean().optional(),
    });

    const day = Number(req.params.day);
    if (!Number.isFinite(day) || day < 1 || day > 180) return res.status(400).json({ error: "Invalid day" });

    const body = schema.safeParse(req.body ?? {});
    if (!body.success) return res.status(400).json({ error: "Invalid payload", details: body.error.errors });

    const userId = req.user?.userId;
    const today = new Date();
    const date = toIsoDate(today);

    const existing = await getUserLogByDate(userId, date);
    const xpBase = 50;
    const xpEarned = existing?.workout_done ? existing.xp_earned : (existing?.xp_earned ?? 0) + xpBase;

    const updated = await upsertUserLog(userId, {
      date,
      dayNumber: day,
      workoutDone: true,
      mealsDone: body.data.meals_done ?? existing?.meals_done ?? false,
      xpEarned,
    });

    return res.json({ log: updated });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
