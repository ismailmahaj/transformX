const { pool } = require("../db/pool");
const fs = require("fs");
const path = require("path");

async function startup() {
  try {
    console.log("Creating tables...");
    const schema = fs.readFileSync(path.join(__dirname, "../db/schema.sql"), "utf8");
    await pool.query(schema);
    console.log("✅ Tables created");

    console.log("Seeding data...");
    await require("../db/seed").run();
    console.log("✅ Seed complete");
  } catch (err) {
    console.error("Startup error:", err.message);
  }

  require("../server");
}

startup();
