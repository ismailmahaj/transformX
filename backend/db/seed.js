const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { pool } = require("./pool");

// --- Phase 1: 3x/week — fat loss, full body. Workout days: (day-1)%7 in [0,2,4] (jours 1,3,5)
const PHASE1_WORKOUT_DAYS = [0, 2, 4];

// --- Phase 2: 4x/week — force + fat loss. Workout days: (day-1)%7 in [0,1,3,5] (jours 1,2,4,6)
const PHASE2_WORKOUT_DAYS = [0, 1, 3, 5];

// --- Phase 3: 5x/week — aesthetic. Workout days: (day-1)%7 in [0,1,2,3,5] (jours 1,2,3,4,6)
const PHASE3_WORKOUT_DAYS = [0, 1, 2, 3, 5];

// Helper: index of weekDay in workout days array (for sequence)
function workoutSequenceIndex(day, workoutDays) {
  const weekIndex = (day - 1) % 7;
  const pos = workoutDays.indexOf(weekIndex);
  if (pos === -1) return -1;
  return Math.floor((day - 1) / 7) * workoutDays.length + pos;
}

// --- Musculation (goal_type = 'muscle') ---
const MUSCLE_ARM_EXERCISES = [
  { name: "Curl Biceps", sets: 3, reps: 12, rest_seconds: 90, note: "Coude fixe, amplitude propre" },
  { name: "Extension Triceps", sets: 3, reps: 12, rest_seconds: 90, note: "Descente lente, verrouillage en haut" },
  { name: "Élévations Latérales", sets: 3, reps: 15, rest_seconds: 75, note: "Deltoïdes ciblées, pas de balancement" },
];

const MUSCLE_CORE_EXERCISES = [
  { name: "Gainage Planche", sets: 3, reps: 45, rest_seconds: 75, note: "Dos plat, fessiers gainés" },
  { name: "Relevés de Jambes", sets: 3, reps: 15, rest_seconds: 75, note: "Bas du dos plaqué au sol" },
];

const MUSCLE_PULL_EXERCISES = [
  { name: "Tractions lestées", sets: 4, reps: 6, rest_seconds: 120, note: "Strict, pas de swing" },
  { name: "Rowing Barre", sets: 4, reps: 8, rest_seconds: 120, note: "Tirer avec le dos, pause au sommet" },
];

const MUSCLE_PRESS_EXERCISE = { name: "Développé Militaire", sets: 4, reps: 8, rest_seconds: 120, note: "Pousser vertical, gainage actif" };

const MUSCLE_PHASE1_TEMPLATES = [
  {
    name: "Force Full Body A — 5x5",
    exercises: [
      { name: "Échauffement — Rameur", sets: 1, reps: 300, rest_seconds: 0, note: "5 minutes modérées" },
      { name: "Soulevé de Terre", sets: 5, reps: 5, rest_seconds: 150, note: "Technique d’abord, charge contrôlée" },
      { name: "Développé Couché", sets: 5, reps: 5, rest_seconds: 150, note: "Trajectoire stable, pas de rebond" },
      ...MUSCLE_PULL_EXERCISES,
      MUSCLE_PRESS_EXERCISE,
      ...MUSCLE_ARM_EXERCISES,
      ...MUSCLE_CORE_EXERCISES,
      { name: "Squat Barre", sets: 3, reps: 5, rest_seconds: 150, note: "Rester explosif, 3×5 propre" },
    ],
  },
  {
    name: "Force Full Body B — 5x5",
    exercises: [
      { name: "Échauffement — Mobilité Hanches", sets: 1, reps: 10, rest_seconds: 0, note: "Circulation + préparation épaules/dos" },
      { name: "Squat Barre", sets: 5, reps: 5, rest_seconds: 180, note: "Genoux alignés, profondeur constante" },
      { name: "Soulevé de Terre Roumain", sets: 3, reps: 8, rest_seconds: 150, note: "Hanches vers l’arrière, dos gainé" },
      MUSCLE_PRESS_EXERCISE,
      ...MUSCLE_PULL_EXERCISES,
      ...MUSCLE_ARM_EXERCISES,
      ...MUSCLE_CORE_EXERCISES,
      { name: "Fentes Marchées", sets: 3, reps: 12, rest_seconds: 120, note: "Appuis stables, pas de genou qui s’effondre" },
    ],
  },
  {
    name: "Force Full Body C — 5x5",
    exercises: [
      { name: "Échauffement — Corde à Sauter", sets: 1, reps: 200, rest_seconds: 0, note: "Monter le cardio sans fatiguer" },
      { name: "Développé Couché", sets: 5, reps: 5, rest_seconds: 180, note: "Full ROM contrôlé" },
      { name: "Squat Barre", sets: 5, reps: 5, rest_seconds: 180, note: "Drive propre, gainage serré" },
      ...MUSCLE_PULL_EXERCISES,
      { name: "Soulevé de Terre", sets: 3, reps: 5, rest_seconds: 150, note: "Modéré, technique maximale" },
      MUSCLE_PRESS_EXERCISE,
      ...MUSCLE_ARM_EXERCISES,
      ...MUSCLE_CORE_EXERCISES,
    ],
  },
];

const MUSCLE_PHASE2_TEMPLATES = [
  {
    name: "Upper/Lower — Bas A (Force)",
    exercises: [
      { name: "Échauffement — Rameur", sets: 1, reps: 250, rest_seconds: 0, note: "Monter progressive" },
      { name: "Squat Barre", sets: 5, reps: 5, rest_seconds: 180, note: "Rester stable, bracing fort" },
      { name: "Soulevé de Terre", sets: 3, reps: 5, rest_seconds: 150, note: "Dos gainé, barre proche" },
      { name: "Fentes Marchées", sets: 3, reps: 12, rest_seconds: 120, note: "Amplitudes égales, rythme contrôlé" },
      ...MUSCLE_PULL_EXERCISES,
      MUSCLE_PRESS_EXERCISE,
      ...MUSCLE_ARM_EXERCISES,
      ...MUSCLE_CORE_EXERCISES,
    ],
  },
  {
    name: "Upper/Lower — Haut A (Bench)",
    exercises: [
      { name: "Échauffement — Pompes", sets: 1, reps: 15, rest_seconds: 0, note: "Activer pecs + triceps" },
      { name: "Développé Couché", sets: 5, reps: 5, rest_seconds: 180, note: "Contrôle au touch, explosif" },
      MUSCLE_PRESS_EXERCISE,
      ...MUSCLE_PULL_EXERCISES,
      ...MUSCLE_ARM_EXERCISES,
      { name: "Squat Barre", sets: 3, reps: 5, rest_seconds: 150, note: "Technique, pas d’échec" },
      ...MUSCLE_CORE_EXERCISES,
    ],
  },
  {
    name: "Upper/Lower — Bas B (Deadlift)",
    exercises: [
      { name: "Échauffement — Corde à Sauter", sets: 1, reps: 200, rest_seconds: 0, note: "Préparer cardio + stabilité" },
      { name: "Soulevé de Terre", sets: 5, reps: 5, rest_seconds: 180, note: "Exécution propre, charge progressive" },
      { name: "Squat Barre", sets: 3, reps: 5, rest_seconds: 150, note: "Rester fluide" },
      { name: "Fentes Marchées", sets: 3, reps: 12, rest_seconds: 120, note: "12 reps par jambe si possible" },
      ...MUSCLE_PULL_EXERCISES,
      MUSCLE_PRESS_EXERCISE,
      ...MUSCLE_ARM_EXERCISES,
      ...MUSCLE_CORE_EXERCISES,
    ],
  },
  {
    name: "Upper/Lower — Haut B (Press + Pull)",
    exercises: [
      { name: "Échauffement — Rameur", sets: 1, reps: 250, rest_seconds: 0, note: "Épaules + dos prêts" },
      { name: "Développé Couché", sets: 5, reps: 5, rest_seconds: 180, note: "Stabilité maximale" },
      MUSCLE_PRESS_EXERCISE,
      ...MUSCLE_PULL_EXERCISES,
      ...MUSCLE_ARM_EXERCISES,
      { name: "Squat Barre", sets: 3, reps: 5, rest_seconds: 150, note: "Conserver la qualité technique" },
      ...MUSCLE_CORE_EXERCISES,
    ],
  },
];

