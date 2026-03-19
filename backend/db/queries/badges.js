const { pool } = require("../pool");

async function listBadges() {
  const { rows } = await pool.query(
    `SELECT id, emoji, name, description, condition_type, threshold, created_at FROM badges ORDER BY threshold ASC, name ASC`
  );
  return rows;
}

async function getBadgeById(id) {
  const { rows } = await pool.query(
    `SELECT id, emoji, name, description, condition_type, threshold, created_at FROM badges WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

async function createBadge({ emoji, name, description, conditionType, threshold }) {
  const { rows } = await pool.query(
    `
    INSERT INTO badges (emoji, name, description, condition_type, threshold)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, emoji, name, description, condition_type, threshold, created_at
    `,
    [emoji ?? "🏆", name, description ?? null, conditionType, Number(threshold) ?? 0]
  );
  return rows[0];
}

async function updateBadge(id, { emoji, name, description, conditionType, threshold }) {
  const { rows } = await pool.query(
    `
    UPDATE badges
    SET
      emoji = COALESCE($2, emoji),
      name = COALESCE($3, name),
      description = COALESCE($4, description),
      condition_type = COALESCE($5, condition_type),
      threshold = COALESCE($6, threshold)
    WHERE id = $1
    RETURNING id, emoji, name, description, condition_type, threshold, created_at
    `,
    [id, emoji ?? null, name ?? null, description ?? null, conditionType ?? null, threshold != null ? Number(threshold) : null]
  );
  return rows[0] ?? null;
}

module.exports = { listBadges, getBadgeById, createBadge, updateBadge };
