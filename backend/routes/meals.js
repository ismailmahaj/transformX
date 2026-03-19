const express = require("express");

const { listMealsByDay, getMealById } = require("../db/queries/meals");
const { getUserById } = require("../db/queries/users");

const router = express.Router();

function daysBetweenUtc(a, b) {
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bUtc - aUtc) / (24 * 60 * 60 * 1000));
}

async function getTodayDayNumber(userId) {
  const user = await getUserById(userId);
  if (!user) return null;
  const createdAt = new Date(user.created_at);
  const today = new Date();
  const offset = daysBetweenUtc(createdAt, today);
  return Math.min(180, Math.max(1, offset + 1));
}

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const dayQuery = req.query.day;

    let dayNumber = null;
    if (dayQuery !== undefined) {
      const parsed = Number(dayQuery);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 180) {
        return res.status(400).json({ error: "Invalid day" });
      }
      dayNumber = parsed;
    } else {
      dayNumber = await getTodayDayNumber(userId);
    }

    if (!dayNumber) return res.status(404).json({ error: "User not found" });
    const meals = await listMealsByDay(dayNumber);
    return res.json({ day_number: dayNumber, meals });
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
