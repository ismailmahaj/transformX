const { pool } = require("../pool");

async function listMealsByDay(dayNumber) {
  const { rows } = await pool.query(
    `
    SELECT id, day_number, type, name, ingredients, recipe, prep_time_minutes, difficulty, macros
    FROM meals
    WHERE day_number = $1
    ORDER BY
      CASE type
        WHEN 'breakfast' THEN 1
        WHEN 'lunch' THEN 2
        WHEN 'dinner' THEN 3
        WHEN 'snack' THEN 4
        ELSE 5
      END ASC
    `,
    [dayNumber]
  );
  return rows;
}

async function listMealsByDayRange(startDay, endDay) {
  const { rows } = await pool.query(
    `
    SELECT id, day_number, type, name, ingredients, recipe, prep_time_minutes, difficulty, macros
    FROM meals
    WHERE day_number >= $1 AND day_number <= $2
    ORDER BY day_number ASC,
      CASE type
        WHEN 'breakfast' THEN 1
        WHEN 'lunch' THEN 2
        WHEN 'dinner' THEN 3
        WHEN 'snack' THEN 4
        ELSE 5
      END ASC
    `,
    [startDay, endDay]
  );
  return rows;
}

async function upsertMeal({ dayNumber, type, name, ingredients, recipe, prep_time_minutes, difficulty, macros }) {
  const { rows } = await pool.query(
    `
    INSERT INTO meals (day_number, type, name, ingredients, recipe, prep_time_minutes, difficulty, macros)
    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb)
    ON CONFLICT (day_number, type)
    DO UPDATE SET
      name = EXCLUDED.name,
      ingredients = EXCLUDED.ingredients,
      recipe = EXCLUDED.recipe,
      prep_time_minutes = EXCLUDED.prep_time_minutes,
      difficulty = EXCLUDED.difficulty,
      macros = EXCLUDED.macros
    RETURNING id, day_number, type, name, ingredients, recipe, prep_time_minutes, difficulty, macros
    `,
    [
      dayNumber,
      type,
      name,
      JSON.stringify(ingredients ?? []),
      recipe ?? null,
      prep_time_minutes ?? 10,
      difficulty ?? 'Facile',
      JSON.stringify(macros ?? {}),
    ]
  );
  return rows[0];
}

async function getMealById(mealId) {
  const { rows } = await pool.query(
    `
    SELECT id, day_number, type, name, ingredients, recipe, prep_time_minutes, difficulty, macros
    FROM meals
    WHERE id = $1
    `,
    [mealId]
  );
  return rows[0] ?? null;
}

async function listMealsAdmin(filters = {}) {
  const { dayMin, dayMax, type, search } = filters;
  let query = `
    SELECT id, day_number, type, name, ingredients, recipe, prep_time_minutes, difficulty, macros
    FROM meals
    WHERE 1=1
  `;
  const params = [];
  let i = 1;
  if (dayMin != null) {
    params.push(dayMin);
    query += ` AND day_number >= $${i++}`;
  }
  if (dayMax != null) {
    params.push(dayMax);
    query += ` AND day_number <= $${i++}`;
  }
  if (type) {
    params.push(type);
    query += ` AND type = $${i++}`;
  }
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    query += ` AND name ILIKE $${i++}`;
  }
  query += ` ORDER BY day_number ASC, type ASC`;
  const { rows } = await pool.query(query, params);
  return rows;
}

async function updateMealById(id, payload) {
  const {
    day_number,
    type,
    name,
    ingredients,
    recipe,
    prep_time_minutes,
    difficulty,
    macros,
  } = payload;
  const { rows } = await pool.query(
    `
    UPDATE meals
    SET
      day_number = COALESCE($2, day_number),
      type = COALESCE($3, type),
      name = COALESCE($4, name),
      ingredients = COALESCE($5::jsonb, ingredients),
      recipe = COALESCE($6, recipe),
      prep_time_minutes = COALESCE($7, prep_time_minutes),
      difficulty = COALESCE($8, difficulty),
      macros = COALESCE($9::jsonb, macros)
    WHERE id = $1
    RETURNING id, day_number, type, name, ingredients, recipe, prep_time_minutes, difficulty, macros
    `,
    [
      id,
      day_number ?? null,
      type ?? null,
      name ?? null,
      ingredients != null ? JSON.stringify(ingredients) : null,
      recipe ?? null,
      prep_time_minutes ?? null,
      difficulty ?? null,
      macros != null ? JSON.stringify(macros) : null,
    ]
  );
  return rows[0] ?? null;
}

async function deleteMeal(id) {
  const { rowCount } = await pool.query(`DELETE FROM meals WHERE id = $1`, [id]);
  return rowCount > 0;
}

module.exports = {
  listMealsByDay,
  listMealsByDayRange,
  upsertMeal,
  getMealById,
  listMealsAdmin,
  updateMealById,
  deleteMeal,
};