const MUSCLE_PHASE3_TEMPLATES = [
  {
    name: "Push — Développés Lourds",
    exercises: [
      { name: "Échauffement — Jumping Jacks", sets: 1, reps: 60, rest_seconds: 0, note: "Énergie progressive" },
      { name: "Développé Couché", sets: 5, reps: 5, rest_seconds: 180, note: " trajectoire droite" },
      MUSCLE_PRESS_EXERCISE,
      { name: "Pompes", sets: 4, reps: 12, rest_seconds: 90, note: "Coudes à 45°, poitrine au sol" },
      { name: "Dips", sets: 3, reps: 10, rest_seconds: 90, note: "Profondeur contrôlée" },
      { name: "Extension Triceps", sets: 3, reps: 12, rest_seconds: 90, note: "Serrage final en haut" },
      { name: "Élévations Latérales", sets: 3, reps: 15, rest_seconds: 75, note: "Deltoïdes, pas de trapèzes" },
      { name: "Gainage Planche", sets: 3, reps: 60, rest_seconds: 75, note: "Tenue ferme, respiration lente" },
      { name: "Hollow Body", sets: 3, reps: 30, rest_seconds: 75, note: "Tension abdominale constante" },
      { name: "Curl Biceps", sets: 2, reps: 12, rest_seconds: 90, note: "Squeeze propre (finisher léger)" },
    ],
  },
  {
    name: "Pull — Tractions + Rowing",
    exercises: [
      { name: "Échauffement — Tractions (assistance)", sets: 1, reps: 8, rest_seconds: 0, note: "Monter l’amplitude sans douleur" },
      ...MUSCLE_PULL_EXERCISES,
      { name: "Curl Biceps", sets: 3, reps: 12, rest_seconds: 90, note: "Amplitude complète, contrôle excentrique" },
      { name: "Face Pull", sets: 3, reps: 15, rest_seconds: 75, note: "Rétraction scapulaire, contrôle" },
      { name: "Élévations Latérales", sets: 3, reps: 15, rest_seconds: 75, note: "Conserver une trajectoire propre" },
      { name: "Extension Triceps", sets: 3, reps: 12, rest_seconds: 90, note: "Équilibrer les bras" },
      ...MUSCLE_CORE_EXERCISES,
      { name: "Pompes", sets: 2, reps: 12, rest_seconds: 90, note: "Équilibrer le haut du corps, reps propres" },
    ],
  },
  {
    name: "Legs — Squat + Deadlift",
    exercises: [
      { name: "Échauffement — Rameur", sets: 1, reps: 250, rest_seconds: 0, note: "Préparer hanches + genoux" },
      { name: "Squat Barre", sets: 5, reps: 5, rest_seconds: 180, note: "Appuis stables, genoux alignés" },
      { name: "Soulevé de Terre", sets: 4, reps: 5, rest_seconds: 180, note: "Dos gainé, barre proche" },
      { name: "Fentes Marchées", sets: 3, reps: 12, rest_seconds: 120, note: "Amplitude régulière" },
      ...MUSCLE_PULL_EXERCISES,
      ...MUSCLE_ARM_EXERCISES,
      { name: "Gainage Planche", sets: 3, reps: 60, rest_seconds: 75, note: "Tenue maximale sans relâcher" },
    ],
  },
  {
    name: "Push — Deltoïdes & Triceps",
    exercises: [
      { name: "Échauffement — Pompes", sets: 1, reps: 15, rest_seconds: 0, note: "Épaules chaudes" },
      { name: "Développé Militaire", sets: 5, reps: 6, rest_seconds: 150, note: "Poussée verticale, gainage actif" },
      { name: "Développé Couché", sets: 4, reps: 8, rest_seconds: 180, note: "Contrôle au contact" },
      { name: "Dips", sets: 4, reps: 10, rest_seconds: 90, note: "Corps stable, pas d’élan" },
      { name: "Extension Triceps", sets: 3, reps: 12, rest_seconds: 90, note: "Verrouillage propre" },
      { name: "Élévations Latérales", sets: 3, reps: 15, rest_seconds: 75, note: "Deltoïdes brûlantes" },
      { name: "Face Pull", sets: 3, reps: 15, rest_seconds: 75, note: "Rétraction, contrôle" },
      ...MUSCLE_CORE_EXERCISES,
      { name: "Curl Biceps", sets: 2, reps: 12, rest_seconds: 90, note: "Option léger (2×12)" },
    ],
  },
  {
    name: "Pull Léger + Abdos",
    exercises: [
      { name: "Échauffement — Rameur", sets: 1, reps: 200, rest_seconds: 0, note: "Dos actif, épaules relâchées" },
      ...MUSCLE_PULL_EXERCISES,
      ...MUSCLE_ARM_EXERCISES,
      { name: "Squat Barre", sets: 3, reps: 5, rest_seconds: 180, note: "Léger/modéré, terminer propre" },
      { name: "Gainage Planche", sets: 3, reps: 60, rest_seconds: 75, note: "Tenue solide" },
      { name: "Relevés de Jambes", sets: 3, reps: 15, rest_seconds: 75, note: "Amplitude contrôlée" },
      { name: "Hollow Body", sets: 2, reps: 30, rest_seconds: 75, note: "Tension abdominale continue" },
    ],
  },
];

