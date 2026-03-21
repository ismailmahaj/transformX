const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

const { getUserById } = require("../db/queries/users");
const { getWorkoutByDay } = require("../db/queries/workouts");
const { listMealsByDay } = require("../db/queries/meals");
const { getMaxDayNumber } = require("../db/queries/userLogs");

const router = express.Router();

const plannerDailyLimits = new Map();

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function goalToGoalType(goal) {
  if (goal === "Prendre du muscle") return "muscle";
  if (goal === "Les deux") return "mixed";
  return "crossfit";
}

function mapDietaryProfileToMealProgram(dietaryProfile) {
  const dp = Array.isArray(dietaryProfile) ? dietaryProfile : [];
  if (dp.includes("prise_de_masse")) return "prise_de_masse";
  if (dp.includes("diabetique")) return "diabetique";
  return "standard";
}

function currentDayFromCreatedAt(createdAt) {
  const start = new Date(createdAt);
  const today = new Date();
  const aUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const bUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const offset = Math.floor((bUtc - aUtc) / (24 * 60 * 60 * 1000));
  return Math.min(180, Math.max(1, offset + 1));
}

function enforcePlannerDailyLimit(userId) {
  const key = `${userId}:${isoDate()}`;
  const current = plannerDailyLimits.get(key) ?? 0;
  if (current >= 10) return false;
  plannerDailyLimits.set(key, current + 1);
  return true;
}

function plannerTypeLabel(type) {
  if (type === "workout") return "Entraînement";
  if (type === "active_rest") return "Repos Actif";
  if (type === "shopping") return "Courses";
  if (type === "meal_prep") return "Meal Prep";
  return "Repos";
}

async function generateDailyPlan(user, workout, meals, stats) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Tu es un coach de vie et organisateur personnel expert.

Génère un planning journalier DÉTAILLÉ et RÉALISTE pour cette personne.

PROFIL:
- Nom: ${user.name ?? "Utilisateur"}
- Réveil: ${user.wake_time ?? "07:00"}
- Coucher: ${user.sleep_time ?? "23:00"}
- Travail: ${user.work_start ?? "09:00"} - ${user.work_end ?? "17:00"} (${user.work_type ?? "bureau"})
- Trajet: ${user.commute_minutes ?? 30} minutes
- Famille: ${user.has_family ? "Oui" : "Non"}
- Préfère s'entraîner: ${user.preferred_workout_time ?? "soir"}
- Objectif fitness: ${user.goal ?? "Transformation"}
- Jour programme: ${stats.current_day}/180
- Séance aujourd'hui: ${workout ? workout.name : "Jour de repos"}
- Repas du jour: petit-déjeuner, déjeuner, dîner, collation

CONTRAINTES:
- Séance CrossFit: ${workout ? `${Array.isArray(workout.exercises) ? workout.exercises.length : 0} exercices, ~45-60 min` : "Repos actif 20 min"}
- Préparation repas: 15-30 min par repas
- Sommeil minimum: 7h30

GÉNÈRE un planning heure par heure au format JSON:
{
  "date": "aujourd'hui",
  "score_qualite_vie": 85,
  "message_motivation": "phrase motivante personnalisée",
  "blocs": [
    {
      "heure": "06:30",
      "duree_minutes": 15,
      "titre": "Réveil & Hydratation",
      "description": "Boire 500ml d'eau, 5 min d'étirements",
      "categorie": "sante",
      "priorite": "haute",
      "emoji": "🌅"
    }
  ]
}

CATEGORIES: sante, sport, nutrition, travail, famille, repos, preparation
PRIORITES: haute, moyenne, basse

Réponds UNIQUEMENT en JSON valide, rien d'autre.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response?.content?.[0]?.text ?? "";
  const clean = String(text).replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

router.get("/today", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    if (!enforcePlannerDailyLimit(userId)) {
      return res.status(429).json({ error: "Limite planning atteinte (10/jour). Réessaie demain." });
    }

    const current_day = currentDayFromCreatedAt(user.created_at);
    const goalType = goalToGoalType(user.goal);
    const mealProgram = mapDietaryProfileToMealProgram(user.dietary_profile);
    const [workout, meals, maxDay] = await Promise.all([
      getWorkoutByDay(current_day, goalType),
      listMealsByDay(current_day, mealProgram),
      getMaxDayNumber(userId),
    ]);

    const plan = await generateDailyPlan(user, workout, meals, {
      current_day,
      max_day: maxDay,
    });

    return res.json({ date: isoDate(), meal_program: mealProgram, plan });
  } catch (err) {
    return next(err);
  }
});

