import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { OnboardingProgress } from "../components/OnboardingProgress";

type GoalOption = "Perdre du gras" | "Prendre du muscle" | "Les deux";
type ExperienceOption = "Débutant" | "Intermédiaire" | "Avancé";

const goalToProgram: Record<
  GoalOption,
  { programText: string; calories: number; proteins: number; badge: string }
> = {
  "Perdre du gras": { programText: "CrossFit 3x/semaine", calories: 1800, proteins: 160, badge: "Perdre du gras" },
  "Prendre du muscle": { programText: "Musculation 4x/semaine", calories: 2500, proteins: 180, badge: "Prendre du muscle" },
  "Les deux": { programText: "Mix 4x/semaine", calories: 2100, proteins: 170, badge: "Recomposition" },
};

function clampNumber(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function CardButton(props: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  description: string;
  ideal: string;
}) {
  const { selected, onClick, icon, title, description, ideal } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-all duration-200 ${
        selected
          ? "border-primary/60 bg-primary/10 shadow-[0_0_0_4px_rgba(249,115,22,0.10)]"
          : "border-[#1a1a1a] bg-[#0f0f0f] hover:border-[#2a2a2a]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl leading-none">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-white">{title}</div>
          <div className="text-sm text-gray-300 mt-1">{description}</div>
          <div className="text-xs text-gray-500 mt-2">Idéal pour : {ideal}</div>
        </div>
      </div>
    </button>
  );
}

type WorkType = "bureau" | "domicile" | "variable" | "nuit" | "sans_emploi";
type PreferredWorkoutTime = "matin" | "midi" | "soir";

