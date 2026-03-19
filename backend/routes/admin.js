const express = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");
const {
  listUsers,
  getUserById,
  setAdmin,
  deleteUser,
} = require("../db/queries/users");
const {
  listWorkoutsAdmin,
  getWorkoutById,
  upsertWorkout,
  updateWorkoutById,
  deleteWorkout,
} = require("../db/queries/workouts");
const {
  listMealsAdmin,
  getMealById,
  upsertMeal,
  updateMealById,
  deleteMeal,
} = require("../db/queries/meals");
const {
  listBadges,
  getBadgeById,
  createBadge,
  updateBadge,
} = require("../db/queries/badges");
const { getUserTotals, getMaxDayNumber } = require("../db/queries/userLogs");
const { getStreak } = require("../db/queries/streaks");

const router = express.Router();

// ----- Stats -----
router.get("/stats", async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7);

    const [totalUsersRes, activeRes, totalsRes, avgStreakRes, newUsersRes, newUsersByWeekRes, workoutsByDayRes] =
      await Promise.all([
        pool.query("SELECT COUNT(*)::int AS c FROM users"),
        pool.query(
          `SELECT COUNT(DISTINCT user_id)::int AS c FROM user_logs WHERE date >= $1`,
          [sevenDaysAgo.toISOString().slice(0, 10)]
        ),
        pool.query(
          `SELECT
            COALESCE(SUM(CASE WHEN workout_done THEN 1 ELSE 0 END), 0)::int AS workouts,
            COALESCE(SUM(CASE WHEN meals_done THEN 1 ELSE 0 END), 0)::int AS meals
          FROM user_logs`
        ),
        pool.query(
          `SELECT COALESCE(AVG(current_streak), 0)::numeric(10,2) AS avg_streak FROM streaks`
        ),
        pool.query(
          `SELECT COUNT(*)::int AS c FROM users WHERE created_at >= $1`,
          [weekStart.toISOString()]
        ),
        pool.query(
          `SELECT date_trunc('week', created_at)::date AS week_start, COUNT(*)::int AS count
           FROM users
           WHERE created_at >= $1
           GROUP BY date_trunc('week', created_at)
           ORDER BY week_start ASC`,
          [twelveWeeksAgo.toISOString()]
        ),
        pool.query(
          `SELECT date, SUM(CASE WHEN workout_done THEN 1 ELSE 0 END)::int AS count
           FROM user_logs
           WHERE date >= $1
           GROUP BY date
           ORDER BY date ASC`,
          [sevenDaysAgo.toISOString().slice(0, 10)]
        ),
      ]);

    const totalUsers = totalUsersRes.rows[0]?.c ?? 0;
    const activeUsers = activeRes.rows[0]?.c ?? 0;
    const totalWorkouts = totalsRes.rows[0]?.workouts ?? 0;
    const totalMeals = totalsRes.rows[0]?.meals ?? 0;
    const avgStreak = Number(avgStreakRes.rows[0]?.avg_streak ?? 0);
    const newUsersThisWeek = newUsersRes.rows[0]?.c ?? 0;
    const newUsersByWeek = newUsersByWeekRes.rows ?? [];
    const workoutsByDay = workoutsByDayRes.rows ?? [];

    return res.json({
      total_users: totalUsers,
      active_users_7d: activeUsers,
      total_workouts_completed: totalWorkouts,
      total_meals_logged: totalMeals,
      average_streak: avgStreak,
      new_users_this_week: newUsersThisWeek,
      new_users_by_week: newUsersByWeek,
      workouts_by_day: workoutsByDay,
    });
  } catch (err) {
    return next(err);
  }
});

