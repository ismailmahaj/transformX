const express = require("express");
const { z } = require("zod");
const multer = require("multer");
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const sharp = require("sharp");

const { getUserById } = require("../db/queries/users");
const { getUserTotals } = require("../db/queries/userLogs");
const { getStreak } = require("../db/queries/streaks");
const { getLatestProgress } = require("../db/queries/userProgress");
const {
  upsertScannedWod,
  getScannedWodByUserAndDate,
  completeScannedWod,
} = require("../db/queries/scannedWods");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

function getLastN(arr, n) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(-n);
}

function daysBetweenUtc(a, b) {
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((bUtc - aUtc) / (24 * 60 * 60 * 1000));
}

function computeDayAndPhaseFromCreatedAt(createdAt) {
  const start = new Date(createdAt);
  const today = new Date();
  const offset = daysBetweenUtc(start, today);
  const currentDay = Math.min(180, Math.max(1, offset + 1));
  const phase = currentDay <= 28 ? 1 : currentDay <= 84 ? 2 : 3;
  return { currentDay, phase };
}

const bodyAnalysisSchema = z.object({
  body_fat_estimate: z.string(),
  muscle_mass: z.string(),
  fat_areas: z.array(z.string()),
  muscles_to_develop: z.array(z.string()),
  fitness_level: z.string(),
  morphology: z.string(),
  summary: z.string(),
  advice: z.array(z.string()),
  motivation: z.string(),
});

router.post("/chat", async (req, res, next) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Requête invalide", details: parsed.error.errors });
    }
    const { message, history } = parsed.data;

    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const totals = await getUserTotals(userId);
    const streak = await getStreak(userId);
    const latestProgress = await getLatestProgress(userId);

    const { currentDay, phase } = computeDayAndPhaseFromCreatedAt(user.created_at);

    const currentWeight = latestProgress?.weight_kg ?? user?.weight_start_kg ?? null;
    const currentWeightNumber = currentWeight != null ? Number(currentWeight) : null;

    // System prompt préparé avec les vraies données DB (avant tout appel Anthropic éventuel).
    // (Actuellement on utilise un mock, mais le prompt est bien construit et prêt à être injecté.)
    const systemPrompt = `Tu es Coach Alex 🤖, un coach IA personnel pour un programme de transformation physique.

Données utilisateur:
- Nom: ${user?.name ?? "—"}
- Taille (cm): ${user?.height_cm ?? "—"}
- Poids de départ (kg): ${user?.weight_start_kg ?? "—"}
- Poids actuel (kg): ${currentWeightNumber ?? "—"}
- Objectif: ${user?.goal ?? "—"}

- Jour actuel: ${currentDay} / 180
- Phase: ${phase} / 3

- Séances complétées: ${totals?.workouts_done ?? 0}
- Série actuelle: ${streak?.current_streak ?? 0} jours
- XP total: ${totals?.total_xp ?? 0}

Contexte conversation (historique partiel): ${JSON.stringify(getLastN(history, 10))}.

Réponds en français, de manière actionnable, adaptée aux chiffres ci-dessus.
IMPORTANT: Limite tes réponses à 200 mots maximum. 
Ne coupe jamais ta réponse en plein milieu. 
Termine toujours ta phrase et ta réponse complètement.`;

    const last10 = getLastN(history, 10);
    const anthropicRes = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: systemPrompt,
      messages: [
        ...last10.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ],
    });
    const reply = anthropicRes.content[0]?.text ?? "Désolé, je n'ai pas pu répondre.";
    return res.json({ reply });
  } catch (err) {
    return next(err);
  }
});

