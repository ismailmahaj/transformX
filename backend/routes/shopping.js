const express = require("express");

const { listMealsByDayRange } = require("../db/queries/meals");
const { getUserById } = require("../db/queries/users");

const router = express.Router();

function daysBetweenUtc(a, b) {
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bUtc - aUtc) / (24 * 60 * 60 * 1000));
}

async function getCurrentDayNumber(userId) {
  const user = await getUserById(userId);
  if (!user) return null;
  const createdAt = new Date(user.created_at);
  const today = new Date();
  const offset = daysBetweenUtc(createdAt, today);
  return Math.min(180, Math.max(1, offset + 1));
}

const CATEGORY_KEYWORDS = {
  "🥩 Viandes & Poissons": ["poulet", "bœuf", "boeuf", "saumon", "thon", "dinde", "crevettes", "cabillaud", "steak", "blanc de poulet", "bœuf haché", "boeuf haché"],
  "🥚 Œufs & Produits Laitiers": ["œuf", "oeuf", "yaourt", "yogurt", "fromage", "lait", "feta", "parmesan"],
  "🌾 Féculents & Céréales": ["riz", "avoine", "patate douce", "quinoa", "pâtes", "pates", "farine", "nouilles", "soba", "pain", "wrap", "granola"],
  "🥦 Légumes": ["brocoli", "épinards", "epinards", "courgette", "tomate", "poivron", "asperges", "concombre", "carotte", "oignon", "laitue", "haricots verts", "champignon", "légumes", "legumes"],
  "🍌 Fruits": ["banane", "citron", "fruits rouges", "myrtilles", "pomme", "avocat", "bleuet", "fruit"],
  "🥑 Matières Grasses": ["huile d'olive", "huile", "avocat", "amandes", "noix", "miel"],
  "🧂 Condiments & Épices": ["sel", "poivre", "ail", "cannelle", "cumin", "curry", "sauce", "bouillon"],
  "💊 Compléments": ["protéine", "proteine", "whey", "créatine", "creatine", "poudre"],
};

const CATEGORY_ORDER = [
  "🥩 Viandes & Poissons",
  "🥚 Œufs & Produits Laitiers",
  "🌾 Féculents & Céréales",
  "🥦 Légumes",
  "🍌 Fruits",
  "🥑 Matières Grasses",
  "🧂 Condiments & Épices",
  "💊 Compléments",
];

function getCategoryForIngredient(ingredientName) {
  const lower = String(ingredientName || "").toLowerCase().trim();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "🧂 Condiments & Épices";
}

function parseQuantity(value) {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function aggregateIngredients(meals) {
  const byKey = new Map();
  for (const meal of meals) {
    const ingredients = meal.ingredients || [];
    if (!Array.isArray(ingredients)) continue;
    for (const ing of ingredients) {
      const name = String(ing.name || "").trim() || "Ingrédient";
      const qty = parseQuantity(ing.quantity);
      const unit = String(ing.unit || "g").trim();
      const key = `${name.toLowerCase()}|${unit}`;
      if (!byKey.has(key)) byKey.set(key, { name, total_quantity: 0, unit });
      byKey.get(key).total_quantity += qty;
    }
  }
  return Array.from(byKey.values());
}

function formatEstimated(totalQuantity, unit) {
  const u = (unit || "").toLowerCase();
  if (u === "g" && totalQuantity >= 1000) return `${(totalQuantity / 1000).toFixed(1)} kg`;
  if (u === "ml" && totalQuantity >= 1000) return `${(totalQuantity / 1000).toFixed(1)} L`;
  return `${totalQuantity} ${unit}`;
}

function buildCategories(items) {
  const byCategory = new Map();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const item of items) {
    const category = getCategoryForIngredient(item.name);
    const list = byCategory.get(category) || byCategory.get(CATEGORY_ORDER[0]);
    const total = Math.round(item.total_quantity);
    list.push({
      name: item.name,
      total_quantity: total,
      unit: item.unit,
      estimated_kg: formatEstimated(total, item.unit),
      checked: false,
    });
  }
  return CATEGORY_ORDER.map((name) => ({
    name,
    items: byCategory.get(name).filter((i) => i.total_quantity > 0),
  })).filter((c) => c.items.length > 0);
}

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const weeks = Math.min(4, Math.max(1, parseInt(req.query.weeks, 10) || 4));
    const startDay = await getCurrentDayNumber(userId);
    if (!startDay) return res.status(404).json({ error: "Utilisateur introuvable" });

    const endDay = Math.min(180, startDay + weeks * 7 - 1);
    const allMeals = await listMealsByDayRange(startDay, endDay);

    const allIngredients = aggregateIngredients(allMeals);
    const categories = buildCategories(allIngredients);

    const by_week = [];
    for (let w = 0; w < weeks; w++) {
      const wStart = startDay + w * 7;
      const wEnd = Math.min(180, wStart + 6);
      const weekMeals = allMeals.filter((m) => m.day_number >= wStart && m.day_number <= wEnd);
      const weekItems = aggregateIngredients(weekMeals);
      by_week.push({
        week: w + 1,
        start_day: wStart,
        end_day: wEnd,
        categories: buildCategories(weekItems),
      });
    }

    return res.json({
      period: `Semaine 1-${weeks}`,
      days_covered: [startDay, endDay],
      categories,
      by_week,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
