const { pool } = require("../pool");

async function upsertScannedWod(userId, { date, wodData, imageUrl }) {
  const { rows } = await pool.query(
    `
    INSERT INTO scanned_wods (user_id, date, wod_data, image_url)
    VALUES ($1, $2, $3::jsonb, $4)
    ON CONFLICT (user_id, date)
    DO UPDATE SET
      wod_data = EXCLUDED.wod_data,
      image_url = COALESCE(EXCLUDED.image_url, scanned_wods.image_url)
    RETURNING id, user_id, date, wod_data, image_url, completed, score, notes, created_at
    `,
    [userId, date, JSON.stringify(wodData), imageUrl ?? null]
  );
  return rows[0] ?? null;
}

async function getScannedWodByUserAndDate(userId, date) {
  const { rows } = await pool.query(
    `
    SELECT id, user_id, date, wod_data, image_url, completed, score, notes, created_at
    FROM scanned_wods
    WHERE user_id = $1 AND date = $2
    `,
    [userId, date]
  );
  return rows[0] ?? null;
}

async function completeScannedWod(userId, date, { score, notes }) {
  const { rows } = await pool.query(
    `
    UPDATE scanned_wods
    SET completed = TRUE,
        score = COALESCE($3, score),
        notes = COALESCE($4, notes)
    WHERE user_id = $1 AND date = $2
    RETURNING id, user_id, date, wod_data, image_url, completed, score, notes, created_at
    `,
    [userId, date, score ?? null, notes ?? null]
  );
  return rows[0] ?? null;
}

module.exports = {
  upsertScannedWod,
  getScannedWodByUserAndDate,
  completeScannedWod,
};
