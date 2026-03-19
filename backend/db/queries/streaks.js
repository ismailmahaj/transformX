const { pool } = require("../pool");

async function getStreak(userId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, current_streak, longest_streak, last_log_date, updated_at FROM streaks WHERE user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

async function ensureStreakRow(userId) {
  const { rows } = await pool.query(
    `
    INSERT INTO streaks (user_id)
    VALUES ($1)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id, user_id, current_streak, longest_streak, last_log_date, updated_at
    `,
    [userId]
  );
  if (rows[0]) return rows[0];
  return getStreak(userId);
}

async function updateStreak(userId, { currentStreak, longestStreak, lastLogDate }) {
  const { rows } = await pool.query(
    `
    UPDATE streaks
    SET
      current_streak = $2,
      longest_streak = $3,
      last_log_date = $4,
      updated_at = NOW()
    WHERE user_id = $1
    RETURNING id, user_id, current_streak, longest_streak, last_log_date, updated_at
    `,
    [userId, currentStreak, longestStreak, lastLogDate ?? null]
  );
  return rows[0] ?? null;
}

module.exports = { getStreak, ensureStreakRow, updateStreak };