export default function Onboarding() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  const [heightCm, setHeightCm] = useState<number | "">("");
  const [weightKg, setWeightKg] = useState<number | "">("");
  const [goal, setGoal] = useState<GoalOption | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceOption | null>(null);
  const [dietaryProfile, setDietaryProfile] = useState<string[]>(["standard"]);
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [workType, setWorkType] = useState<WorkType>("bureau");
  const [preferredWorkoutTime, setPreferredWorkoutTime] = useState<PreferredWorkoutTime>("soir");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = user?.name ?? user?.email ?? "toi";

  const isProfileComplete = Boolean(
    user?.height_cm != null && user?.weight_start_kg != null && user?.goal != null
  );

  const program = goal ? goalToProgram[goal] : null;

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/auth", { replace: true });
      return;
    }

    if (isProfileComplete) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isProfileComplete, navigate, user]);

  const goNext = () => {
    setError(null);

    if (step === 2) {
      if (heightCm === "" || weightKg === "") {
        setError("Remplis la taille et le poids pour continuer.");
        return;
      }
      if (typeof heightCm !== "number" || typeof weightKg !== "number") return;
      const h = heightCm;
      const w = weightKg;
      if (h < 140 || h > 220) {
        setError("La taille doit être entre 140 et 220 cm.");
        return;
      }
      if (w < 40 || w > 200) {
        setError("Le poids doit être entre 40 et 200 kg.");
        return;
      }
      setHeightCm(Math.round(clampNumber(h, 140, 220)));
      setWeightKg(clampNumber(w, 40, 200));
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!goal) {
        setError("Choisis un objectif pour continuer.");
        return;
      }
      setStep(4);
      return;
    }
  };

  const goBack = () => {
    setError(null);
    setStep((s) => (s === 1 ? 1 : ((s - 1) as 1 | 2 | 3 | 4 | 5 | 6)));
  };

  const canSubmit =
    heightCm !== "" &&
    weightKg !== "" &&
    goal != null &&
    experienceLevel != null &&
    dietaryProfile.length > 0 &&
    typeof heightCm === "number" &&
    typeof weightKg === "number";

  const dietaryOptions: Array<{ key: string; icon: string; title: string; description: string }> = [
    { key: "diabetique", icon: "🩺", title: "Diabétique", description: "Programme low glycémique" },
    { key: "vegetarien", icon: "🌱", title: "Végétarien", description: "Sans viande" },
    { key: "vegan", icon: "🌿", title: "Vegan", description: "Sans produits animaux" },
    { key: "sans_gluten", icon: "🌾", title: "Sans Gluten", description: "Intolérance au gluten" },
    { key: "sans_lactose", icon: "🥛", title: "Sans Lactose", description: "Intolérance au lactose" },
    { key: "hypertension", icon: "💊", title: "Hypertension", description: "Faible en sel" },
    { key: "prise_de_masse", icon: "💪", title: "Prise de masse", description: "Recettes hypercaloriques" },
    { key: "seche", icon: "🔥", title: "Sèche", description: "Low carb, haute protéine" },
    { key: "standard", icon: "✅", title: "Aucune restriction", description: "Programme standard" },
  ];

  const toggleDietary = (key: string) => {
    setDietaryProfile((prev) => {
      if (key === "standard") return ["standard"];

      const withoutStandard = prev.filter((k) => k !== "standard");
      const exists = withoutStandard.includes(key);
      const next = exists ? withoutStandard.filter((k) => k !== key) : [...withoutStandard, key];
      return next.length ? next : ["standard"];
    });
  };

  const handleSubmit = async () => {
    if (!user || !isAuthenticated) {
      navigate("/auth");
      return;
    }

    if (!canSubmit || !goal || !experienceLevel || typeof heightCm !== "number" || typeof weightKg !== "number") {
      setError("Complète toutes les étapes avant de lancer le programme.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        height_cm: heightCm,
        weight_start_kg: weightKg,
        goal,
        experience_level: experienceLevel,
        dietary_profile: dietaryProfile,
        wake_time: wakeTime,
        sleep_time: sleepTime,
        work_type: workType,
        preferred_workout_time: preferredWorkoutTime,
      };

      const { data } = await api.put<{ user: unknown }>("/users/profile", payload);
      const updatedUser = (data?.user ?? null) as typeof user;
      if (updatedUser) setUser(updatedUser);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setError(message || "Impossible de créer ton programme. Réessaie plus tard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-[480px] pb-8">
        <div className="mt-6">
          <OnboardingProgress step={step} total={6} />
        </div>

        <div className="mt-6 overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${(step - 1) * 100}%)` }}
          >
            {/* Step 1 */}
            <div className="min-w-full">
              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
                <div className="text-sm text-gray-500 text-center">Bienvenue</div>
                <h2 className="text-2xl font-bold text-white text-center mt-2">
                  Bienvenue dans ton programme de transformation ! 💪
                </h2>
                <p className="text-sm text-gray-300 text-center mt-2">
                  On va personnaliser ton programme en 6 étapes
                </p>

                <div className="mt-6 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4">
                  <div className="text-xs text-gray-500">Utilisateur</div>
                  <div className="text-base font-semibold text-white mt-1 text-center">{userName}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(2);
                  }}
                  className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-white font-semibold hover:opacity-90 transition-opacity"
                >
                  Commencer →
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="min-w-full px-0">
              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
                <h2 className="text-xl font-bold text-white">Tes mensurations</h2>
                <p className="text-sm text-gray-300 mt-1">Ces infos permettent de calibrer ton programme.</p>

                {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm text-gray-400">Taille (cm)</span>
                    <input
                      type="number"
                      min={140}
                      max={220}
                      step={1}
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value === "" ? "" : Number(e.target.value))}
                      className="mt-2 w-full rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-white placeholder-gray-600 focus:border-primary focus:outline-none"
                      placeholder="ex: 170"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm text-gray-400">Poids actuel (kg)</span>
                    <input
                      type="number"
                      min={40}
                      max={200}
                      step={0.1}
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value === "" ? "" : Number(e.target.value))}
                      className="mt-2 w-full rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 text-white placeholder-gray-600 focus:border-primary focus:outline-none"
                      placeholder="ex: 81.9"
                      required
                    />
                  </label>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-3 text-white font-semibold hover:bg-[#111] transition-colors"
                    disabled={loading}
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 rounded-xl bg-primary px-3 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    disabled={loading}
                  >
                    Continuer →
                  </button>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="min-w-full">
              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
                <h2 className="text-xl font-bold text-white">Quel est ton objectif ?</h2>
                <p className="text-sm text-gray-300 mt-1">Choisis la direction. On s’occupe du reste.</p>

                {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}

                <div className="mt-5 space-y-3">
                  <CardButton
                    selected={goal === "Perdre du gras"}
                    onClick={() => {
                      setError(null);
                      setGoal("Perdre du gras");
                    }}
                    icon="🔥"
                    title="Perdre du gras"
                    description="Brûler les graisses et révéler tes muscles"
                    ideal="IMC > 25, ventre à affiner"
                  />
                  <CardButton
                    selected={goal === "Prendre du muscle"}
                    onClick={() => {
                      setError(null);
                      setGoal("Prendre du muscle");
                    }}
                    icon="💪"
                    title="Prendre du muscle"
                    description="Gagner en masse et en force"
                    ideal="Déjà mince, veux du volume"
                  />
                  <CardButton
                    selected={goal === "Les deux"}
                    onClick={() => {
                      setError(null);
                      setGoal("Les deux");
                    }}
                    icon="⚡"
                    title="Les deux"
                    description="Recomposition corporelle complète"
                    ideal="Perdre du gras ET gagner du muscle"
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-3 text-white font-semibold hover:bg-[#111] transition-colors"
                    disabled={loading}
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 rounded-xl bg-primary px-3 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    disabled={loading}
                  >
                    Continuer →
                  </button>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="min-w-full">
              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
                <h2 className="text-xl font-bold text-white">Ton niveau d'expérience</h2>
                <p className="text-sm text-gray-300 mt-1">On adapte le rythme pour que tu progresses sans te cramer.</p>

                {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}

                <div className="mt-5 space-y-3">
                  <CardButton
                    selected={experienceLevel === "Débutant"}
                    onClick={() => {
                      setError(null);
                      setExperienceLevel("Débutant");
                    }}
                    icon="🌱"
                    title="Débutant"
                    description="Moins de 6 mois d'entraînement"
                    ideal="Revenir aux fondamentaux et construire une base solide"
                  />
                  <CardButton
                    selected={experienceLevel === "Intermédiaire"}
                    onClick={() => {
                      setError(null);
                      setExperienceLevel("Intermédiaire");
                    }}
                    icon="💪"
                    title="Intermédiaire"
                    description="6 mois à 2 ans d'entraînement"
                    ideal="Stabiliser la technique et augmenter l'intensité"
                  />
                  <CardButton
                    selected={experienceLevel === "Avancé"}
                    onClick={() => {
                      setError(null);
                      setExperienceLevel("Avancé");
                    }}
                    icon="🔥"
                    title="Avancé"
                    description="Plus de 2 ans d'entraînement"
                    ideal="Optimiser le volume et la progression"
                  />
                </div>

                <div className="mt-5 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Résumé du programme</div>
                  <div className="text-base font-semibold text-white mt-2">
                    Ton programme: {program?.programText ?? "—"}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[#1a1a1a] bg-[#0f0f0f] p-3">
                      <div className="text-xs text-gray-500">Calories cibles</div>
                      <div className="text-lg font-bold text-white mt-1">{program?.calories ?? "—"} kcal</div>
                    </div>
                    <div className="rounded-lg border border-[#1a1a1a] bg-[#0f0f0f] p-3">
                      <div className="text-xs text-gray-500">Protéines cibles</div>
                      <div className="text-lg font-bold text-white mt-1">{program?.proteins ?? "—"} g</div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!experienceLevel) {
                      setError("Choisis ton niveau pour continuer.");
                      return;
                    }
                    setError(null);
                    setStep(5);
                  }}
                  disabled={loading || !experienceLevel}
                  className="mt-6 w-full rounded-2xl bg-primary px-4 py-3 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {loading ? "Chargement..." : "Choisir tes restrictions →"}
                </button>

                {isProfileComplete ? (
                  <div className="mt-3 text-xs text-gray-500 text-center">
                    Tu es déjà configuré. On te ramène au tableau de bord…
                  </div>
                ) : null}
              </div>
            </div>

            {/* Step 5 */}
            <div className="min-w-full px-0">
              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
                <h2 className="text-xl font-bold text-white">
                  As-tu des restrictions alimentaires ?
                </h2>
                <p className="text-sm text-gray-300 mt-1">Pour personnaliser tes recettes</p>

                {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {dietaryOptions.map((opt) => {
                    const selected = dietaryProfile.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setError(null);
                          toggleDietary(opt.key);
                        }}
                        className={`text-left rounded-2xl border p-3 transition-all duration-200 ${
                          selected
                            ? "border-primary/60 bg-primary/10 shadow-[0_0_0_4px_rgba(249,115,22,0.10)]"
                            : "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#2a2a2a]"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="text-2xl leading-none">{opt.icon}</div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{opt.title}</div>
                            <div className="text-xs text-gray-300 mt-1">{opt.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-3 text-white font-semibold hover:bg-[#111] transition-colors"
                    disabled={loading}
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setStep(6);
                    }}
                    disabled={loading || !canSubmit}
                    className="flex-1 rounded-xl bg-primary px-3 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? "Chargement..." : "Organiser ta journée →"}
                  </button>
                </div>
              </div>
            </div>

            {/* Step 6 */}
            <div className="min-w-full px-0">
              <div className="rounded-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
                <h2 className="text-xl font-bold text-white">Tes horaires de vie</h2>
                <p className="text-sm text-gray-300 mt-1">
                  Pour planifier tes entraînements au meilleur moment
                </p>

                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm text-gray-400">Heure de réveil</span>
                      <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="mt-2 w-full rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-white" />
                    </label>
                    <label className="block">
                      <span className="text-sm text-gray-400">Heure de coucher</span>
                      <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className="mt-2 w-full rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-white" />
                    </label>
                  </div>

                  <div>
                    <span className="text-sm text-gray-400">Type de travail</span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {[
                        { key: "bureau", label: "🏢 Bureau" },
                        { key: "domicile", label: "🏠 Domicile" },
                        { key: "variable", label: "🔄 Variable" },
                        { key: "nuit", label: "🌙 Nuit" },
                        { key: "sans_emploi", label: "🎯 Sans emploi" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setWorkType(opt.key as WorkType)}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            workType === opt.key ? "border-primary bg-primary/10 text-primary" : "border-[#1a1a1a] text-gray-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm text-gray-400">Préférence entraînement</span>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {[
                        { key: "matin", label: "🌅 Matin" },
                        { key: "midi", label: "☀️ Midi" },
                        { key: "soir", label: "🌆 Soir" },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setPreferredWorkoutTime(opt.key as PreferredWorkoutTime)}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            preferredWorkoutTime === opt.key ? "border-primary bg-primary/10 text-primary" : "border-[#1a1a1a] text-gray-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-3 text-white font-semibold hover:bg-[#111] transition-colors"
                    disabled={loading}
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      handleSubmit();
                    }}
                    disabled={loading || !canSubmit}
                    className="flex-1 rounded-xl bg-primary px-3 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? "Lancement..." : "Lancer mon programme 🚀"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 text-xs text-gray-500 text-center" />
      </div>
    </div>
  );
}

