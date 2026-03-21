require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { verifyToken } = require("./middleware/verifyToken");
const { verifyAdmin } = require("./middleware/verifyAdmin");
const {
  authRoutes,
  workoutRoutes,
  mealRoutes,
  progressRoutes,
  logRoutes,
  streakRoutes,
  nutritionRoutes,
  usersRoutes,
  shoppingRoutes,
  coachRoutes,
  plannerRoutes,
} = require("./routes");
const adminRoutes = require("./routes/admin");

const app = express();

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Trop de requêtes, réessaie dans 15 minutes." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Trop de tentatives, réessaie dans 15 minutes." },
});
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: "Limite IA atteinte, réessaie dans 1 heure." },
});

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.FRONTEND_URL,
  "https://transformx-production.up.railway.app",
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS blocked:", origin);
        callback(null, true); // Allow all for now during testing
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

app.use("/api/", apiLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/coach", aiLimiter);
app.use("/api/planner", aiLimiter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);

// Protected routes
app.use("/api/workouts", verifyToken, workoutRoutes);
app.use("/api/meals", verifyToken, mealRoutes);
app.use("/api/progress", verifyToken, progressRoutes);
app.use("/api/logs", verifyToken, logRoutes);
app.use("/api/streaks", verifyToken, streakRoutes);
app.use("/api/nutrition", verifyToken, nutritionRoutes);
app.use("/api/users", verifyToken, usersRoutes);
app.use("/api/shopping", verifyToken, shoppingRoutes);
app.use("/api/coach", verifyToken, coachRoutes);
app.use("/api/planner", verifyToken, plannerRoutes);
app.use("/api/admin", verifyToken, verifyAdmin, adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const message = status >= 500 ? "Internal server error" : err?.message || "Request error";

  // Avoid leaking internals in production
  const payload =
    process.env.NODE_ENV === "production"
      ? { error: message }
      : { error: message, details: err?.message, stack: err?.stack };

  res.status(status).json(payload);
});

async function initDatabase() {
  const { pool } = require("./db/pool");
  const fs = require("fs");
  const path = require("path");

  try {
    // Create tables (idempotent thanks to IF NOT EXISTS / ALTER IF EXISTS)
    console.log("Creating tables...");
    const schema = fs.readFileSync(path.join(__dirname, "db/schema.sql"), "utf8");
    await pool.query(schema);
    console.log("✅ Tables ready");

    // Seed if database looks empty OR if new meal programmes are missing
    const [workoutsRes, mealsRes] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS c FROM workouts"),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE meal_program = 'standard')::int AS standard,
           COUNT(*) FILTER (WHERE meal_program = 'prise_de_masse')::int AS prise_de_masse,
           COUNT(*) FILTER (WHERE meal_program = 'diabetique')::int AS diabetique
         FROM meals`
      ),
    ]);

    const workoutsCount = workoutsRes.rows[0]?.c ?? 0;
    const mealProgramsMissing =
      (mealsRes.rows[0]?.standard ?? 0) === 0 ||
      (mealsRes.rows[0]?.prise_de_masse ?? 0) === 0 ||
      (mealsRes.rows[0]?.diabetique ?? 0) === 0;

    if (workoutsCount === 0 || mealProgramsMissing) {
      console.log("Seeding database (initialisation ou programmes manquants)...");
      const { run } = require("./db/seed");
      await run();
      console.log("✅ Database seeded");
    } else {
      console.log(`✅ DB prête: ${workoutsCount} workouts, programmes meals OK`);
    }
  } catch (err) {
    console.error("DB init error FULL:", err);
    console.error("DB_HOST:", process.env.DB_HOST);
    console.error("DB_NAME:", process.env.DB_NAME);
    console.error("DB_USER:", process.env.DB_USER);
    console.error("DB_SSL:", process.env.DB_SSL);
  }
}

const port = Number(process.env.PORT || 5001);
initDatabase().then(() => {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${port}`);
  });
});