router.get("/week", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    if (!enforcePlannerDailyLimit(userId)) {
      return res.status(429).json({ error: "Limite planning atteinte (10/jour). Réessaie demain." });
    }

    const currentDay = currentDayFromCreatedAt(user.created_at);
    const goalType = goalToGoalType(user.goal);
    const mealProgram = mapDietaryProfileToMealProgram(user.dietary_profile);
    const week = [];
    for (let i = 0; i < 7; i++) {
      const dayNumber = Math.min(180, currentDay + i);
      // eslint-disable-next-line no-await-in-loop
      const workout = await getWorkoutByDay(dayNumber, goalType);
      // eslint-disable-next-line no-await-in-loop
      const meals = await listMealsByDay(dayNumber, mealProgram);
      // eslint-disable-next-line no-await-in-loop
      const dayPlan = await generateDailyPlan(user, workout, meals, { current_day: dayNumber });
      week.push({ day_number: dayNumber, plan: dayPlan });
    }

    return res.json({ start_day: currentDay, week });
  } catch (err) {
    return next(err);
  }
});

router.get("/month", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    if (!enforcePlannerDailyLimit(userId)) {
      return res.status(429).json({ error: "Limite planning atteinte (10/jour). Réessaie demain." });
    }

    const year = Number.parseInt(req.query.year, 10) || new Date().getFullYear();
    const month = Number.parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    if (month < 1 || month > 12) return res.status(400).json({ error: "Mois invalide" });

    const goalType = goalToGoalType(user.goal);
    const firstDate = new Date(Date.UTC(year, month - 1, 1));
    const lastDate = new Date(Date.UTC(year, month, 0));
    const daysInMonth = lastDate.getUTCDate();
    const created = new Date(user.created_at);
    const days = [];

    const stats = {
      workout: 0,
      rest: 0,
      active_rest: 0,
      shopping: 0,
      meal_prep: 0,
    };

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(year, month - 1, day));
      const dateIso = date.toISOString().slice(0, 10);
      const diff = Math.floor((date.getTime() - Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate())) / (24 * 60 * 60 * 1000));
      const dayNumber = Math.min(180, Math.max(1, diff + 1));

      // eslint-disable-next-line no-await-in-loop
      const workout = await getWorkoutByDay(dayNumber, goalType);
      const weekday = date.getUTCDay();

      let type = "rest";
      let emoji = "😴";
      let focus = "Repos et récupération";
      let focusDescription = "Prends du temps pour récupérer, dormir et faire une mobilité légère.";
      let coachConseil = "Un bon repos aujourd'hui améliore tes performances demain.";
      let intensite = "basse";

      if (workout && !workout.is_rest_day) {
        type = "workout";
        emoji = "💪";
        focus = workout.name || "Séance du jour";
        focusDescription = `Séance programmée avec ${Array.isArray(workout.exercises) ? workout.exercises.length : 0} exercices.`;
        coachConseil = "Hydrate-toi bien et garde une bonne technique sur chaque mouvement.";
        intensite = "haute";
      } else if (weekday === 0) {
        type = "meal_prep";
        emoji = "🍳";
        focus = "Préparation des repas";
        focusDescription = "Prépare tes repas de la semaine pour gagner du temps et rester discipliné.";
        coachConseil = "Priorise les protéines et légumes, puis répartis les glucides selon ton planning.";
        intensite = "moyenne";
      } else if (weekday === 6) {
        type = "shopping";
        emoji = "🛒";
        focus = "Courses intelligentes";
        focusDescription = "Fais les courses en fonction de ton plan nutritionnel de la semaine.";
        coachConseil = "Achète uniquement ce qui est sur la liste pour éviter les écarts.";
        intensite = "basse";
      } else if (weekday === 2 || weekday === 4) {
        type = "active_rest";
        emoji = "🚶";
        focus = "Repos actif";
        focusDescription = "Marche 20 à 30 minutes et fais un peu de mobilité.";
        coachConseil = "Le repos actif réduit les courbatures et améliore la récupération.";
        intensite = "moyenne";
      }

      stats[type] += 1;

      days.push({
        day,
        date: dateIso,
        day_number: dayNumber,
        type,
        type_label: plannerTypeLabel(type),
        emoji,
        focus_short: focus,
        focus_description: focusDescription,
        coach_conseil: coachConseil,
        intensite,
        is_today: dateIso === isoDate(),
        is_past: date < new Date(new Date().toDateString()),
        actions: {
          workout: type === "workout",
          shopping: type === "shopping",
        },
      });
    }

    return res.json({
      year,
      month,
      first_weekday: firstDate.getUTCDay(),
      days,
      stats: {
        seances_prevues: stats.workout,
        jours_repos: stats.rest + stats.active_rest,
        meal_prep: stats.meal_prep,
        courses: stats.shopping,
      },
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/preferences", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });
    return res.json({ ok: true, preferences: {
      wake_time: user.wake_time,
      sleep_time: user.sleep_time,
      work_start: user.work_start,
      work_end: user.work_end,
      work_type: user.work_type,
      commute_minutes: user.commute_minutes,
      has_family: user.has_family,
      preferred_workout_time: user.preferred_workout_time,
    } });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