// ----- Users -----
router.get("/users", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const users = await listUsers();
    const total = users.length;
    const withStats = await Promise.all(
      users.slice(offset, offset + limit).map(async (u) => {
        const [totals, streak, maxDay] = await Promise.all([
          getUserTotals(u.id),
          getStreak(u.id),
          getMaxDayNumber(u.id),
        ]);
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          goal: u.goal,
          is_admin: Boolean(u.is_admin),
          created_at: u.created_at,
          current_day: maxDay,
          current_streak: streak?.current_streak ?? 0,
          workouts_done: totals?.workouts_done ?? 0,
          meals_done: totals?.meals_done ?? 0,
        };
      })
    );

    return res.json({
      users: withStats,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    return next(err);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteUser(id);
    if (!deleted) return res.status(404).json({ error: "Utilisateur introuvable" });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

router.put("/users/:id/admin", async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = z.object({ is_admin: z.boolean() }).parse(req.body);
    const user = await setAdmin(id, body.is_admin);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    return res.json({ id: user.id, is_admin: user.is_admin });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Données invalides", details: err.errors });
    return next(err);
  }
});

// ----- Workouts -----
router.get("/workouts", async (req, res, next) => {
  try {
    const phase = req.query.phase != null ? parseInt(req.query.phase, 10) : undefined;
    const goalType = req.query.goal_type || undefined;
    const day_min = req.query.day_min != null ? parseInt(req.query.day_min, 10) : undefined;
    const day_max = req.query.day_max != null ? parseInt(req.query.day_max, 10) : undefined;
    const search = req.query.search || undefined;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const all = await listWorkoutsAdmin({
      phase: Number.isInteger(phase) ? phase : undefined,
      goalType,
      dayMin: Number.isInteger(day_min) ? day_min : undefined,
      dayMax: Number.isInteger(day_max) ? day_max : undefined,
      search,
    });
    const total = all.length;
    const workouts = all.slice(offset, offset + limit).map((w) => ({
      ...w,
      exercises_count: Array.isArray(w.exercises) ? w.exercises.length : 0,
    }));

    return res.json({
      workouts,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/workouts", async (req, res, next) => {
  try {
    const schema = z.object({
      day_number: z.number().int().min(1).max(180),
      phase: z.number().int().min(1).max(3),
      goal_type: z.enum(["crossfit", "muscle", "mixed"]),
      name: z.string().min(1),
      is_rest_day: z.boolean().optional(),
      exercises: z.array(z.object({
        name: z.string(),
        sets: z.number().int().min(0).optional(),
        reps: z.number().int().min(0).optional(),
        rest_seconds: z.number().int().min(0).optional(),
        note: z.string().optional(),
      })).optional(),
    });
    const body = schema.parse(req.body);
    const workout = await upsertWorkout({
      dayNumber: body.day_number,
      phase: body.phase,
      goalType: body.goal_type,
      name: body.name,
      isRestDay: body.is_rest_day ?? false,
      exercises: body.exercises ?? [],
    });
    return res.status(201).json(workout);
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Données invalides", details: err.errors });
    return next(err);
  }
});

router.put("/workouts/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      day_number: z.number().int().min(1).max(180).optional(),
      phase: z.number().int().min(1).max(3).optional(),
      goal_type: z.enum(["crossfit", "muscle", "mixed"]).optional(),
      name: z.string().min(1).optional(),
      is_rest_day: z.boolean().optional(),
      exercises: z.array(z.object({
        name: z.string(),
        sets: z.number().int().min(0).optional(),
        reps: z.number().int().min(0).optional(),
        rest_seconds: z.number().int().min(0).optional(),
        note: z.string().optional(),
      })).optional(),
    });
    const body = schema.parse(req.body);
    const workout = await updateWorkoutById(id, {
      dayNumber: body.day_number,
      phase: body.phase,
      goalType: body.goal_type,
      name: body.name,
      isRestDay: body.is_rest_day,
      exercises: body.exercises,
    });
    if (!workout) return res.status(404).json({ error: "WOD introuvable" });
    return res.json(workout);
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Données invalides", details: err.errors });
    return next(err);
  }
});