const PHASE1_TEMPLATES = [
  {
    name: "AMRAP 20 — Brûlage Corps Entier",
    exercises: [
      { name: "Échauffement — Corde à Sauter", sets: 1, reps: 100, rest_seconds: 30, note: "Sauts simples" },
      { name: "Burpees", sets: 4, reps: 10, rest_seconds: 30, note: "Explosif, toucher le sol puis sauter" },
      { name: "Sauts sur Box", sets: 4, reps: 12, rest_seconds: 45, note: "Box 50 cm" },
      { name: "Squats à Vide", sets: 4, reps: 20, rest_seconds: 30, note: "Descendre sous le parallèle" },
      { name: "Pompes", sets: 4, reps: 15, rest_seconds: 30, note: "Corps gainé, coudes serrés" },
      { name: "Balancements Kettlebell", sets: 4, reps: 20, rest_seconds: 45, note: "Poussée des hanches" },
      { name: "Gainage Planche", sets: 3, reps: 45, rest_seconds: 30, note: "45 secondes de maintien" },
      { name: "Grimpeurs", sets: 3, reps: 30, rest_seconds: 30, note: "30 répétitions par jambe" },
      { name: "Fentes Alternées", sets: 3, reps: 20, rest_seconds: 30, note: "10 par jambe" },
      { name: "Abdominaux Crunch", sets: 3, reps: 25, rest_seconds: 30, note: "Contrôler la descente" },
      { name: "Relevés de Jambes", sets: 3, reps: 15, rest_seconds: 30, note: "Allongé sur le dos" },
      { name: "Sprint sur Place", sets: 5, reps: 20, rest_seconds: 20, note: "20 secondes max effort" },
    ],
  },
  {
    name: "For Time — Défi Cardio",
    exercises: [
      { name: "Double Sauts à Corde", sets: 1, reps: 200, rest_seconds: 20, note: "Double sauts si possible" },
      { name: "Squats à Vide", sets: 5, reps: 25, rest_seconds: 45, note: "Tempo 3-1-3" },
      { name: "Pompes", sets: 5, reps: 15, rest_seconds: 45, note: "Poitrine au sol" },
      { name: "Burpees", sets: 3, reps: 15, rest_seconds: 60, note: "Saut final bras tendus" },
      { name: "Sauts sur Box", sets: 4, reps: 15, rest_seconds: 45, note: "Réception genoux fléchis" },
      { name: "Balancements Kettlebell", sets: 4, reps: 25, rest_seconds: 45, note: "Hauteur des yeux" },
      { name: "Gainage Planche", sets: 3, reps: 60, rest_seconds: 30, note: "60 secondes" },
      { name: "Fentes Marchées", sets: 3, reps: 24, rest_seconds: 45, note: "12 par jambe" },
      { name: "Mountain Climbers", sets: 3, reps: 40, rest_seconds: 30, note: "20 par jambe" },
      { name: "Crunch Bicycle", sets: 3, reps: 30, rest_seconds: 30, note: "Coudes vers genoux opposés" },
    ],
  },
  {
    name: "EMOM 15 — Force Pure",
    exercises: [
      { name: "Rameur", sets: 1, reps: 250, rest_seconds: 0, note: "Échauffement mètres" },
      { name: "Squats Goblet", sets: 5, reps: 12, rest_seconds: 60, note: "Kettlebell en gobelet" },
      { name: "Pompes", sets: 5, reps: 12, rest_seconds: 60, note: "Full range" },
      { name: "Sauts sur Box", sets: 5, reps: 10, rest_seconds: 60, note: "Explosif" },
      { name: "Burpees", sets: 4, reps: 8, rest_seconds: 75, note: "Cadence régulière" },
      { name: "Balancements Kettlebell", sets: 4, reps: 20, rest_seconds: 60, note: "Hips drive" },
      { name: "Gainage Planche", sets: 3, reps: 45, rest_seconds: 45, note: "Ne pas cambrer" },
      { name: "Fentes", sets: 4, reps: 12, rest_seconds: 60, note: "6 par jambe" },
      { name: "Relevés de Jambes", sets: 3, reps: 20, rest_seconds: 45, note: "Jambes tendues" },
      { name: "Wall Balls", sets: 4, reps: 15, rest_seconds: 60, note: "Squat + lancer 9 pieds" },
    ],
  },
  {
    name: "5 Rounds — Brûleur de Graisse",
    exercises: [
      { name: "Corde à Sauter", sets: 1, reps: 50, rest_seconds: 15, note: "Échauffement" },
      { name: "Burpees", sets: 5, reps: 10, rest_seconds: 45, note: "Un round = 10 reps" },
      { name: "Squats à Vide", sets: 5, reps: 20, rest_seconds: 30, note: "Sans pause" },
      { name: "Pompes", sets: 5, reps: 15, rest_seconds: 30, note: "5 rounds total" },
      { name: "Sauts sur Box", sets: 5, reps: 12, rest_seconds: 45, note: "Box 50 cm" },
      { name: "Balancements Kettlebell", sets: 5, reps: 15, rest_seconds: 45, note: "Swing continu" },
      { name: "Grimpeurs", sets: 5, reps: 20, rest_seconds: 30, note: "10 par jambe par round" },
      { name: "Gainage Planche", sets: 5, reps: 30, rest_seconds: 30, note: "30 sec par round" },
      { name: "Fentes", sets: 5, reps: 16, rest_seconds: 45, note: "8 par jambe" },
      { name: "Abdominaux", sets: 5, reps: 20, rest_seconds: 30, note: "Crunch ou sit-up" },
    ],
  },
  {
    name: "Chipper — L'Épuiseur",
    exercises: [
      { name: "Corde à Sauter", sets: 1, reps: 100, rest_seconds: 20, note: "Démarrage" },
      { name: "Burpees", sets: 1, reps: 30, rest_seconds: 90, note: "Enchaîner sans s'arrêter si possible" },
      { name: "Squats à Vide", sets: 1, reps: 40, rest_seconds: 60, note: "Chipper = une seule série totale" },
      { name: "Pompes", sets: 1, reps: 30, rest_seconds: 60, note: "30 reps d'affilée ou par blocs" },
      { name: "Sauts sur Box", sets: 1, reps: 20, rest_seconds: 45, note: "20 reps" },
      { name: "Balancements Kettlebell", sets: 1, reps: 40, rest_seconds: 60, note: "20 par main ou 40 total" },
      { name: "Grimpeurs", sets: 1, reps: 50, rest_seconds: 45, note: "25 par jambe" },
      { name: "Gainage Planche", sets: 1, reps: 90, rest_seconds: 60, note: "90 secondes tenue" },
      { name: "Fentes Alternées", sets: 1, reps: 30, rest_seconds: 45, note: "15 par jambe" },
      { name: "Relevés de Jambes", sets: 1, reps: 25, rest_seconds: 45, note: "Contrôlé" },
      { name: "Wall Balls", sets: 1, reps: 25, rest_seconds: 60, note: "Finisher" },
    ],
  },
  {
    name: "21-15-9 — Classique CrossFit",
    exercises: [
      { name: "Échauffement Dynamique", sets: 1, reps: 60, rest_seconds: 0, note: "Jumping jacks, rotations" },
      { name: "Burpees", sets: 1, reps: 21, rest_seconds: 60, note: "Premier round 21" },
      { name: "Squats à Vide", sets: 1, reps: 21, rest_seconds: 45, note: "21 reps" },
      { name: "Burpees", sets: 1, reps: 15, rest_seconds: 45, note: "Deuxième round 15" },
      { name: "Squats à Vide", sets: 1, reps: 15, rest_seconds: 45, note: "15 reps" },
      { name: "Burpees", sets: 1, reps: 9, rest_seconds: 30, note: "Dernier round 9" },
      { name: "Squats à Vide", sets: 1, reps: 9, rest_seconds: 30, note: "9 reps — fin" },
      { name: "Pompes", sets: 3, reps: 15, rest_seconds: 45, note: "Optionnel après 21-15-9" },
      { name: "Balancements Kettlebell", sets: 3, reps: 20, rest_seconds: 45, note: "Récup active" },
      { name: "Gainage Planche", sets: 2, reps: 45, rest_seconds: 30, note: "Core finisher" },
    ],
  },
  {
    name: "Tabata — Explosion Maximale",
    exercises: [
      { name: "Corde à Sauter", sets: 1, reps: 60, rest_seconds: 20, note: "Échauffement" },
      { name: "Burpees Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "20 sec on, 10 sec off × 8" },
      { name: "Squats à Vide Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Même format Tabata" },
      { name: "Pompes Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Max reps en 20 sec" },
      { name: "Sauts sur Box Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Explosif" },
      { name: "Balancements Kettlebell Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Swing continu" },
      { name: "Grimpeurs Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "20 sec effort" },
      { name: "Gainage Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Planche 20 sec" },
      { name: "Fentes Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Alternées" },
      { name: "Abdominaux Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Sit-up ou crunch" },
    ],
  },
];

const PHASE2_TEMPLATES = [
  {
    name: "AMRAP 18 — Force & Métabolique",
    exercises: [
      { name: "Rameur", sets: 1, reps: 300, rest_seconds: 30, note: "Échauffement" },
      { name: "Soulevé de Terre", sets: 5, reps: 5, rest_seconds: 120, note: "Charge lourde, dos plat" },
      { name: "Développé Militaire", sets: 4, reps: 6, rest_seconds: 90, note: "Debout, barre ou haltères" },
      { name: "Tractions", sets: 4, reps: 8, rest_seconds: 90, note: "Chin over bar, ou australiennes" },
      { name: "Rowing Haltères", sets: 4, reps: 10, rest_seconds: 75, note: "Un bras ou deux" },
      { name: "Épaulé", sets: 4, reps: 5, rest_seconds: 90, note: "Power clean, réception en front rack" },
      { name: "Front Squat", sets: 4, reps: 6, rest_seconds: 90, note: "Après épaulé si barre" },
      { name: "Push Press", sets: 3, reps: 8, rest_seconds: 75, note: "Utiliser les jambes" },
      { name: "Dips", sets: 3, reps: 10, rest_seconds: 60, note: "Banc ou barres parallèles" },
      { name: "Balancements Kettlebell", sets: 3, reps: 20, rest_seconds: 45, note: "Finisher cardio" },
      { name: "Gainage Planche", sets: 3, reps: 45, rest_seconds: 30, note: "Core" },
    ],
  },
  {
    name: "For Time — Défi Force",
    exercises: [
      { name: "Soulevé de Terre", sets: 5, reps: 5, rest_seconds: 120, note: "5×5 lourd" },
      { name: "Développé Militaire", sets: 5, reps: 5, rest_seconds: 90, note: "Strict" },
      { name: "Tractions", sets: 5, reps: 10, rest_seconds: 75, note: "Ou élastique si besoin" },
      { name: "Front Squat", sets: 4, reps: 6, rest_seconds: 90, note: "Clean grip" },
      { name: "Push Press", sets: 4, reps: 8, rest_seconds: 75, note: "Push jerk autorisé" },
      { name: "Rowing Haltères", sets: 4, reps: 12, rest_seconds: 60, note: "Dos serré" },
      { name: "Épaulé", sets: 3, reps: 6, rest_seconds: 90, note: "Power clean" },
      { name: "Burpees", sets: 3, reps: 10, rest_seconds: 60, note: "Conditionnement" },
      { name: "Dips", sets: 3, reps: 12, rest_seconds: 60, note: "Full range" },
      { name: "Gainage Planche", sets: 3, reps: 60, rest_seconds: 30, note: "60 sec" },
    ],
  },
  {
    name: "EMOM 20 — Force Pure",
    exercises: [
      { name: "Soulevé de Terre", sets: 5, reps: 5, rest_seconds: 120, note: "Heavy" },
      { name: "Développé Militaire", sets: 4, reps: 6, rest_seconds: 90, note: "Strict press" },
      { name: "Tractions", sets: 4, reps: 8, rest_seconds: 90, note: "Pronation" },
      { name: "Front Squat", sets: 4, reps: 6, rest_seconds: 90, note: "Front rack" },
      { name: "Rowing Haltères", sets: 4, reps: 10, rest_seconds: 75, note: "Bent over" },
      { name: "Push Press", sets: 4, reps: 8, rest_seconds: 75, note: "Push from legs" },
      { name: "Épaulé", sets: 4, reps: 5, rest_seconds: 90, note: "Power clean" },
      { name: "Dips", sets: 3, reps: 10, rest_seconds: 60, note: "Parallèles" },
      { name: "Balancements Kettlebell", sets: 3, reps: 25, rest_seconds: 45, note: "Swing" },
      { name: "Gainage Planche", sets: 3, reps: 45, rest_seconds: 45, note: "Core" },
    ],
  },
  {
    name: "5 Rounds — Force & Cardio",
    exercises: [
      { name: "Soulevé de Terre", sets: 5, reps: 5, rest_seconds: 90, note: "Charge modérée" },
      { name: "Développé Militaire", sets: 5, reps: 6, rest_seconds: 75, note: "5 rounds" },
      { name: "Tractions", sets: 5, reps: 8, rest_seconds: 75, note: "8 par round" },
      { name: "Front Squat", sets: 5, reps: 5, rest_seconds: 90, note: "5 reps" },
      { name: "Push Press", sets: 5, reps: 6, rest_seconds: 75, note: "6 reps" },
      { name: "Rowing Haltères", sets: 5, reps: 10, rest_seconds: 60, note: "10 par round" },
      { name: "Burpees", sets: 5, reps: 8, rest_seconds: 45, note: "Conditionnement" },
      { name: "Dips", sets: 5, reps: 8, rest_seconds: 60, note: "8 reps" },
      { name: "Balancements Kettlebell", sets: 5, reps: 15, rest_seconds: 45, note: "Swing" },
      { name: "Gainage Planche", sets: 5, reps: 30, rest_seconds: 30, note: "30 sec" },
    ],
  },
  {
    name: "Chipper — Lourd",
    exercises: [
      { name: "Soulevé de Terre", sets: 1, reps: 21, rest_seconds: 120, note: "21 reps chipper" },
      { name: "Développé Militaire", sets: 1, reps: 21, rest_seconds: 90, note: "21 reps" },
      { name: "Tractions", sets: 1, reps: 21, rest_seconds: 90, note: "21 reps" },
      { name: "Front Squat", sets: 1, reps: 15, rest_seconds: 90, note: "15 reps" },
      { name: "Push Press", sets: 1, reps: 15, rest_seconds: 75, note: "15 reps" },
      { name: "Rowing Haltères", sets: 1, reps: 15, rest_seconds: 60, note: "15 par bras" },
      { name: "Épaulé", sets: 1, reps: 9, rest_seconds: 90, note: "9 power cleans" },
      { name: "Dips", sets: 1, reps: 15, rest_seconds: 60, note: "15 reps" },
      { name: "Burpees", sets: 1, reps: 15, rest_seconds: 60, note: "Finisher" },
      { name: "Gainage Planche", sets: 1, reps: 60, rest_seconds: 45, note: "60 sec" },
    ],
  },
  {
    name: "21-15-9 — Force",
    exercises: [
      { name: "Soulevé de Terre", sets: 1, reps: 21, rest_seconds: 90, note: "21-15-9 format" },
      { name: "Développé Militaire", sets: 1, reps: 21, rest_seconds: 75, note: "21 reps" },
      { name: "Soulevé de Terre", sets: 1, reps: 15, rest_seconds: 75, note: "15 reps" },
      { name: "Développé Militaire", sets: 1, reps: 15, rest_seconds: 75, note: "15 reps" },
      { name: "Soulevé de Terre", sets: 1, reps: 9, rest_seconds: 60, note: "9 reps" },
      { name: "Développé Militaire", sets: 1, reps: 9, rest_seconds: 60, note: "9 reps" },
      { name: "Tractions", sets: 3, reps: 8, rest_seconds: 75, note: "Après 21-15-9" },
      { name: "Front Squat", sets: 3, reps: 8, rest_seconds: 90, note: "Optionnel" },
      { name: "Dips", sets: 3, reps: 10, rest_seconds: 60, note: "Triceps" },
      { name: "Gainage Planche", sets: 2, reps: 45, rest_seconds: 30, note: "Core" },
    ],
  },
  {
    name: "Tabata — Force Explosive",
    exercises: [
      { name: "Soulevé de Terre", sets: 8, reps: 20, rest_seconds: 10, note: "Tabata charge légère" },
      { name: "Développé Militaire", sets: 8, reps: 20, rest_seconds: 10, note: "20 sec on" },
      { name: "Tractions", sets: 8, reps: 20, rest_seconds: 10, note: "Max reps ou élastique" },
      { name: "Front Squat", sets: 8, reps: 20, rest_seconds: 10, note: "Barre vide ou léger" },
      { name: "Push Press", sets: 8, reps: 20, rest_seconds: 10, note: "Explosif" },
      { name: "Rowing Haltères", sets: 8, reps: 20, rest_seconds: 10, note: "20 sec" },
      { name: "Épaulé", sets: 6, reps: 20, rest_seconds: 10, note: "Power clean léger" },
      { name: "Dips", sets: 8, reps: 20, rest_seconds: 10, note: "Max reps" },
      { name: "Burpees", sets: 8, reps: 20, rest_seconds: 10, note: "Cardio" },
      { name: "Gainage Planche", sets: 8, reps: 20, rest_seconds: 10, note: "20 sec" },
    ],
  },
];

const PHASE3_TEMPLATES = [
  {
    name: "AMRAP 25 — Épaules & Bras",
    exercises: [
      { name: "Développé Haltères", sets: 4, reps: 10, rest_seconds: 75, note: "Assis, full ROM" },
      { name: "Élévations Latérales", sets: 4, reps: 15, rest_seconds: 45, note: "Pouces vers le plafond" },
      { name: "Face Pull", sets: 4, reps: 15, rest_seconds: 60, note: "Corde ou bande, rétraction" },
      { name: "Curls Biceps", sets: 4, reps: 12, rest_seconds: 60, note: "Haltères ou barre" },
      { name: "Extensions Triceps", sets: 4, reps: 12, rest_seconds: 60, note: "Corde ou barre" },
      { name: "Dips", sets: 4, reps: 12, rest_seconds: 60, note: "Parallèles, corps droit" },
      { name: "Tractions", sets: 4, reps: 10, rest_seconds: 75, note: "Supination ou neutre" },
      { name: "Rowing Haltères", sets: 4, reps: 12, rest_seconds: 60, note: "Dos large" },
      { name: "Pompes Diamant", sets: 3, reps: 15, rest_seconds: 45, note: "Mains en diamant" },
      { name: "Dragon Flag", sets: 3, reps: 8, rest_seconds: 60, note: "Progression ou genoux fléchis" },
      { name: "L-Sit", sets: 3, reps: 20, rest_seconds: 45, note: "20 sec maintien" },
      { name: "Hollow Body", sets: 3, reps: 30, rest_seconds: 30, note: "30 sec hold" },
    ],
  },
  {
    name: "For Time — Haut du Corps",
    exercises: [
      { name: "Développé Haltères", sets: 5, reps: 10, rest_seconds: 75, note: "5×10" },
      { name: "Élévations Latérales", sets: 4, reps: 15, rest_seconds: 45, note: "Épaules" },
      { name: "Face Pull", sets: 4, reps: 20, rest_seconds: 60, note: "Arrière épaules" },
      { name: "Curls Biceps", sets: 4, reps: 12, rest_seconds: 60, note: "Strict" },
      { name: "Extensions Triceps", sets: 4, reps: 15, rest_seconds: 60, note: "Corde" },
      { name: "Dips", sets: 4, reps: 15, rest_seconds: 60, note: "Full depth" },
      { name: "Tractions", sets: 4, reps: 12, rest_seconds: 75, note: "Chin over bar" },
      { name: "Rowing Haltères", sets: 4, reps: 12, rest_seconds: 60, note: "Un bras" },
      { name: "Toes to Bar", sets: 3, reps: 12, rest_seconds: 60, note: "Or knee raises" },
      { name: "Pompes Diamant", sets: 3, reps: 20, rest_seconds: 45, note: "Poitrine" },
      { name: "Relevés de Jambes", sets: 3, reps: 20, rest_seconds: 45, note: "Suspension ou sol" },
      { name: "Gainage Planche", sets: 3, reps: 45, rest_seconds: 30, note: "Core" },
    ],
  },
  {
    name: "EMOM 20 — Esthétique",
    exercises: [
      { name: "Développé Haltères", sets: 5, reps: 10, rest_seconds: 60, note: "EMOM style" },
      { name: "Élévations Latérales", sets: 5, reps: 15, rest_seconds: 45, note: "Light weight" },
      { name: "Face Pull", sets: 5, reps: 15, rest_seconds: 45, note: "Haute répétition" },
      { name: "Curls Biceps", sets: 5, reps: 12, rest_seconds: 45, note: "Contrôlé" },
      { name: "Extensions Triceps", sets: 5, reps: 12, rest_seconds: 45, note: "Squeeze" },
      { name: "Dips", sets: 5, reps: 10, rest_seconds: 60, note: "10 reps" },
      { name: "Tractions", sets: 5, reps: 8, rest_seconds: 75, note: "Strict" },
      { name: "Rowing Haltères", sets: 5, reps: 10, rest_seconds: 60, note: "Dos" },
      { name: "Toes to Bar", sets: 4, reps: 10, rest_seconds: 60, note: "Ou knee raises" },
      { name: "Dragon Flag", sets: 3, reps: 6, rest_seconds: 75, note: "Abdos" },
      { name: "L-Sit", sets: 3, reps: 15, rest_seconds: 45, note: "15 sec" },
      { name: "Hollow Body", sets: 3, reps: 30, rest_seconds: 30, note: "30 sec" },
    ],
  },
  {
    name: "5 Rounds — Superset Épaules & Bras",
    exercises: [
      { name: "Développé Haltères", sets: 5, reps: 10, rest_seconds: 45, note: "Superset avec latérales" },
      { name: "Élévations Latérales", sets: 5, reps: 15, rest_seconds: 45, note: "Direct après dev" },
      { name: "Curls Biceps", sets: 5, reps: 12, rest_seconds: 45, note: "Superset avec triceps" },
      { name: "Extensions Triceps", sets: 5, reps: 12, rest_seconds: 45, note: "Direct après curls" },
      { name: "Face Pull", sets: 5, reps: 15, rest_seconds: 60, note: "Arrière delts" },
      { name: "Dips", sets: 5, reps: 12, rest_seconds: 60, note: "5 rounds" },
      { name: "Tractions", sets: 5, reps: 10, rest_seconds: 75, note: "Dos" },
      { name: "Rowing Haltères", sets: 5, reps: 12, rest_seconds: 60, note: "Un bras" },
      { name: "Toes to Bar", sets: 5, reps: 10, rest_seconds: 60, note: "Core" },
      { name: "Pompes Diamant", sets: 5, reps: 15, rest_seconds: 45, note: "Poitrine" },
      { name: "Relevés de Jambes", sets: 5, reps: 15, rest_seconds: 45, note: "Abdos" },
      { name: "Gainage Planche", sets: 5, reps: 40, rest_seconds: 30, note: "40 sec" },
    ],
  },
  {
    name: "Chipper — Abdos & Dos",
    exercises: [
      { name: "Tractions", sets: 1, reps: 25, rest_seconds: 90, note: "Chipper 25" },
      { name: "Rowing Haltères", sets: 1, reps: 25, rest_seconds: 75, note: "25 par bras ou total" },
      { name: "Face Pull", sets: 1, reps: 30, rest_seconds: 60, note: "30 reps" },
      { name: "Toes to Bar", sets: 1, reps: 20, rest_seconds: 75, note: "Ou knee raises" },
      { name: "Dragon Flag", sets: 1, reps: 15, rest_seconds: 90, note: "15 reps progression" },
      { name: "L-Sit", sets: 1, reps: 60, rest_seconds: 60, note: "60 sec cumulées" },
      { name: "Hollow Body", sets: 1, reps: 60, rest_seconds: 45, note: "60 sec" },
      { name: "Développé Haltères", sets: 1, reps: 20, rest_seconds: 60, note: "20 reps" },
      { name: "Curls Biceps", sets: 1, reps: 25, rest_seconds: 60, note: "25 reps" },
      { name: "Extensions Triceps", sets: 1, reps: 25, rest_seconds: 60, note: "25 reps" },
      { name: "Dips", sets: 1, reps: 20, rest_seconds: 60, note: "20 reps" },
      { name: "Gainage Planche", sets: 1, reps: 90, rest_seconds: 45, note: "90 sec" },
    ],
  },
  {
    name: "21-15-9 — Épaules & Abdos",
    exercises: [
      { name: "Développé Haltères", sets: 1, reps: 21, rest_seconds: 75, note: "21-15-9" },
      { name: "Toes to Bar", sets: 1, reps: 21, rest_seconds: 75, note: "21 reps" },
      { name: "Développé Haltères", sets: 1, reps: 15, rest_seconds: 60, note: "15 reps" },
      { name: "Toes to Bar", sets: 1, reps: 15, rest_seconds: 60, note: "15 reps" },
      { name: "Développé Haltères", sets: 1, reps: 9, rest_seconds: 45, note: "9 reps" },
      { name: "Toes to Bar", sets: 1, reps: 9, rest_seconds: 45, note: "9 reps" },
      { name: "Élévations Latérales", sets: 4, reps: 15, rest_seconds: 45, note: "Finisher" },
      { name: "Face Pull", sets: 4, reps: 20, rest_seconds: 45, note: "Arrière" },
      { name: "Dragon Flag", sets: 3, reps: 8, rest_seconds: 60, note: "Abdos" },
      { name: "L-Sit", sets: 3, reps: 20, rest_seconds: 45, note: "20 sec" },
      { name: "Hollow Body", sets: 3, reps: 30, rest_seconds: 30, note: "30 sec" },
      { name: "Gainage Planche", sets: 2, reps: 60, rest_seconds: 30, note: "60 sec" },
    ],
  },
  {
    name: "Tabata — Explosion Esthétique",
    exercises: [
      { name: "Développé Haltères Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "20 sec max" },
      { name: "Élévations Latérales Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Light" },
      { name: "Curls Biceps Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "20 sec" },
      { name: "Extensions Triceps Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Corde" },
      { name: "Dips Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Max reps" },
      { name: "Tractions Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Ou élastique" },
      { name: "Face Pull Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Haute rép" },
      { name: "Toes to Bar Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Ou knee raises" },
      { name: "Pompes Diamant Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "Poitrine" },
      { name: "Dragon Flag Tabata", sets: 6, reps: 20, rest_seconds: 10, note: "Progression" },
      { name: "L-Sit Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "20 sec hold" },
      { name: "Hollow Body Tabata", sets: 8, reps: 20, rest_seconds: 10, note: "20 sec" },
    ],
  },
];

function getPhase(day) {
  if (day <= 28) return 1;
  if (day <= 84) return 2;
  return 3;
}

function getCrossfitWorkoutForDay(day) {
  const phase = getPhase(day);
  const workoutDays =
    phase === 1 ? PHASE1_WORKOUT_DAYS : phase === 2 ? PHASE2_WORKOUT_DAYS : PHASE3_WORKOUT_DAYS;
  const isRest = workoutSequenceIndex(day, workoutDays) === -1;
  if (isRest) return { phase, name: "Jour de Repos", is_rest_day: true, exercises: [] };

  const templates =
    phase === 1 ? PHASE1_TEMPLATES : phase === 2 ? PHASE2_TEMPLATES : PHASE3_TEMPLATES;
  const seq = workoutSequenceIndex(day, workoutDays);
  const template = templates[seq % templates.length];
  return {
    phase,
    name: template.name,
    is_rest_day: false,
    exercises: template.exercises,
  };
}

function getMuscleWorkoutForDay(day) {
  const phase = getPhase(day);
  const workoutDays =
    phase === 1 ? PHASE1_WORKOUT_DAYS : phase === 2 ? PHASE2_WORKOUT_DAYS : PHASE3_WORKOUT_DAYS;
  const isRest = workoutSequenceIndex(day, workoutDays) === -1;
  if (isRest) return { phase, name: "Jour de Repos", is_rest_day: true, exercises: [] };

  const templates =
    phase === 1 ? MUSCLE_PHASE1_TEMPLATES : phase === 2 ? MUSCLE_PHASE2_TEMPLATES : MUSCLE_PHASE3_TEMPLATES;

  const seq = workoutSequenceIndex(day, workoutDays);
  const template = templates[seq % templates.length];

  return {
    phase,
    name: template.name,
    is_rest_day: false,
    exercises: template.exercises,
  };
}

function getMixedWorkoutForDay(day) {
  const phase = getPhase(day);
  const workoutDays =
    phase === 1 ? PHASE1_WORKOUT_DAYS : phase === 2 ? PHASE2_WORKOUT_DAYS : PHASE3_WORKOUT_DAYS;

  const seq = workoutSequenceIndex(day, workoutDays);
  const isRest = seq === -1;
  if (isRest) return { phase, name: "Jour de Repos", is_rest_day: true, exercises: [] };

  const weekIndex = (day - 1) % 7;
  const weekPos = workoutDays.indexOf(weekIndex); // 0..n-1

  let subtype = "crossfit";
  if (phase === 1) subtype = weekPos % 2 === 0 ? "muscle" : "crossfit";
  if (phase === 2) subtype = weekPos < 2 ? "muscle" : "crossfit";
  if (phase === 3) subtype = weekPos < 3 ? "muscle" : "crossfit";

  const base = subtype === "muscle" ? getMuscleWorkoutForDay(day) : getCrossfitWorkoutForDay(day);
  const prefix = subtype === "muscle" ? "Musculation — " : "CrossFit — ";

  return {
    phase,
    name: `${prefix}${base.name}`,
    is_rest_day: false,
    exercises: base.exercises,
  };
}

function getWorkoutForDay(day, goalType) {
  if (goalType === "muscle") return getMuscleWorkoutForDay(day);
  if (goalType === "mixed") return getMixedWorkoutForDay(day);
  return getCrossfitWorkoutForDay(day);
}

// --- Meals: 7-day rotating pattern (days 1–7) — recettes complètes + macros
const MEAL_TEMPLATES = [
  // DAY 1
  {
    breakfast: {
      name: "Flocons d'Avoine Protéinés",
      prep_time_minutes: 5,
      difficulty: "Facile",
      macros: { calories: 450, proteins_g: 35, carbs_g: 55, fats_g: 8 },
      ingredients: [
        { name: "Flocons d'avoine", quantity: 80, unit: "g" },
        { name: "Protéine vanille", quantity: 30, unit: "g" },
        { name: "Lait demi-écrémé", quantity: 200, unit: "ml" },
        { name: "Banane", quantity: 1, unit: "pièce" },
        { name: "Cannelle", quantity: 1, unit: "pincée" },
      ],
      recipe:
        "1. Faire chauffer le lait 2 minutes.\n2. Ajouter les flocons d'avoine et mélanger.\n3. Couper le feu, incorporer la protéine.\n4. Ajouter la banane (écrasée ou en rondelles).\n5. Saupoudrer de cannelle.\n6. Laisser reposer 2 minutes puis déguster.",
    },
    lunch: {
      name: "Bol Poulet Riz & Brocoli",
      prep_time_minutes: 15,
      difficulty: "Moyen",
      macros: { calories: 550, proteins_g: 45, carbs_g: 55, fats_g: 18 },
      ingredients: [
        { name: "Blanc de poulet", quantity: 150, unit: "g" },
        { name: "Riz complet", quantity: 120, unit: "g" },
        { name: "Brocoli", quantity: 200, unit: "g" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
        { name: "Sel", quantity: 1, unit: "pincée" },
        { name: "Poivre", quantity: 1, unit: "pincée" },
        { name: "Ail", quantity: 1, unit: "gousse" },
      ],
      recipe:
        "1. Assaisonner le poulet (sel, poivre, ail).\n2. Cuire le poulet à la poêle 8–10 min.\n3. Cuire le riz complet.\n4. Cuire le brocoli à la vapeur 6–8 min.\n5. Assembler le bol : riz + brocoli + poulet.\n6. Ajouter l'huile d'olive et mélanger.",
    },
    dinner: {
      name: "Saumon, Patate Douce & Épinards",
      prep_time_minutes: 20,
      difficulty: "Moyen",
      macros: { calories: 480, proteins_g: 38, carbs_g: 35, fats_g: 20 },
      ingredients: [
        { name: "Saumon", quantity: 150, unit: "g" },
        { name: "Patate douce", quantity: 200, unit: "g" },
        { name: "Épinards", quantity: 100, unit: "g" },
        { name: "Citron", quantity: 1, unit: "pièce" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
        { name: "Sel", quantity: 1, unit: "pincée" },
        { name: "Poivre", quantity: 1, unit: "pincée" },
      ],
      recipe:
        "1. Préchauffer le four à 200°C.\n2. Enfourner les dés de patate douce 15–20 min.\n3. Cuire le saumon 10–12 min.\n4. Faire tomber les épinards 2–3 min à la poêle.\n5. Assaisonner avec jus de citron, sel et poivre.\n6. Servir patate douce + saumon + épinards, arroser d'un filet d'huile d'olive.",
    },
    snack: {
      name: "Yaourt Grec & Fruits Rouges",
      prep_time_minutes: 5,
      difficulty: "Facile",
      macros: { calories: 220, proteins_g: 18, carbs_g: 20, fats_g: 8 },
      ingredients: [
        { name: "Yaourt grec 0%", quantity: 200, unit: "g" },
        { name: "Fruits rouges", quantity: 100, unit: "g" },
        { name: "Miel", quantity: 1, unit: "càc" },
        { name: "Amandes", quantity: 20, unit: "g" },
      ],
      recipe:
        "1. Verser le yaourt grec dans un bol.\n2. Ajouter les fruits rouges.\n3. Arroser d'une cuillère de miel.\n4. Hacher/amalgamer les amandes et saupoudrer.\n5. Mélanger légèrement et déguster.",
    },
  },

  // DAY 2
  {
    breakfast: {
      name: "Toast Œufs & Avocat",
      prep_time_minutes: 10,
      difficulty: "Facile",
      macros: { calories: 520, proteins_g: 30, carbs_g: 45, fats_g: 25 },
      ingredients: [
        { name: "Pain complet", quantity: 80, unit: "g" },
        { name: "Œufs entiers", quantity: 2, unit: "pièce" },
        { name: "Avocat", quantity: 60, unit: "g" },
        { name: "Tomates cerises", quantity: 100, unit: "g" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
      ],
      recipe:
        "1. Toaster le pain complet.\n2. Cuire les œufs (au plat ou brouillés).\n3. Écraser l'avocat avec sel/poivre.\n4. Étaler l'avocat sur le toast.\n5. Ajouter les œufs + tomates cerises.\n6. Ajouter un filet d'huile d'olive et servir.",
    },
    lunch: {
      name: "Wrap Thon & Légumes",
      prep_time_minutes: 12,
      difficulty: "Facile",
      macros: { calories: 600, proteins_g: 40, carbs_g: 55, fats_g: 18 },
      ingredients: [
        { name: "Thon en boîte (égoutté)", quantity: 140, unit: "g" },
        { name: "Wrap blé complet", quantity: 1, unit: "pièce" },
        { name: "Laitue", quantity: 50, unit: "g" },
        { name: "Concombre", quantity: 80, unit: "g" },
        { name: "Citron", quantity: 1, unit: "pièce" },
        { name: "Yaourt nature (sauce)", quantity: 40, unit: "g" },
      ],
      recipe:
        "1. Mélanger le thon avec le yaourt, le jus de citron, sel/poivre.\n2. Préparer la laitue et le concombre (émincer).\n3. Étaler la garniture sur le wrap.\n4. Ajouter laitue + concombre.\n5. Rouler serré et couper si besoin.",
    },
    dinner: {
      name: "Bœuf Haché, Quinoa & Légumes",
      prep_time_minutes: 25,
      difficulty: "Moyen",
      macros: { calories: 620, proteins_g: 45, carbs_g: 60, fats_g: 18 },
      ingredients: [
        { name: "Bœuf haché maigre", quantity: 160, unit: "g" },
        { name: "Quinoa", quantity: 100, unit: "g" },
        { name: "Poivron", quantity: 120, unit: "g" },
        { name: "Courgette", quantity: 150, unit: "g" },
        { name: "Oignon", quantity: 80, unit: "g" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
      ],
      recipe:
        "1. Cuire le quinoa.\n2. Faire revenir oignon + légumes à la poêle.\n3. Ajouter le bœuf haché et cuire jusqu'à coloration.\n4. Ajuster sel/poivre.\n5. Assembler dans un bol.\n6. Ajouter un filet d'huile d'olive si besoin.",
    },
    snack: {
      name: "Fromage Blanc, Amandes & Banane",
      prep_time_minutes: 7,
      difficulty: "Facile",
      macros: { calories: 260, proteins_g: 22, carbs_g: 22, fats_g: 10 },
      ingredients: [
        { name: "Fromage blanc 0%", quantity: 200, unit: "g" },
        { name: "Amandes", quantity: 20, unit: "g" },
        { name: "Banane", quantity: 1, unit: "pièce" },
        { name: "Cannelle", quantity: 1, unit: "pincée" },
      ],
      recipe:
        "1. Mettre le fromage blanc dans un bol.\n2. Ajouter la banane en rondelles.\n3. Parsemer d'amandes.\n4. Ajouter la cannelle.\n5. Mélanger et déguster.",
    },
  },

  // DAY 3
  {
    breakfast: {
      name: "Pancakes Protéinés",
      prep_time_minutes: 12,
      difficulty: "Facile",
      macros: { calories: 520, proteins_g: 40, carbs_g: 55, fats_g: 10 },
      ingredients: [
        { name: "Farine d'avoine", quantity: 60, unit: "g" },
        { name: "Blancs d'œufs", quantity: 120, unit: "g" },
        { name: "Whey protéine", quantity: 30, unit: "g" },
        { name: "Myrtilles", quantity: 80, unit: "g" },
        { name: "Levure chimique", quantity: 1, unit: "pincée" },
      ],
      recipe:
        "1. Mélanger farine d'avoine + whey + levure.\n2. Ajouter les blancs d'œufs et remuer.\n3. Cuire sur poêle antiadhésive (1–2 min par face).\n4. Ajouter les myrtilles.\n5. Servir aussitôt.",
    },
    lunch: {
      name: "Salade Niçoise Protéinée",
      prep_time_minutes: 18,
      difficulty: "Moyen",
      macros: { calories: 650, proteins_g: 45, carbs_g: 55, fats_g: 20 },
      ingredients: [
        { name: "Thon en boîte", quantity: 120, unit: "g" },
        { name: "Œufs durs", quantity: 2, unit: "pièce" },
        { name: "Haricots verts", quantity: 200, unit: "g" },
        { name: "Tomates", quantity: 200, unit: "g" },
        { name: "Pommes de terre", quantity: 150, unit: "g" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
      ],
      recipe:
        "1. Cuire haricots verts à la vapeur.\n2. Cuire/écaler les œufs.\n3. Cuire les pommes de terre (petits cubes) 10–12 min.\n4. Couper tomates, assembler.\n5. Ajouter thon + œufs.\n6. Assaisonner avec huile d'olive, sel et poivre.",
    },
    dinner: {
      name: "Poulet Mariné & Légumes Rôtis",
      prep_time_minutes: 30,
      difficulty: "Moyen",
      macros: { calories: 600, proteins_g: 45, carbs_g: 45, fats_g: 18 },
      ingredients: [
        { name: "Blanc de poulet", quantity: 180, unit: "g" },
        { name: "Brocoli", quantity: 150, unit: "g" },
        { name: "Courgette", quantity: 150, unit: "g" },
        { name: "Carottes", quantity: 120, unit: "g" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
        { name: "Citron", quantity: 1, unit: "pièce" },
      ],
      recipe:
        "1. Mélanger marinade : citron + huile d'olive + ail + sel/poivre.\n2. Badigeonner le poulet (10 min si possible).\n3. Préchauffer le four 200°C.\n4. Étaler légumes + poulet sur plaque.\n5. Rôtir 20–25 min.\n6. Servir avec le jus de cuisson.",
    },
    snack: {
      name: "Shake Protéiné Banane",
      prep_time_minutes: 5,
      difficulty: "Facile",
      macros: { calories: 230, proteins_g: 25, carbs_g: 20, fats_g: 4 },
      ingredients: [
        { name: "Whey protéine", quantity: 30, unit: "g" },
        { name: "Lait demi-écrémé", quantity: 250, unit: "ml" },
        { name: "Banane", quantity: 1, unit: "pièce" },
      ],
      recipe:
        "1. Mettre lait + banane + whey dans un blender.\n2. Mixer 30–45 secondes.\n3. Boire immédiatement.",
    },
  },

  // DAY 4
  {
    breakfast: {
      name: "Smoothie Bowl Protéiné",
      prep_time_minutes: 10,
      difficulty: "Facile",
      macros: { calories: 480, proteins_g: 30, carbs_g: 55, fats_g: 12 },
      ingredients: [
        { name: "Banane", quantity: 1, unit: "pièce" },
        { name: "Épinards", quantity: 60, unit: "g" },
        { name: "Whey protéine", quantity: 30, unit: "g" },
        { name: "Yaourt grec 0%", quantity: 150, unit: "g" },
        { name: "Granola", quantity: 30, unit: "g" },
      ],
      recipe:
        "1. Mixer banane + yaourt + épinards.\n2. Ajouter whey et mixer à nouveau.\n3. Verser dans un bol.\n4. Ajouter granola sur le dessus.\n5. Déguster.",
    },
    lunch: {
      name: "Bol Dinde, Riz & Asperges",
      prep_time_minutes: 22,
      difficulty: "Moyen",
      macros: { calories: 600, proteins_g: 45, carbs_g: 65, fats_g: 14 },
      ingredients: [
        { name: "Dinde", quantity: 170, unit: "g" },
        { name: "Riz complet", quantity: 120, unit: "g" },
        { name: "Asperges", quantity: 180, unit: "g" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
      ],
      recipe:
        "1. Cuire le riz complet.\n2. Griller la dinde.\n3. Cuire asperges à la vapeur.\n4. Assembler : riz + dinde + asperges.\n5. Arroser d'huile d'olive et saler.",
    },
    dinner: {
      name: "Cabillaud & Légumes Vapeur",
      prep_time_minutes: 20,
      difficulty: "Facile",
      macros: { calories: 500, proteins_g: 40, carbs_g: 25, fats_g: 18 },
      ingredients: [
        { name: "Cabillaud", quantity: 200, unit: "g" },
        { name: "Légumes vapeur", quantity: 250, unit: "g" },
        { name: "Citron", quantity: 1, unit: "pièce" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
      ],
      recipe:
        "1. Mettre les légumes à la vapeur.\n2. Cuire le cabillaud à la poêle (ou au four).\n3. Assaisonner avec sel, poivre et jus de citron.\n4. Servir poisson + légumes.\n5. Ajouter un filet d'huile d'olive.",
    },
    snack: {
      name: "Œufs Durs & Légumes",
      prep_time_minutes: 12,
      difficulty: "Facile",
      macros: { calories: 260, proteins_g: 20, carbs_g: 12, fats_g: 14 },
      ingredients: [
        { name: "Œufs", quantity: 3, unit: "pièce" },
        { name: "Carottes", quantity: 100, unit: "g" },
        { name: "Concombre", quantity: 80, unit: "g" },
        { name: "Yaourt grec 0%", quantity: 80, unit: "g" },
      ],
      recipe:
        "1. Faire bouillir les œufs 10 min.\n2. Refroidir, écaler.\n3. Couper carottes + concombre.\n4. Servir les œufs avec yaourt grec en sauce.\n5. Bien mâcher et manger lentement.",
    },
  },

  // DAY 5
  {
    breakfast: {
      name: "Omelette Légumes & Fromage",
      prep_time_minutes: 12,
      difficulty: "Facile",
      macros: { calories: 500, proteins_g: 35, carbs_g: 25, fats_g: 30 },
      ingredients: [
        { name: "Œufs entiers", quantity: 3, unit: "pièce" },
        { name: "Épinards", quantity: 80, unit: "g" },
        { name: "Champignons", quantity: 120, unit: "g" },
        { name: "Feta", quantity: 40, unit: "g" },
      ],
      recipe:
        "1. Battre les œufs avec sel/poivre.\n2. Faire revenir épinards et champignons.\n3. Ajouter les œufs et cuire jusqu'à prise.\n4. Ajouter feta.\n5. Plier et servir.",
    },
    lunch: {
      name: "Buddha Bowl Protéiné au Poulet",
      prep_time_minutes: 25,
      difficulty: "Moyen",
      macros: { calories: 650, proteins_g: 45, carbs_g: 70, fats_g: 18 },
      ingredients: [
        { name: "Blanc de poulet", quantity: 180, unit: "g" },
        { name: "Riz complet", quantity: 140, unit: "g" },
        { name: "Concombre", quantity: 100, unit: "g" },
        { name: "Tomate", quantity: 150, unit: "g" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
        { name: "Yaourt nature", quantity: 60, unit: "g" },
      ],
      recipe:
        "1. Cuire le riz.\n2. Griller le poulet et émincer.\n3. Préparer légumes.\n4. Mélanger yaourt + herbes + citron.\n5. Assembler : riz + poulet + légumes.\n6. Ajouter sauce et huile d'olive.",
    },
    dinner: {
      name: "Sauté de Crevettes & Nouilles Soba",
      prep_time_minutes: 20,
      difficulty: "Moyen",
      macros: { calories: 620, proteins_g: 45, carbs_g: 65, fats_g: 10 },
      ingredients: [
        { name: "Crevettes", quantity: 200, unit: "g" },
        { name: "Nouilles soba", quantity: 90, unit: "g" },
        { name: "Brocoli", quantity: 150, unit: "g" },
        { name: "Sauce soja", quantity: 1, unit: "càs" },
        { name: "Ail", quantity: 1, unit: "gousse" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
      ],
      recipe:
        "1. Cuire les soba selon paquet et rincer.\n2. Saisir les crevettes 2–3 min.\n3. Ajouter brocoli et ail.\n4. Verser soja, mélanger.\n5. Ajouter les nouilles.\n6. Servir chaud.",
    },
    snack: {
      name: "Yaourt Grec & Granola Maison",
      prep_time_minutes: 8,
      difficulty: "Facile",
      macros: { calories: 260, proteins_g: 22, carbs_g: 22, fats_g: 8 },
      ingredients: [
        { name: "Yaourt grec 0%", quantity: 200, unit: "g" },
        { name: "Granola", quantity: 40, unit: "g" },
        { name: "Miel", quantity: 1, unit: "càc" },
        { name: "Noix", quantity: 15, unit: "g" },
      ],
      recipe:
        "1. Verser yaourt dans un bol.\n2. Ajouter granola.\n3. Arroser de miel.\n4. Parsemer noix.\n5. Mélanger et déguster.",
    },
  },

  // DAY 6
  {
    breakfast: {
      name: "Porridge Banane & Noix",
      prep_time_minutes: 10,
      difficulty: "Facile",
      macros: { calories: 520, proteins_g: 30, carbs_g: 60, fats_g: 18 },
      ingredients: [
        { name: "Flocons d'avoine", quantity: 80, unit: "g" },
        { name: "Lait demi-écrémé", quantity: 250, unit: "ml" },
        { name: "Banane", quantity: 1, unit: "pièce" },
        { name: "Noix", quantity: 20, unit: "g" },
        { name: "Cannelle", quantity: 1, unit: "pincée" },
      ],
      recipe:
        "1. Faire chauffer lait + flocons d'avoine à feu doux.\n2. Remuer jusqu'à texture épaisse.\n3. Ajouter la banane.\n4. Ajouter cannelle.\n5. Ajouter noix hachées et servir.",
    },
    lunch: {
      name: "Salade César au Poulet Grillé",
      prep_time_minutes: 20,
      difficulty: "Moyen",
      macros: { calories: 650, proteins_g: 45, carbs_g: 40, fats_g: 30 },
      ingredients: [
        { name: "Poulet grillé", quantity: 180, unit: "g" },
        { name: "Laitue romaine", quantity: 150, unit: "g" },
        { name: "Parmesan", quantity: 15, unit: "g" },
        { name: "Sauce césar légère", quantity: 80, unit: "g" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
      ],
      recipe:
        "1. Griller le poulet puis émincer.\n2. Laver la romaine et préparer salade.\n3. Mélanger poulet + romaine.\n4. Ajouter parmesan.\n5. Verser sauce césar.\n6. Mélanger, ajuster et servir.",
    },
    dinner: {
      name: "Steak, Haricots Verts & Pomme de Terre",
      prep_time_minutes: 30,
      difficulty: "Moyen",
      macros: { calories: 600, proteins_g: 40, carbs_g: 55, fats_g: 20 },
      ingredients: [
        { name: "Steak maigre", quantity: 180, unit: "g" },
        { name: "Haricots verts", quantity: 250, unit: "g" },
        { name: "Pomme de terre", quantity: 250, unit: "g" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
      ],
      recipe:
        "1. Cuire haricots verts à la vapeur.\n2. Cuire pommes de terre (four ou eau).\n3. Saisir le steak 3–5 min par face.\n4. Assaisonner.\n5. Assembler et arroser d'huile d'olive.",
    },
    snack: {
      name: "Fromage Blanc & Myrtilles",
      prep_time_minutes: 5,
      difficulty: "Facile",
      macros: { calories: 200, proteins_g: 18, carbs_g: 15, fats_g: 2 },
      ingredients: [
        { name: "Fromage blanc 0%", quantity: 200, unit: "g" },
        { name: "Myrtilles", quantity: 120, unit: "g" },
        { name: "Cannelle", quantity: 1, unit: "pincée" },
      ],
      recipe:
        "1. Verser fromage blanc.\n2. Ajouter myrtilles.\n3. Saupoudrer cannelle.\n4. Mélanger et déguster.",
    },
  },

  // DAY 7 (rest day — plus de glucides)
  {
    breakfast: {
      name: "Crêpes Protéinées aux Fruits",
      prep_time_minutes: 15,
      difficulty: "Moyen",
      macros: { calories: 560, proteins_g: 35, carbs_g: 70, fats_g: 12 },
      ingredients: [
        { name: "Flocons d'avoine", quantity: 70, unit: "g" },
        { name: "Blancs d'œufs", quantity: 120, unit: "g" },
        { name: "Protéine en poudre", quantity: 30, unit: "g" },
        { name: "Fruits", quantity: 150, unit: "g" },
        { name: "Cannelle", quantity: 1, unit: "pincée" },
      ],
      recipe:
        "1. Mélanger avoine + protéine + cannelle.\n2. Ajouter blancs d'œufs.\n3. Cuire en crêpes à la poêle.\n4. Ajouter les fruits et plier.\n5. Déguster chaud.",
    },
    lunch: {
      name: "Pâtes Complètes Bolognaise Allégée",
      prep_time_minutes: 25,
      difficulty: "Moyen",
      macros: { calories: 700, proteins_g: 45, carbs_g: 90, fats_g: 14 },
      ingredients: [
        { name: "Pâtes complètes", quantity: 120, unit: "g" },
        { name: "Bœuf haché maigre", quantity: 160, unit: "g" },
        { name: "Sauce tomate", quantity: 200, unit: "g" },
        { name: "Oignon", quantity: 80, unit: "g" },
        { name: "Ail", quantity: 1, unit: "gousse" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
      ],
      recipe:
        "1. Cuire les pâtes.\n2. Faire revenir oignon et ail.\n3. Ajouter le bœuf et saisir.\n4. Ajouter sauce tomate et laisser mijoter 10 min.\n5. Mélanger avec les pâtes.\n6. Servir chaud.",
    },
    dinner: {
      name: "Soupe de Légumes & Poulet",
      prep_time_minutes: 30,
      difficulty: "Facile",
      macros: { calories: 520, proteins_g: 40, carbs_g: 60, fats_g: 12 },
      ingredients: [
        { name: "Blanc de poulet", quantity: 180, unit: "g" },
        { name: "Légumes", quantity: 350, unit: "g" },
        { name: "Bouillon", quantity: 600, unit: "ml" },
        { name: "Riz complet (option)", quantity: 50, unit: "g" },
        { name: "Huile d'olive", quantity: 1, unit: "càs" },
      ],
      recipe:
        "1. Faire revenir légumes dans l'huile.\n2. Ajouter poulet + bouillon.\n3. Laisser mijoter 15–20 min.\n4. Ajouter riz complet si tu veux.\n5. Assaisonner et servir.",
    },
    snack: {
      name: "Fruits Secs & Mélange Noix",
      prep_time_minutes: 5,
      difficulty: "Facile",
      macros: { calories: 320, proteins_g: 15, carbs_g: 35, fats_g: 18 },
      ingredients: [
        { name: "Amandes", quantity: 20, unit: "g" },
        { name: "Noix", quantity: 15, unit: "g" },
        { name: "Fruits secs", quantity: 40, unit: "g" },
      ],
      recipe:
        "1. Mettre amandes + noix dans un bol.\n2. Ajouter les fruits secs.\n3. Mélanger et grignoter lentement.",
    },
  },
];

function getMealsForTemplateDay(templateDayIndex) {
  const t = MEAL_TEMPLATES[templateDayIndex % MEAL_TEMPLATES.length];
  return [
    {
      type: "breakfast",
      name: t.breakfast.name,
      ingredients: t.breakfast.ingredients,
      recipe: t.breakfast.recipe,
      prep_time_minutes: t.breakfast.prep_time_minutes,
      difficulty: t.breakfast.difficulty,
      macros: t.breakfast.macros,
    },
    {
      type: "lunch",
      name: t.lunch.name,
      ingredients: t.lunch.ingredients,
      recipe: t.lunch.recipe,
      prep_time_minutes: t.lunch.prep_time_minutes,
      difficulty: t.lunch.difficulty,
      macros: t.lunch.macros,
    },
    {
      type: "dinner",
      name: t.dinner.name,
      ingredients: t.dinner.ingredients,
      recipe: t.dinner.recipe,
      prep_time_minutes: t.dinner.prep_time_minutes,
      difficulty: t.dinner.difficulty,
      macros: t.dinner.macros,
    },
    {
      type: "snack",
      name: t.snack.name,
      ingredients: t.snack.ingredients,
      recipe: t.snack.recipe,
      prep_time_minutes: t.snack.prep_time_minutes,
      difficulty: t.snack.difficulty,
      macros: t.snack.macros,
    },
  ];
}

async function seedWorkouts() {
  let inserted = 0;
  for (let day = 1; day <= 180; day++) {
    for (const goalType of ["crossfit", "muscle", "mixed"]) {
      const { phase, name, is_rest_day, exercises } = getWorkoutForDay(day, goalType);
      const res = await pool.query(
        `INSERT INTO workouts (day_number, phase, goal_type, name, is_rest_day, exercises)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (day_number, goal_type) DO UPDATE SET
           phase = EXCLUDED.phase,
           name = EXCLUDED.name,
           is_rest_day = EXCLUDED.is_rest_day,
           exercises = EXCLUDED.exercises`,
        [day, phase, goalType, name, is_rest_day, JSON.stringify(exercises)]
      );
      inserted += res.rowCount ?? 0;
    }
    if (day % 20 === 0 || day === 180) console.log(`Seeding day ${day} (3 programmes)...`);
  }
  return inserted;
}

async function seedMeals() {
  let inserted = 0;
  for (let day = 1; day <= 180; day++) {
    const templateIndex = (day - 1) % 7;
    const meals = getMealsForTemplateDay(templateIndex);
    for (const m of meals) {
      const res = await pool.query(
        `INSERT INTO meals (day_number, type, name, ingredients, recipe, prep_time_minutes, difficulty, macros)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb)
         ON CONFLICT (day_number, type) DO UPDATE SET
           name = EXCLUDED.name,
           ingredients = EXCLUDED.ingredients,
           recipe = EXCLUDED.recipe,
           prep_time_minutes = EXCLUDED.prep_time_minutes,
           difficulty = EXCLUDED.difficulty,
           macros = EXCLUDED.macros`,
        [
          day,
          m.type,
          m.name,
          JSON.stringify(m.ingredients),
          m.recipe ?? null,
          m.prep_time_minutes ?? 10,
          m.difficulty ?? "Facile",
          JSON.stringify(m.macros ?? {}),
        ]
      );
      inserted += res.rowCount ?? 0;
    }
    if (day % 20 === 0 || day === 180) console.log(`Seeding day ${day}...`);
  }
  return inserted;
}

async function run() {
  console.log("Seeding workouts...");
  const workoutCount = await seedWorkouts();
  console.log("Seeding meals...");
  const mealCount = await seedMeals();
  console.log(`\n✅ Seed complete! ${workoutCount} workouts, ${mealCount} meals inserted`);
  const isStandalone = require.main === module;
  if (isStandalone) await pool.end();
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { run };