router.post("/analyze-body", upload.single("image"), async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    if (!req.file) {
      return res.status(400).json({ error: "Aucune image fournie" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Format non supporté. Utilise JPG, PNG ou WebP." });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "Image trop grande. Maximum 10MB." });
    }

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable" });

    const latestProgress = await getLatestProgress(userId);
    const currentWeight = latestProgress?.weight_kg ?? user?.weight_start_kg ?? null;
    const currentWeightNumber = currentWeight != null ? Number(currentWeight) : null;

    const { currentDay } = computeDayAndPhaseFromCreatedAt(user.created_at);

    // Resize and compress image to max 1500px and quality 80
    const compressedBuffer = await sharp(req.file.buffer)
      .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64Image = compressedBuffer.toString("base64");
    const mediaType = "image/jpeg"; // always jpeg after compression

    const systemPrompt = `Tu es un expert fitness et un analyste de composition corporelle.
Analyse cette photo du corps et fournisse :

Pourcentage de masse grasse estimé (fourchette)
Appréciation de la masse musculaire (faible/moyenne/élevée)
Principales zones où perdre du gras
Principaux groupes musculaires à développer
Niveau de forme estimé (débutant/intermédiaire/avancé)
Conseils personnalisés en fonction du type de morphologie

Réponds uniquement en français.
Sois honnête mais encourageant.
Réponds UNIQUEMENT au format JSON (sans texte autour).

    Contexte utilisateur :
Taille : ${user?.height_cm ?? "—"} cm
Poids : ${currentWeightNumber ?? "—"} kg
Objectif : ${user?.goal ?? "—"}
Jour actuel : ${currentDay}/180

Format de sortie JSON (obligatoire) :
{
  "body_fat_estimate": "18-22%",
  "muscle_mass": "moyen",
  "fat_areas": ["ventre", "flancs"],
  "muscles_to_develop": ["épaules", "pectoraux", "abdos"],
  "fitness_level": "intermédiaire",
  "morphology": "ectomorphe/mésomorphe/endomorphe",
  "summary": "résumé en 2-3 phrases",
  "advice": ["conseil 1", "conseil 2", "conseil 3"],
  "motivation": "phrase motivante personnalisée"
}`;

    const anthropicRes = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Image,
              },
            },
            { type: "text", text: systemPrompt },
          ],
        },
      ],
    });

    const text = typeof anthropicRes?.content?.[0]?.text === "string" ? anthropicRes.content[0].text : "";
    const clean = text.replace(/```json|```/g, "").trim();

    if (!clean) {
      return res.status(502).json({ error: "Réponse vide de l'IA. Réessaie avec une autre photo." });
    }

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return res.status(502).json({ error: "L'IA n'a pas renvoyé du JSON valide.", details: clean.slice(0, 500) });
    }

    const validated = bodyAnalysisSchema.safeParse(parsed);
    if (!validated.success) {
      return res.status(502).json({ error: "Format d'analyse inattendu.", details: validated.error.errors });
    }

    return res.json({ analysis: validated.data });
  } catch (err) {
    return next(err);
  }
});

const saveWodSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wod_data: z.any(),
  image_url: z.union([z.string(), z.null()]).optional(),
});

