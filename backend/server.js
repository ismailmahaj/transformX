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
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));

app.use("/api/", apiLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/coach", aiLimiter);

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

const port = Number(process.env.PORT || 5001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port}`);
});

