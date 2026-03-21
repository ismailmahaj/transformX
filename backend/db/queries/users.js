const { pool } = require("../pool");

async function createUser({ email, passwordHash, name, heightCm, weightStartKg, goal }) {
  const { rows } = await pool.query(
    `
    INSERT INTO users (email, password_hash, name, height_cm, weight_start_kg, goal)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, email, name, height_cm, weight_start_kg, goal,
      dietary_profile, allergies, wake_time, sleep_time, work_start, work_end, work_type, commute_minutes, has_family, preferred_workout_time,
      is_admin, created_at
    `,
    [email, passwordHash, name ?? null, heightCm ?? null, weightStartKg ?? null, goal ?? null]
  );
  return rows[0];
}

async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, name, height_cm, weight_start_kg, goal, dietary_profile, allergies,
      wake_time, sleep_time, work_start, work_end, work_type, commute_minutes, has_family, preferred_workout_time,
      is_admin, created_at
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] ?? null;
}

async function getUserById(userId) {
  const { rows } = await pool.query(
    `SELECT
      id, email, name, height_cm, weight_start_kg, goal,
      dietary_profile, allergies,
      wake_time, sleep_time, work_start, work_end, work_type, commute_minutes, has_family, preferred_workout_time,
      is_admin, created_at
     FROM users WHERE id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

async function updateUserProfile(
  userId,
  {
    name,
    heightCm,
    weightStartKg,
    goal,
    dietaryProfile,
    allergies,
    wakeTime,
    sleepTime,
    workStart,
    workEnd,
    workType,
    commuteMinutes,
    hasFamily,
    preferredWorkoutTime,
  }
) {
  const { rows } = await pool.query(
    `
    UPDATE users
    SET
      name = COALESCE($2, name),
      height_cm = COALESCE($3, height_cm),
      weight_start_kg = COALESCE($4, weight_start_kg),
      goal = COALESCE($5, goal),
      dietary_profile = COALESCE($6::text[], dietary_profile),
      allergies = COALESCE($7::text[], allergies),
      wake_time = COALESCE($8, wake_time),
      sleep_time = COALESCE($9, sleep_time),
      work_start = COALESCE($10, work_start),
      work_end = COALESCE($11, work_end),
      work_type = COALESCE($12, work_type),
      commute_minutes = COALESCE($13, commute_minutes),
      has_family = COALESCE($14, has_family),
      preferred_workout_time = COALESCE($15, preferred_workout_time)
    WHERE id = $1
    RETURNING id, email, name, height_cm, weight_start_kg, goal, dietary_profile, allergies,
      wake_time, sleep_time, work_start, work_end, work_type, commute_minutes, has_family, preferred_workout_time,
      is_admin, created_at
    `,
    [
      userId,
      name ?? null,
      heightCm ?? null,
      weightStartKg ?? null,
      goal ?? null,
      dietaryProfile ?? null,
      allergies ?? null,
      wakeTime ?? null,
      sleepTime ?? null,
      workStart ?? null,
      workEnd ?? null,
      workType ?? null,
      commuteMinutes ?? null,
      hasFamily ?? null,
      preferredWorkoutTime ?? null,
    ]
  );
  return rows[0] ?? null;
}

async function listUsers() {
  const { rows } = await pool.query(
    `SELECT id, email, name, goal, is_admin, created_at FROM users ORDER BY created_at DESC`
  );
  return rows;
}

async function setAdmin(userId, isAdmin) {
  const { rows } = await pool.query(
    `UPDATE users SET is_admin = $2 WHERE id = $1 RETURNING id, email, name, is_admin`,
    [userId, Boolean(isAdmin)]
  );
  return rows[0] ?? null;
}

async function deleteUser(userId) {
  const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  return rowCount > 0;
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserProfile,
  listUsers,
  setAdmin,
  deleteUser,
};
