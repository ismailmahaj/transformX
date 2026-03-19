const express = require("express");
const { z } = require("zod");
const multer = require("multer");
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const { getUserById } = require("../db/queries/users");
const { getUserTotals } = require("../db/queries/userLogs");
const { getStreak } = require("../db/queries/streaks");
const { getLatestProgress } = require("../db/queries/userProgress");

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

    const sharp = require("sharp");

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

module.exports = router;
