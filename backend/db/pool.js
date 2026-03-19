const { Pool } = require("pg");

const requiredEnv = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 10,
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT_MS
    ? Number(process.env.DB_IDLE_TIMEOUT_MS)
    : 30000,
});

module.exports = { pool };
