const { pool } = require("../pool");

async function upsertUserProgress(userId, { date, weightKg, measurements }) {
  const { rows } = await pool.query(
    `
    INSERT INTO user_progress (user_id, date, weight_kg, measurements)
    VALUES ($1, $2, $3, $4::jsonb)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      weight_kg = EXCLUDED.weight_kg,
      measurements = EXCLUDED.measurements
    RETURNING id, user_id, date, weight_kg, measurements, created_at
    `,
    [userId, date, weightKg ?? null, JSON.stringify(measurements ?? {})]
  );
  return rows[0];
}

async function listUserProgress(userId, { fromDate, toDate }) {
  const params = [userId];
  let where = "WHERE user_id = $1";
  if (fromDate) {
    params.push(fromDate);
    where += ` AND date >= $${params.length}`;
  }
  if (toDate) {
    params.push(toDate);
    where += ` AND date <= $${params.length}`;
  }

  const { rows } = await pool.query(
    `
    SELECT id, user_id, date, weight_kg, measurements, created_at
    FROM user_progress
    ${where}
    ORDER BY date ASC
    `,
    params
  );
  return rows;
}

async function getLatestProgress(userId) {
  const { rows } = await pool.query(
    `
    SELECT id, user_id, date, weight_kg, measurements, created_at
    FROM user_progress
    WHERE user_id = $1
    ORDER BY date DESC, created_at DESC
    LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

module.exports = { upsertUserProgress, listUserProgress, getLatestProgress };
