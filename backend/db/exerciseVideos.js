const exerciseVideos = {
  "Burpees": "dZgVxmf6jkA",
  "Sauts sur Box": "52r_Ul5k03g",
  "Balancements Kettlebell": "sSESeQAir2M",
  "Squats à Vide": "aclHkVaku9U",
  "Pompes": "IODxDxX7oi4",
  "Tractions": "eGo4IYlbE5g",
  "Burpees Box Jump": "k5nJyJnZK5k",
  "Double Sauts à Corde": "1BZM2L_9WXY",
  "Wall Balls": "fpUD0mcFp8E",
  "Rameur": "H0r_ZPXJLvg",
  "Mountain Climbers": "nmwgirgXLYM",
  "Fentes Alternées": "QOVaHwm-Q6U",
  "Abdominaux Crunch": "Xyd_fa5zoEU",
  "Relevés de Jambes": "JB2oyawG9KI",
  "Gainage Planche": "ASdvSC4HJSY",
  "Sprint sur Place": "oCRNLEMNKDI",
  "Grimpeurs": "nmwgirgXLYM",
  "Corde à Sauter": "1BZM2L_9WXY",
  "Soulevé de Terre": "op9kVnSso6Q",
  "Développé Couché": "rT7DgCr-3pg",
  "Squat Barre": "ultWZbUMPL8",
  "Développé Militaire": "2yjwXTZbDtc",
  "Rowing Barre": "kBWAon7ItDw",
  "Curl Biceps": "ykJmrZ5v0Oo",
  "Extension Triceps": "nRiJVZDpdL0",
  "Élévations Latérales": "3VcKaXpzqRo",
  "Dips": "2z8JmcrW-As",
  "Tractions Lestées": "eGo4IYlbE5g",
  "Face Pull": "V8dZ3x7BCy4",
  "Rowing Haltères": "pYcpY20QaE8",
  "Développé Haltères": "qEwKCR5JCog",
  "Leg Press": "IZxyjW7MPJQ",
  "Hip Thrust": "xDmFkJxPzeM",
  "Presse Épaules": "qEwKCR5JCog",
  default: "dQw4w9WgXcQ",
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getVideoId(exerciseName) {
  if (!exerciseName) return null;
  if (exerciseVideos[exerciseName]) return exerciseVideos[exerciseName];

  const normalizedName = normalizeText(exerciseName);
  const key = Object.keys(exerciseVideos).find((k) => {
    if (k === "default") return false;
    const normalizedKey = normalizeText(k);
    return normalizedName.includes(normalizedKey) || normalizedKey.includes(normalizedName);
  });

  return key ? exerciseVideos[key] : null;
}

module.exports = { exerciseVideos, getVideoId };