const completeWodSchema = z.object({
  score: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

router.post("/scan-wod", upload.single("image"), async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    if (!req.file) {
      return res.status(400).json({ error: "Aucune image fournie" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Format non supporté. Utilise JPG, PNG ou WebP." });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "Image trop grande. Maximum 10MB." });
    }

    const compressed = await sharp(req.file.buffer)
      .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64Image = compressed.toString("base64");

    const partialScanFallback = () =>
      res.json({
        wod: {
          nom: "WOD scanné",
          format: "For Time",
          duree_estimee_minutes: 30,
          echauffement: "",
          lisibilite: "partielle",
          exercices: [],
          transitions: [],
          notes_generales: "Lecture partielle — vérifie et complète manuellement",
          niveau: "intermédiaire",
          muscles_cibles: ["full body"],
        },
        warning: "Lecture partielle — tu peux modifier les exercices manuellement",
      });

    const prompt = `Tu es un expert CrossFit. 
Analyse cette photo d'un tableau blanc de salle CrossFit.
Même si l'image est floue ou en angle, essaie de lire le maximum.

IMPORTANT: Essaie toujours de retourner quelque chose, même partiel.
Si tu ne peux pas lire un mot, mets "?" à la place.
Si tu vois des chiffres, des noms d'exercices CrossFit connus, utilise-les.

Exercices CrossFit courants à reconnaître:
Burpees, Wall Balls, Double Unders, Pull-ups, Box Jumps,
Hang Power Clean (HPC), Push Jerk, Back Squat, Muscle Up (MU),
Kettlebell Swings, Thrusters, Deadlift, Row, Run

Réponds UNIQUEMENT en JSON valide:
{
  "nom": "WOD du jour",
  "format": "For Time",
  "duree_estimee_minutes": 30,
  "echauffement": "1500M cardio / 90 Cal",
  "lisibilite": "bonne / moyenne / partielle",
  "exercices": [
    {
      "nom": "Burpees",
      "series": "30-20-10",
      "repetitions": null,
      "poids": null,
      "note": null
    }
  ],
  "transitions": [],
  "notes_generales": "",
  "niveau": "intermédiaire",
  "muscles_cibles": ["full body"]
}

Réponds UNIQUEMENT en JSON, jamais de texte avant ou après.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Image,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const text = response?.content?.[0]?.text;
    if (typeof text !== "string" || !text.trim()) {
      return partialScanFallback();
    }

    const clean = text.replace(/```json|```/g, "").trim();
    let wod;
    try {
      wod = JSON.parse(clean);
    } catch {
      return partialScanFallback();
    }

    const normalized = {
      nom: typeof wod.nom === "string" ? wod.nom : "WOD du jour",
      format: typeof wod.format === "string" ? wod.format : "autre",
      duree_estimee_minutes: typeof wod.duree_estimee_minutes === "number" ? wod.duree_estimee_minutes : null,
      echauffement: wod.echauffement ?? "",
      lisibilite: typeof wod.lisibilite === "string" ? wod.lisibilite : "moyenne",
      exercices: Array.isArray(wod.exercices) ? wod.exercices : [],
      transitions: Array.isArray(wod.transitions) ? wod.transitions : [],
      notes_generales: wod.notes_generales ?? "",
      niveau: wod.niveau ?? "",
      muscles_cibles: Array.isArray(wod.muscles_cibles) ? wod.muscles_cibles : [],
    };

    return res.json({ wod: normalized });
  } catch (err) {
    return next(err);
  }
});

router.post("/save-wod", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const parsed = saveWodSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Données invalides", details: parsed.error.errors });
    }

    const { date, wod_data: rawWod, image_url } = parsed.data;
    if (typeof rawWod !== "object" || rawWod === null || Array.isArray(rawWod)) {
      return res.status(400).json({ error: "wod_data doit être un objet" });
    }

    const row = await upsertScannedWod(userId, {
      date,
      wodData: rawWod,
      imageUrl: image_url && String(image_url).trim() ? String(image_url).trim() : null,
    });

    return res.json({ scanned_wod: row });
  } catch (err) {
    return next(err);
  }
});

router.get("/wod/:date", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const date = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Date invalide (AAAA-MM-JJ)" });
    }

    const row = await getScannedWodByUserAndDate(userId, date);
    return res.json({ scanned_wod: row });
  } catch (err) {
    return next(err);
  }
});

router.put("/wod/:date/complete", async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Non authentifié" });

    const date = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Date invalide (AAAA-MM-JJ)" });
    }

    const parsed = completeWodSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Données invalides", details: parsed.error.errors });
    }

    const row = await completeScannedWod(userId, date, {
      score: parsed.data.score ?? null,
      notes: parsed.data.notes ?? null,
    });

    if (!row) {
      return res.status(404).json({ error: "Aucun WOD scanné pour cette date" });
    }

    return res.json({ scanned_wod: row });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