router.delete("/workouts/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteWorkout(id);
    if (!deleted) return res.status(404).json({ error: "WOD introuvable" });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

// ----- Meals -----
router.get("/meals", async (req, res, next) => {
  try {
    const day_min = req.query.day_min != null ? parseInt(req.query.day_min, 10) : undefined;
    const day_max = req.query.day_max != null ? parseInt(req.query.day_max, 10) : undefined;
    const type = req.query.type || undefined;
    const search = req.query.search || undefined;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const all = await listMealsAdmin({
      dayMin: Number.isInteger(day_min) ? day_min : undefined,
      dayMax: Number.isInteger(day_max) ? day_max : undefined,
      type,
      search,
    });
    const total = all.length;
    const meals = all.slice(offset, offset + limit);

    return res.json({
      meals,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/meals", async (req, res, next) => {
  try {
    const schema = z.object({
      day_number: z.number().int().min(1).max(180),
      type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      name: z.string().min(1),
      prep_time_minutes: z.number().int().min(0).optional(),
      difficulty: z.string().optional(),
      ingredients: z.array(z.object({
        name: z.string(),
        quantity: z.union([z.number(), z.string()]),
        unit: z.string().optional(),
      })).optional(),
      recipe: z.string().optional(),
      macros: z.object({
        calories: z.number().optional(),
        proteins_g: z.number().optional(),
        carbs_g: z.number().optional(),
        fats_g: z.number().optional(),
      }).optional(),
    });
    const body = schema.parse(req.body);
    const meal = await upsertMeal({
      dayNumber: body.day_number,
      type: body.type,
      name: body.name,
      prep_time_minutes: body.prep_time_minutes ?? 10,
      difficulty: body.difficulty ?? "Facile",
      ingredients: body.ingredients ?? [],
      recipe: body.recipe ?? null,
      macros: body.macros ?? {},
    });
    return res.status(201).json(meal);
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Données invalides", details: err.errors });
    return next(err);
  }
});

router.put("/meals/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      day_number: z.number().int().min(1).max(180).optional(),
      type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
      name: z.string().min(1).optional(),
      prep_time_minutes: z.number().int().min(0).optional(),
      difficulty: z.string().optional(),
      ingredients: z.array(z.object({
        name: z.string(),
        quantity: z.union([z.number(), z.string()]),
        unit: z.string().optional(),
      })).optional(),
      recipe: z.string().optional(),
      macros: z.object({
        calories: z.number().optional(),
        proteins_g: z.number().optional(),
        carbs_g: z.number().optional(),
        fats_g: z.number().optional(),
      }).optional(),
    });
    const body = schema.parse(req.body);
    const meal = await updateMealById(id, {
      day_number: body.day_number,
      type: body.type,
      name: body.name,
      prep_time_minutes: body.prep_time_minutes,
      difficulty: body.difficulty,
      ingredients: body.ingredients,
      recipe: body.recipe,
      macros: body.macros,
    });
    if (!meal) return res.status(404).json({ error: "Repas introuvable" });
    return res.json(meal);
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Données invalides", details: err.errors });
    return next(err);
  }
});

router.delete("/meals/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteMeal(id);
    if (!deleted) return res.status(404).json({ error: "Repas introuvable" });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

// ----- Badges -----
router.get("/badges", async (req, res, next) => {
  try {
    const badges = await listBadges();
    return res.json({ badges });
  } catch (err) {
    return next(err);
  }
});

router.post("/badges", async (req, res, next) => {
  try {
    const schema = z.object({
      emoji: z.string().max(10).optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      condition_type: z.enum(["workouts_done", "streak", "day_reached", "xp_total"]),
      threshold: z.number().int().min(0),
    });
    const body = schema.parse(req.body);
    const badge = await createBadge({
      emoji: body.emoji ?? "🏆",
      name: body.name,
      description: body.description,
      conditionType: body.condition_type,
      threshold: body.threshold,
    });
    return res.status(201).json(badge);
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Données invalides", details: err.errors });
    return next(err);
  }
});

router.put("/badges/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const schema = z.object({
      emoji: z.string().max(10).optional(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      condition_type: z.enum(["workouts_done", "streak", "day_reached", "xp_total"]).optional(),
      threshold: z.number().int().min(0).optional(),
    });
    const body = schema.parse(req.body);
    const badge = await updateBadge(id, {
      emoji: body.emoji,
      name: body.name,
      description: body.description,
      conditionType: body.condition_type,
      threshold: body.threshold,
    });
    if (!badge) return res.status(404).json({ error: "Badge introuvable" });
    return res.json(badge);
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Données invalides", details: err.errors });
    return next(err);
  }
});

module.exports = router;
