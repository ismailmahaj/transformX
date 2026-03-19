const express = require("express");

const { pool } = require("../db/pool");
const { ensureStreakRow, updateStreak } = require("../db/queries/streaks");

const router = express.Router();

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

function toDateOnly(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetweenUtc(a, b) {
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bUtc - aUtc) / (24 * 60 * 60 * 1000));
}

async function recalcStreakForUser(userId) {
  // Define streak as consecutive days with workout_done = true.
  const { rows } = await pool.query(
    `
    SELECT date, workout_done
    FROM user_logs
    WHERE user_id = $1
    ORDER BY date DESC
    `,
    [userId]
  );

  const today = toDateOnly(new Date());
  let current = 0;
  let longest = 0;
  let lastLogDate = null;

  // Build a set of completed dates.
  const completed = new Set(
    rows.filter((r) => r.workout_done).map((r) => String(r.date))
  );

  // Current streak: count backwards from today.
  for (let i = 0; i < 3650; i += 1) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = toIsoDate(d);
    if (completed.has(key)) current += 1;
    else break;
  }

  // Longest streak: scan sorted completed dates.
  const completedDates = Array.from(completed)
    .map((s) => new Date(`${s}T00:00:00Z`))
    .sort((a, b) => a.getTime() - b.getTime());

  let run = 0;
  for (let i = 0; i < completedDates.length; i += 1) {
    if (i === 0) {
      run = 1;
    } else {
      const diff = daysBetweenUtc(completedDates[i - 1], completedDates[i]);
      run = diff === 1 ? run + 1 : 1;
    }
    if (run > longest) longest = run;
  }

  if (rows[0]) lastLogDate = rows[0].date;

  return { currentStreak: current, longestStreak: longest, lastLogDate };
}

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const streak = await ensureStreakRow(userId);
    return res.json({ streak });
  } catch (err) {
    return next(err);
  }
});

router.post("/update", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    await ensureStreakRow(userId);

    const { currentStreak, longestStreak, lastLogDate } = await recalcStreakForUser(userId);
    const updated = await updateStreak(userId, {
      currentStreak,
      longestStreak,
      lastLogDate,
    });

    return res.json({ streak: updated });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
