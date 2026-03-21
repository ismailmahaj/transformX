const express = require("express");
const { z } = require("zod");

const { pool } = require("../db/pool");
const { getUserById, updateUserProfile } = require("../db/queries/users");
const { getUserTotals } = require("../db/queries/userLogs");
const { ensureStreakRow, getStreak } = require("../db/queries/streaks");
const { getLatestProgress } = require("../db/queries/userProgress");

const router = express.Router();

function daysBetweenUtc(a, b) {
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bUtc - aUtc) / (24 * 60 * 60 * 1000));
}

function clampDay(n) {
  return Math.min(180, Math.max(1, n));
}

function computeDayAndPhase(createdAt) {
  const start = new Date(createdAt);
  const today = new Date();
  const offset = daysBetweenUtc(start, today);
  const currentDay = clampDay(offset + 1);
  const phase = currentDay <= 28 ? 1 : currentDay <= 84 ? 2 : 3;
  return { currentDay, phase };
}

function getExperienceLevel(xp) {
  if (xp >= 3000) return { label: "Elite ⚡" };
  if (xp >= 1500) return { label: "Avancé 🔥" };
  if (xp >= 500) return { label: "Intermédiaire 💪" };
  return { label: "Débutant 🌱" };
}

const goalOptions = ["Perdre du gras", "Prendre du muscle", "Les deux"];
const experienceOptions = ["Débutant", "Intermédiaire", "Avancé"];

router.get("/profile", async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const { currentDay, phase } = computeDayAndPhase(user.created_at);
    const totals = await getUserTotals(userId);
    const streakRow = await ensureStreakRow(userId);
    const streak = streakRow ?? (await getStreak(userId));

    const latestProgress = await getLatestProgress(userId);
    const currentWeight = latestProgress?.weight_kg ?? null;

    const xpTotal = Number(totals.total_xp ?? 0);
    const workoutsCompleted = Number(totals.workouts_done ?? 0);
    const mealsDaysLogged = Number(totals.meals_done ?? 0);
    const currentStreak = Number(streak?.current_streak ?? 0);

    const level = getExperienceLevel(xpTotal);

    return res.json({
      user,
      stats: {
        current_day: currentDay,
        phase,
        workouts_completed: workoutsCompleted,
        streak_current: currentStreak,
        xp_total: xpTotal,
        meals_days_logged: mealsDaysLogged,
        current_weight_kg: currentWeight,
        level,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.put("/profile", async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(120).optional().nullable(),
      height_cm: z.union([z.number().int().min(120).max(250), z.null()]).optional(),
      weight_start_kg: z.union([z.number().min(30).max(250), z.null()]).optional(),
      goal: z.enum(["Perdre du gras", "Prendre du muscle", "Les deux"]).optional().nullable(),
      experience_level: z.enum(["Débutant", "Intermédiaire", "Avancé"]).optional().nullable(),
      dietary_profile: z.array(z.string()).optional(),
      allergies: z.array(z.string()).optional(),
      wake_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      sleep_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      work_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      work_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      work_type: z.enum(["bureau", "domicile", "variable", "nuit", "sans_emploi"]).optional(),
      commute_minutes: z.number().int().min(0).max(240).optional(),
      has_family: z.boolean().optional(),
      preferred_workout_time: z.enum(["matin", "midi", "soir"]).optional(),
    });

    const body = schema.parse(req.body);
    const userId = req.user?.userId;

    const updated = await updateUserProfile(userId, {
      name: body.name,
      heightCm: body.height_cm,
      weightStartKg: body.weight_start_kg,
      goal: body.goal,
      dietaryProfile: body.dietary_profile,
      allergies: body.allergies,
      wakeTime: body.wake_time,
      sleepTime: body.sleep_time,
      workStart: body.work_start,
      workEnd: body.work_end,
      workType: body.work_type,
      commuteMinutes: body.commute_minutes,
      hasFamily: body.has_family,
      preferredWorkoutTime: body.preferred_workout_time,
    });

    if (!updated) return res.status(404).json({ error: "Utilisateur introuvable" });

    return res.json({ user: updated });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "Invalid payload", details: err.errors });
    }
    return next(err);
  }
});

// Danger zone: reset progression (workouts + nutrition + photos + streaks)
router.post("/reset-progress", async (req, res, next) => {
  const userId = req.user?.userId;
  try {
    await pool.query("BEGIN");
    await pool.query(`DELETE FROM user_logs WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM user_progress WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM nutrition_logs WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM daily_targets WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM progress_photos WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM streaks WHERE user_id = $1`, [userId]);
    await pool.query("COMMIT");

    await ensureStreakRow(userId);
    return res.json({ ok: true });
  } catch (err) {
    try {
      await pool.query("ROLLBACK");
    } catch {
      // ignore
    }
    return next(err);
  }
});

router.get("/logout", (req, res) => res.json({ ok: true }));

module.exports = router;

