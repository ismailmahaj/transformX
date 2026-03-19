const express = require("express");
const { z } = require("zod");
const foods = require("../db/foods");
const {
  getNutritionLogsByDate,
  getTotalsByDate,
  insertNutritionLog,
  deleteNutritionLog,
  getDailyTargets,
  upsertDailyTargets,
  addWater,
  toIsoDate,
} = require("../db/queries/nutrition");

const router = express.Router();

const MEAL_TYPES = ["petit-dejeuner", "dejeuner", "diner", "collation"];

function getTargets(isTrainingDay) {
  return {
    calories: isTrainingDay ? 2200 : 1900,
    proteins_g: 160,
    carbs_g: isTrainingDay ? 250 : 180,
    fats_g: 60,
    water_ml: 3000,
  };
}

router.get("/today", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const date = toIsoDate(new Date());
    const [logs, totals, targetsRow] = await Promise.all([
      getNutritionLogsByDate(userId, date),
      getTotalsByDate(userId, date),
      getDailyTargets(userId, date),
    ]);
    const isTrainingDay = targetsRow?.is_training_day ?? false;
    const targets = getTargets(isTrainingDay);
    const waterLogged = targetsRow?.water_ml_logged ?? 0;
    return res.json({
      date,
      logs,
      totals: {
        calories: Number(totals.calories),
        proteins_g: Number(totals.proteins_g),
        carbs_g: Number(totals.carbs_g),
        fats_g: Number(totals.fats_g),
      },
      targets,
      is_training_day: isTrainingDay,
      water_ml_logged: waterLogged,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/log", async (req, res, next) => {
  try {
    const schema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      meal_type: z.enum(MEAL_TYPES),
      food_name: z.string().min(1).max(200),
      quantity_g: z.number().int().min(1).max(5000),
      calories: z.number().int().min(0),
      proteins_g: z.number().min(0),
      carbs_g: z.number().min(0),
      fats_g: z.number().min(0),
    });
    const body = schema.parse(req.body);
    const userId = req.user?.userId;
    const date = body.date ?? toIsoDate(new Date());
    const entry = await insertNutritionLog(userId, {
      date,
      mealType: body.meal_type,
      foodName: body.food_name,
      quantityG: body.quantity_g,
      calories: body.calories,
      proteinsG: body.proteins_g,
      carbsG: body.carbs_g,
      fatsG: body.fats_g,
    });
    return res.status(201).json({ log: entry });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Invalid payload", details: err.errors });
    return next(err);
  }
});

router.delete("/log/:id", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const deleted = await deleteNutritionLog(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Log not found" });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.get("/targets", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const date = req.query.date ?? toIsoDate(new Date());
    const row = await getDailyTargets(userId, date);
    const isTrainingDay = row?.is_training_day ?? false;
    const targets = getTargets(isTrainingDay);
    return res.json({
      date,
      is_training_day: isTrainingDay,
      water_ml_logged: row?.water_ml_logged ?? 0,
      targets,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/targets", async (req, res, next) => {
  try {
    const schema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      is_training_day: z.boolean(),
    });
    const body = schema.parse(req.body);
    const userId = req.user?.userId;
    const date = body.date ?? toIsoDate(new Date());
    const existing = await getDailyTargets(userId, date);
    const row = await upsertDailyTargets(userId, date, {
      isTrainingDay: body.is_training_day,
      waterMlLogged: existing?.water_ml_logged ?? 0,
    });
    return res.json({ targets: row, targets_values: getTargets(row.is_training_day) });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Invalid payload", details: err.errors });
    return next(err);
  }
});

router.post("/water", async (req, res, next) => {
  try {
    const schema = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      amount_ml: z.number().int().min(1).max(1000).optional(),
    });
    const body = schema.parse(req.body ?? {});
    const userId = req.user?.userId;
    const date = body.date ?? toIsoDate(new Date());
    const amount = body.amount_ml ?? 250;
    const row = await addWater(userId, date, amount);
    return res.json({ water_ml_logged: row.water_ml_logged, date: row.date });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Invalid payload", details: err.errors });
    return next(err);
  }
});

router.get("/foods", (req, res) => {
  return res.json({ foods });
});

module.exports = router;
