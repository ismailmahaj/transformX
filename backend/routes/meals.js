const express = require("express");

const { listMealsByDay, getMealById } = require("../db/queries/meals");
const { getUserById } = require("../db/queries/users");
const { getWorkoutByDay } = require("../db/queries/workouts");

const router = express.Router();

function daysBetweenUtc(a, b) {
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bUtc - aUtc) / (24 * 60 * 60 * 1000));
}

function getTodayDayNumberFromCreatedAt(createdAt) {
  const createdAtDate = new Date(createdAt);
  const today = new Date();
  const offset = daysBetweenUtc(createdAtDate, today);
  return Math.min(180, Math.max(1, offset + 1));
}

function mapDietaryProfileToMealProgram(dietaryProfile) {
  const dp = Array.isArray(dietaryProfile) ? dietaryProfile : [];

  if (dp.includes("prise_de_masse")) return "prise_de_masse";
  if (dp.includes("diabetique")) return "diabetique";
  return "standard";
}

function goalToGoalType(goal) {
  if (goal === "Perdre du gras") return "crossfit";
  if (goal === "Prendre du muscle") return "muscle";
  if (goal === "Les deux") return "mixed";
  return "crossfit";
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

function aggregateMealPrepLines(allMeals) {
  const totals = new Map();
  for (const meal of allMeals) {
    let ing = meal.ingredients;
    if (typeof ing === "string") {
      try {
        ing = JSON.parse(ing);
      } catch {
        ing = [];
      }
    }
    if (!Array.isArray(ing)) continue;
    for (const item of ing) {
      if (!item || !item.name) continue;
      const unit = String(item.unit ?? "").trim() || "unité";
      const name = String(item.name).trim();
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const key = `${name.toLowerCase()}|${unit}`;
      totals.set(key, (totals.get(key) ?? 0) + qty);
    }
  }

  const skipUnits = new Set(["pincée", "pincee"]);
  const entries = [...totals.entries()]
    .filter(([, sum]) => sum > 0)
    .map(([key, sum]) => {
      const [name, unit] = key.split("|");
      return { name, unit, sum };
    })
    .filter((e) => !skipUnits.has(e.unit.toLowerCase()))
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 12);

  return entries.map(({ name, unit, sum }) => {
    if (unit === "g" && sum >= 1000) {
      return `${name}: ${(sum / 1000).toFixed(1).replace(".", ",")} kg à préparer`;
    }
    if (unit === "ml" && sum >= 1000) {
      return `${name}: ${Math.round(sum / 1000)} L à prévoir`;
    }
    return `${name}: ${Math.round(sum)} ${unit} à préparer`;
  });
}

router.get("/week", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const currentDay = getTodayDayNumberFromCreatedAt(user.created_at);
    const mealProgram = mapDietaryProfileToMealProgram(user.dietary_profile);
    const goalType = goalToGoalType(user.goal);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = localIsoDate(today);

    const week = [];
    const allMealsForPrep = [];

    for (let i = 0; i < 7; i++) {
      const dayNumber = Math.min(180, currentDay + i);
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateIso = localIsoDate(date);

      // eslint-disable-next-line no-await-in-loop
      const meals = await listMealsByDay(dayNumber, mealProgram);
      // eslint-disable-next-line no-await-in-loop
      const workout = await getWorkoutByDay(dayNumber, goalType);
      const isRest = !workout || workout.is_rest_day;

      meals.forEach((m) => allMealsForPrep.push(m));

      week.push({
        day_number: dayNumber,
        date: dateIso,
        day_name: getDayNameFr(date.getDay()),
        is_today: dateIso === todayIso,
        is_past: dateIso < todayIso,
        is_rest_day: isRest,
        meals,
      });
    }

    const meal_prep_lines = aggregateMealPrepLines(allMealsForPrep);

    return res.json({
      current_day: currentDay,
      meal_program: mealProgram,
      week,
      meal_prep_lines,
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const dayQuery = req.query.day;

    let dayNumber = null;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    const mealProgram = mapDietaryProfileToMealProgram(user.dietary_profile);

    if (dayQuery !== undefined) {
      const parsed = Number(dayQuery);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 180) {
        return res.status(400).json({ error: "Invalid day" });
      }
      dayNumber = parsed;
    } else {
      dayNumber = getTodayDayNumberFromCreatedAt(user.created_at);
    }

    if (!dayNumber) return res.status(404).json({ error: "User not found" });
    const meals = await listMealsByDay(dayNumber, mealProgram);
    return res.json({ day_number: dayNumber, meal_program: mealProgram, meals });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const mealId = req.params.id;
    const meal = await getMealById(mealId);
    if (!meal) return res.status(404).json({ error: "Meal not found" });
    return res.json({ meal });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
