const { pool } = require("../pool");

async function upsertUserLog(userId, { date, dayNumber, workoutDone, mealsDone, xpEarned }) {
  const { rows } = await pool.query(
    `
    INSERT INTO user_logs (user_id, date, day_number, workout_done, meals_done, xp_earned)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      day_number = EXCLUDED.day_number,
      workout_done = EXCLUDED.workout_done,
      meals_done = EXCLUDED.meals_done,
      xp_earned = EXCLUDED.xp_earned
    RETURNING id, user_id, date, day_number, workout_done, meals_done, xp_earned, created_at
    `,
    [
      userId,
      date,
      dayNumber,
      Boolean(workoutDone),
      Boolean(mealsDone),
      Number.isFinite(xpEarned) ? xpEarned : 0,
    ]
  );
  return rows[0];
}

async function getUserLogByDate(userId, date) {
  const { rows } = await pool.query(
    `
    SELECT id, user_id, date, day_number, workout_done, meals_done, xp_earned, created_at
    FROM user_logs
    WHERE user_id = $1 AND date = $2
    `,
    [userId, date]
  );
  return rows[0] ?? null;
}

async function getUserTotals(userId) {
  const { rows } = await pool.query(
    `
    SELECT
      COALESCE(SUM(xp_earned), 0)::int AS total_xp,
      COALESCE(SUM(CASE WHEN workout_done THEN 1 ELSE 0 END), 0)::int AS workouts_done,
      COALESCE(SUM(CASE WHEN meals_done THEN 1 ELSE 0 END), 0)::int AS meals_done
    FROM user_logs
    WHERE user_id = $1
    `,
    [userId]
  );
  return rows[0] ?? { total_xp: 0, workouts_done: 0, meals_done: 0 };
}

async function getMaxDayNumber(userId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(day_number), 0)::int AS max_day FROM user_logs WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.max_day ?? 0;
}

module.exports = { upsertUserLog, getUserLogByDate, getUserTotals, getMaxDayNumber };
