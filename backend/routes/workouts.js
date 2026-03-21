const express = require("express");
const { z } = require("zod");

const { getWorkoutByDay } = require("../db/queries/workouts");
const { getUserById } = require("../db/queries/users");
const { upsertUserLog, getUserLogByDate } = require("../db/queries/userLogs");
const { getVideoId } = require("../db/exerciseVideos");

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

function enrichWorkoutWithVideos(workout) {
  if (!workout || !Array.isArray(workout.exercises)) return workout;
  return {
    ...workout,
    exercises: workout.exercises.map((ex) => {
      const videoId = getVideoId(ex?.name);
      return {
        ...ex,
        video_id: videoId ?? null,
        youtube_url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
      };
    }),
  };
}

function getDayNameFr(dayIndex) {
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  return days[dayIndex];
}

function localIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function classifyDayType(workout, calendarDate) {
  if (!workout || !workout.is_rest_day) return "training";
  const wd = calendarDate.getDay();
  if (wd === 2 || wd === 4) return "active_rest";
  return "rest";
}

function computeWeekSummary(weekPayload) {
  let seances = 0;
  let totalExercices = 0;
  let joursRepos = 0;

  for (const d of weekPayload) {
    const w = d.workout;
    if (!w) {
      joursRepos += 1;
      continue;
    }
    if (w.is_rest_day) {
      joursRepos += 1;
      continue;
    }
    seances += 1;
    const n = Array.isArray(w.exercises) ? w.exercises.length : 0;
    totalExercices += n;
  }

  let intensite_moyenne = "moyenne";
  if (seances === 0) {
    intensite_moyenne = "basse";
  } else {
    const avg = totalExercices / seances;
    if (avg >= 6) intensite_moyenne = "haute";
    else if (avg >= 4) intensite_moyenne = "moyenne";
    else intensite_moyenne = "basse";
  }

  return {
    seances_cette_semaine: seances,
    volume_total_exercices: totalExercices,
    jours_repos: joursRepos,
    intensite_moyenne,
  };
}

router.get("/week", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const goalType = goalToGoalType(user.goal);
    const createdAt = new Date(user.created_at);
    const today = new Date();
    const offset = daysBetweenUtc(createdAt, today);
    const currentDay = Math.min(180, Math.max(1, offset + 1));

    today.setHours(0, 0, 0, 0);
    const todayIso = localIsoDate(today);

    const week = [];

    for (let i = 0; i < 7; i++) {
      const dayNumber = Math.min(180, currentDay + i);
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateIso = localIsoDate(date);

      // eslint-disable-next-line no-await-in-loop
      const raw = await getWorkoutByDay(dayNumber, goalType);
      const workout = raw ? enrichWorkoutWithVideos(raw) : null;

      const dayType = workout ? classifyDayType(workout, date) : "rest";

      week.push({
        day_number: dayNumber,
        date: dateIso,
        day_name: getDayNameFr(date.getDay()),
        is_today: dateIso === todayIso,
        is_past: dateIso < todayIso,
        day_type: dayType,
        workout,
      });
    }

    const summary = computeWeekSummary(week);

    return res.json({
      week,
      current_day: currentDay,
      goal_type: goalType,
      summary,
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const today = await getTodayDayNumberAndGoalType(userId);
    if (!today) return res.status(404).json({ error: "User not found" });

    const workout = enrichWorkoutWithVideos(await getWorkoutByDay(today.dayNumber, today.goalType));
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

    const workout = enrichWorkoutWithVideos(await getWorkoutByDay(day, goalType));
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
