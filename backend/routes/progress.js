const express = require("express");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { z } = require("zod");

const { pool } = require("../db/pool");
const { upsertUserProgress, listUserProgress } = require("../db/queries/userProgress");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

function requireCloudinaryConfig() {
  const required = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing ${key}`);
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

router.get("/", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const rows = await listUserProgress(userId, {});
    return res.json({ progress: rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const schema = z.object({
      weight_kg: z.number().min(30).max(250).optional(),
      measurements: z
        .object({
          chest_cm: z.number().min(40).max(200).optional(),
          waist_cm: z.number().min(40).max(200).optional(),
          hips_cm: z.number().min(40).max(200).optional(),
          left_arm_cm: z.number().min(10).max(100).optional(),
          thigh_cm: z.number().min(20).max(140).optional(),
          arms_cm: z.number().min(10).max(100).optional(), // legacy
          legs_cm: z.number().min(20).max(140).optional(), // legacy
        })
        .partial()
        .optional(),
    });

    const body = schema.parse(req.body);
    const userId = req.user?.userId;
    const date = toIsoDate(new Date());

    const saved = await upsertUserProgress(userId, {
      date,
      weightKg: body.weight_kg,
      measurements: body.measurements ?? {},
    });

    return res.status(201).json({ progress: saved });
  } catch (err) {
    if (err?.name === "ZodError") return res.status(400).json({ error: "Invalid payload", details: err.errors });
    return next(err);
  }
});

router.get("/photos", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { rows } = await pool.query(
      `
      SELECT id, user_id, date, cloudinary_public_id, cloudinary_url, created_at
      FROM progress_photos
      WHERE user_id = $1
      ORDER BY date ASC, created_at ASC
      `,
      [userId]
    );
    return res.json({ photos: rows });
  } catch (err) {
    return next(err);
  }
});

router.post("/photos", upload.single("photo"), async (req, res, next) => {
  try {
    requireCloudinaryConfig();

    const userId = req.user?.userId;
    if (!req.file) return res.status(400).json({ error: "Missing photo file (field: photo)" });

    const folder = `fitness-app/${userId}`;
    const date = toIsoDate(new Date());

    // Champs optionnels: note (string) + analysis (JSON sérialisé en string)
    const note = typeof req.body.note === "string" && req.body.note.trim() ? req.body.note.trim() : null;
    let analysis = {};
    if (typeof req.body.analysis === "string" && req.body.analysis.trim()) {
      try {
        analysis = JSON.parse(req.body.analysis);
      } catch (e) {
        return res.status(400).json({ error: "analysis JSON invalide" });
      }
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          tags: ["progress", "fitness-app"],
          context: { date },
        },
        (error, result) => {
          if (error) return reject(error);
          return resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    const publicId = uploadResult.public_id;
    const url = uploadResult.secure_url || uploadResult.url;

    const { rows } = await pool.query(
      `
      INSERT INTO progress_photos (user_id, date, cloudinary_public_id, cloudinary_url, note, analysis)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, date, cloudinary_public_id, cloudinary_url, created_at
      `,
      [userId, date, publicId, url, note, analysis]
    );

    return res.status(201).json({ photo: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
