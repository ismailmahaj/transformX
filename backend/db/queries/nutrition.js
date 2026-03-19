const { pool } = require("../pool");

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function getNutritionLogsByDate(userId, date) {
  const { rows } = await pool.query(
    `SELECT id, user_id, date, meal_type, food_name, quantity_g, calories, proteins_g, carbs_g, fats_g, water_ml, created_at
     FROM nutrition_logs
     WHERE user_id = $1 AND date = $2
     ORDER BY meal_type, created_at ASC`,
    [userId, date]
  );
  return rows;
}

async function getTotalsByDate(userId, date) {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(calories), 0)::int AS calories,
       COALESCE(SUM(proteins_g), 0)::numeric AS proteins_g,
       COALESCE(SUM(carbs_g), 0)::numeric AS carbs_g,
       COALESCE(SUM(fats_g), 0)::numeric AS fats_g
     FROM nutrition_logs
     WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );
  return rows[0] ?? { calories: 0, proteins_g: 0, carbs_g: 0, fats_g: 0 };
}

async function insertNutritionLog(userId, { date, mealType, foodName, quantityG, calories, proteinsG, carbsG, fatsG }) {
  const { rows } = await pool.query(
    `INSERT INTO nutrition_logs (user_id, date, meal_type, food_name, quantity_g, calories, proteins_g, carbs_g, fats_g, water_ml)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)
     RETURNING id, user_id, date, meal_type, food_name, quantity_g, calories, proteins_g, carbs_g, fats_g, water_ml, created_at`,
    [userId, date, mealType, foodName, quantityG, calories, proteinsG, carbsG, fatsG]
  );
  return rows[0];
}

async function deleteNutritionLog(userId, logId) {
  const { rows } = await pool.query(
    `DELETE FROM nutrition_logs WHERE id = $1 AND user_id = $2 RETURNING id`,
    [logId, userId]
  );
  return rows[0] ?? null;
}

async function getDailyTargets(userId, date) {
  const { rows } = await pool.query(
    `SELECT id, user_id, date, is_training_day, water_ml_logged, created_at
     FROM daily_targets
     WHERE user_id = $1 AND date = $2`,
    [userId, date]
  );
  return rows[0] ?? null;
}

async function upsertDailyTargets(userId, date, { isTrainingDay, waterMlLogged }) {
  const { rows } = await pool.query(
    `INSERT INTO daily_targets (user_id, date, is_training_day, water_ml_logged)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, date)
     DO UPDATE SET
       is_training_day = COALESCE(EXCLUDED.is_training_day, daily_targets.is_training_day),
       water_ml_logged = COALESCE(EXCLUDED.water_ml_logged, daily_targets.water_ml_logged)
     RETURNING id, user_id, date, is_training_day, water_ml_logged, created_at`,
    [userId, date, isTrainingDay ?? false, waterMlLogged ?? 0]
  );
  return rows[0];
}

async function addWater(userId, date, amountMl = 250) {
  const existing = await getDailyTargets(userId, date);
  const current = existing?.water_ml_logged ?? 0;
  const newTotal = current + amountMl;
  const { rows } = await pool.query(
    `INSERT INTO daily_targets (user_id, date, is_training_day, water_ml_logged)
     VALUES ($1, $2, FALSE, $3)
     ON CONFLICT (user_id, date)
     DO UPDATE SET water_ml_logged = daily_targets.water_ml_logged + EXCLUDED.water_ml_logged
     RETURNING id, user_id, date, is_training_day, water_ml_logged, created_at`,
    [userId, date, amountMl]
  );
  return rows[0];
}

module.exports = {
  getNutritionLogsByDate,
  getTotalsByDate,
  insertNutritionLog,
  deleteNutritionLog,
  getDailyTargets,
  upsertDailyTargets,
  addWater,
  toIsoDate,
};
