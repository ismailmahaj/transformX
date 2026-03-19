const { pool } = require("../pool");

async function getWorkoutByDay(dayNumber, goalType) {
  const { rows } = await pool.query(
    `
    SELECT id, day_number, phase, goal_type, name, is_rest_day, exercises
    FROM workouts
    WHERE day_number = $1 AND goal_type = $2
    `,
    [dayNumber, goalType]
  );
  return rows[0] ?? null;
}

async function listWorkoutsByPhase(phase, goalType) {
  const { rows } = await pool.query(
    `
    SELECT id, day_number, phase, goal_type, name, is_rest_day, exercises
    FROM workouts
    WHERE phase = $1
    AND goal_type = $2
    ORDER BY day_number ASC
    `,
    [phase, goalType]
  );
  return rows;
}

async function listWorkouts(goalType) {
  const { rows } = await pool.query(
    `
    SELECT id, day_number, phase, goal_type, name, is_rest_day, exercises
    FROM workouts
    WHERE goal_type = $1
    ORDER BY day_number ASC
    `,
    [goalType]
  );
  return rows;
}

async function upsertWorkout({ dayNumber, phase, name, isRestDay, exercises, goalType }) {
  const { rows } = await pool.query(
    `
    INSERT INTO workouts (day_number, phase, goal_type, name, is_rest_day, exercises)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    ON CONFLICT (day_number, goal_type)
    DO UPDATE SET
      phase = EXCLUDED.phase,
      goal_type = EXCLUDED.goal_type,
      name = EXCLUDED.name,
      is_rest_day = EXCLUDED.is_rest_day,
      exercises = EXCLUDED.exercises,
      created_at = NOW()
    RETURNING id, day_number, phase, goal_type, name, is_rest_day, exercises
    `,
    [dayNumber, phase, goalType, name, Boolean(isRestDay), JSON.stringify(exercises ?? [])]
  );
  return rows[0];
}

async function getWorkoutById(id) {
  const { rows } = await pool.query(
    `SELECT id, day_number, phase, goal_type, name, is_rest_day, exercises FROM workouts WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

async function listWorkoutsAdmin(filters = {}) {
  const { phase, goalType, dayMin, dayMax, search } = filters;
  let query = `
    SELECT id, day_number, phase, goal_type, name, is_rest_day, exercises
    FROM workouts
    WHERE 1=1
  `;
  const params = [];
  let i = 1;
  if (phase != null) {
    params.push(phase);
    query += ` AND phase = $${i++}`;
  }
  if (goalType) {
    params.push(goalType);
    query += ` AND goal_type = $${i++}`;
  }
  if (dayMin != null) {
    params.push(dayMin);
    query += ` AND day_number >= $${i++}`;
  }
  if (dayMax != null) {
    params.push(dayMax);
    query += ` AND day_number <= $${i++}`;
  }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    query += ` AND name ILIKE $${i++}`;
  }
  query += ` ORDER BY day_number ASC, goal_type ASC`;
  const { rows } = await pool.query(query, params);
  return rows;
}

async function updateWorkoutById(id, { dayNumber, phase, goalType, name, isRestDay, exercises }) {
  const { rows } = await pool.query(
    `
    UPDATE workouts
    SET
      day_number = COALESCE($2, day_number),
      phase = COALESCE($3, phase),
      goal_type = COALESCE($4, goal_type),
      name = COALESCE($5, name),
      is_rest_day = COALESCE($6, is_rest_day),
      exercises = COALESCE($7::jsonb, exercises)
    WHERE id = $1
    RETURNING id, day_number, phase, goal_type, name, is_rest_day, exercises
    `,
    [
      id,
      dayNumber ?? null,
      phase ?? null,
      goalType ?? null,
      name ?? null,
      isRestDay != null ? Boolean(isRestDay) : null,
      exercises != null ? JSON.stringify(exercises) : null,
    ]
  );
  return rows[0] ?? null;
}

async function deleteWorkout(id) {
  const { rowCount } = await pool.query(`DELETE FROM workouts WHERE id = $1`, [id]);
  return rowCount > 0;
}

module.exports = {
  getWorkoutByDay,
  listWorkoutsByPhase,
  listWorkouts,
  upsertWorkout,
  getWorkoutById,
  listWorkoutsAdmin,
  updateWorkoutById,
  deleteWorkout,
};
