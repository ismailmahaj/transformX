import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { BottomNav } from "../components/BottomNav";

interface ProfileUser {
  id: string;
  email: string;
  name: string | null;
  height_cm: number | null;
  weight_start_kg: number | null;
  goal: string | null;
  created_at: string;
}

interface ProfileStats {
  current_day: number;
  phase: number;
  workouts_completed: number;
  streak_current: number;
  xp_total: number;
  meals_days_logged: number;
  current_weight_kg: number | null;
  level: { label: string };
}

interface ProfileResponse {
  user: ProfileUser;
  stats: ProfileStats;
}

type GoalOption = "Perdre du gras" | "Prendre du muscle" | "Les deux";

const goalWeightMap: Record<GoalOption, number> = {
  "Perdre du gras": 67,
  "Prendre du muscle": 74,
  "Les deux": 70,
};

function getInitials(name: string | null, email: string) {
  const raw = (name ?? "").trim();
  if (raw) {
    const parts = raw.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : raw[1] ?? "";
    return (a + b).toUpperCase();
  }
  return (email[0] ?? "").toUpperCase();
}

function formatDateFr(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function computeProgressPct(start: number, current: number, goal: number) {
  if (start === goal) return 100;
  if (goal < start) {
    const denom = start - goal;
    return Math.max(0, Math.min(100, ((start - current) / denom) * 100));
  }
  const denom = goal - start;
  return Math.max(0, Math.min(100, ((current - start) / denom) * 100));
}

export default function Profile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuthStore();

  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await api.get<ProfileResponse>("/users/profile");
      return data;
    },
  });

  const [formName, setFormName] = useState("");
  const [formHeight, setFormHeight] = useState<number | "">("");
  const [formStartWeight, setFormStartWeight] = useState<number | "">("");
  const [formGoal, setFormGoal] = useState<GoalOption>("Perdre du gras");
  const [formExperience, setFormExperience] = useState<"Débutant" | "Intermédiaire" | "Avancé">("Débutant");

  useEffect(() => {
    const u = profileQuery.data?.user;
    const s = profileQuery.data?.stats;
    if (!u || !s) return;

    setFormName(u.name ?? "");
    setFormHeight(u.height_cm ?? "");
    setFormStartWeight(u.weight_start_kg ?? "");

    const g = u.goal as GoalOption | null;
    if (g === "Perdre du gras" || g === "Prendre du muscle" || g === "Les deux") setFormGoal(g);

    const xp = s.xp_total ?? 0;
    if (xp >= 1500) setFormExperience("Avancé");
    else if (xp >= 500) setFormExperience("Intermédiaire");
    else setFormExperience("Débutant");
  }, [profileQuery.data?.user, profileQuery.data?.stats]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      height_cm: number | null;
      weight_start_kg: number | null;
      goal: GoalOption;
      experience_level: "Débutant" | "Intermédiaire" | "Avancé";
    }) => api.put("/users/profile", payload),
    onSuccess: async () => {
      setSuccessToast("Profil mis à jour ✅");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setTimeout(() => setSuccessToast(null), 2500);
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => api.post("/users/reset-progress"),
    onSuccess: async () => {
      setResetModalOpen(false);
      setSuccessToast("Progression réinitialisée ✅");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setTimeout(() => setSuccessToast(null), 2500);
    },
  });

  const profile = profileQuery.data;
  const user = profile?.user ?? null;
  const stats = profile?.stats ?? null;

  const currentDay = stats?.current_day ?? 1;
  const phase = stats?.phase ?? 1;
  const workoutsCompleted = stats?.workouts_completed ?? 0;
  const currentStreak = stats?.streak_current ?? 0;
  const xpTotal = stats?.xp_total ?? 0;
  const mealsDaysLogged = stats?.meals_days_logged ?? 0;
  const levelLabel = stats?.level?.label ?? "Débutant 🌱";

  const startWeight = Number(user?.weight_start_kg ?? authUser?.weight_start_kg ?? 81.9);
  const currentWeight = stats?.current_weight_kg != null ? Number(stats.current_weight_kg) : startWeight;

  const goal = (user?.goal as GoalOption | null) ?? formGoal;
  const goalWeight = goalWeightMap[goal ?? formGoal] ?? 67;
  const progressPct = computeProgressPct(startWeight, currentWeight, goalWeight);

  const estimatedCompletionDate = useMemo(() => {
    const createdAt = user?.created_at ?? authUser?.created_at;
    if (!createdAt) return null;
    const d = new Date(createdAt);
    d.setUTCDate(d.getUTCDate() + 180);
    return d;
  }, [user?.created_at, authUser?.created_at]);

  const badges = useMemo(
    () => [
      { key: "firstWorkout", label: "Premier Entraînement 🏆", earned: workoutsCompleted >= 1 },
      { key: "streak7", label: "Série de 7 jours 🔥", earned: currentStreak >= 7 },
      { key: "phase1", label: "Phase 1 Complétée ⭐", earned: currentDay >= 28 },
      { key: "sessions30", label: "30 Séances 💪", earned: workoutsCompleted >= 30 },
      { key: "nutrition7", label: "Guerrier de la Nutrition 🥗", earned: mealsDaysLogged >= 7 },
    ],
    [workoutsCompleted, currentStreak, currentDay, mealsDaysLogged]
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex items-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors"
              aria-label="Retour"
            >
              ←
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">Mon Profil</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {successToast && (
          <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-3 text-green-400 text-sm">
            {successToast}
          </div>
        )}

        {profileQuery.isLoading && (
          <div className="space-y-4">
            <div className="h-24 rounded-xl bg-gray-800" />
            <div className="h-64 rounded-xl bg-gray-800" />
          </div>
        )}

        {profileQuery.error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-red-400 text-sm">
            Impossible de charger le profil.
          </div>
        )}

        {user && stats && (
          <>
            {/* Avatar */}
            <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">
                  {getInitials(user.name, user.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold truncate">{user.name ?? "Utilisateur"}</p>
                  <p className="text-gray-500 text-sm truncate">{user.email}</p>
                </div>
              </div>
            </section>

            {/* Stats summary */}
            <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <h2 className="text-base font-semibold text-white mb-3">Résumé</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Jour actuel</p>
                  <p className="text-white font-semibold mt-1">
                    {currentDay} / 180
                  </p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Phase</p>
                  <p className="text-white font-semibold mt-1">
                    {phase} / 3
                  </p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Séances complétées</p>
                  <p className="text-white font-semibold mt-1">{workoutsCompleted}</p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Streak actuel</p>
                  <p className="text-white font-semibold mt-1">{currentStreak} jours</p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 col-span-2 sm:col-span-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">XP total</p>
                  <p className="text-white font-semibold mt-1">{xpTotal.toLocaleString("fr-FR")}</p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 col-span-2 sm:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Niveau</p>
                  <p className="text-white font-semibold mt-1">{levelLabel}</p>
                </div>
              </div>
            </section>

            {/* Personal info */}
            <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <h2 className="text-base font-semibold text-white mb-3">Informations Personnelles</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMutation.mutate({
                    name: formName,
                    height_cm: formHeight === "" ? null : Number(formHeight),
                    weight_start_kg: formStartWeight === "" ? null : Number(formStartWeight),
                    goal: formGoal,
                    experience_level: formExperience,
                  });
                }}
                className="space-y-4"
              >
                <label className="block">
                  <span className="text-sm text-gray-300">Prénom</span>
                  <input
                    className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ton prénom"
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-300">Email</span>
                  <input className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-gray-500" value={user.email} readOnly />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-300">Taille (cm)</span>
                  <input
                    type="number"
                    step={1}
                    className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white"
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-300">Poids de départ (kg)</span>
                  <input
                    type="number"
                    step={0.1}
                    className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white"
                    value={formStartWeight}
                    onChange={(e) => setFormStartWeight(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </label>

                <label className="block">
                  <span className="text-sm text-gray-300">Objectif</span>
                  <select
                    className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white"
                    value={formGoal}
                    onChange={(e) => setFormGoal(e.target.value as GoalOption)}
                  >
                    <option value="Perdre du gras">Perdre du gras</option>
                    <option value="Prendre du muscle">Prendre du muscle</option>
                    <option value="Les deux">Les deux</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-gray-300">Niveau d&apos;expérience</span>
                  <select
                    className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white"
                    value={formExperience}
                    onChange={(e) => setFormExperience(e.target.value as typeof formExperience)}
                  >
                    <option value="Débutant">Débutant</option>
                    <option value="Intermédiaire">Intermédiaire</option>
                    <option value="Avancé">Avancé</option>
                  </select>
                </label>

                <button type="submit" disabled={updateMutation.isPending} className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
              </form>
            </section>

            {/* Objective progress */}
            <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <h2 className="text-base font-semibold text-white mb-3">Objectif Transformation</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Départ</p>
                  <p className="text-white font-semibold mt-1">{startWeight.toFixed(1)} kg</p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Actuel</p>
                  <p className="text-white font-semibold mt-1">{currentWeight.toFixed(1)} kg</p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Objectif</p>
                  <p className="text-white font-semibold mt-1">{goalWeight.toFixed(0)} kg</p>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-[#1a1a1a] overflow-hidden mb-2">
                <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-sm text-gray-500 mb-3">{Math.round(progressPct)}% vers l&apos;objectif</p>
              <p className="text-sm text-gray-400">
                Date estimée :{" "}
                <span className="text-white font-medium">{estimatedCompletionDate ? formatDateFr(estimatedCompletionDate) : "—"}</span>
              </p>
            </section>

            {/* App settings */}
            <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <h2 className="text-base font-semibold text-white mb-3">Paramètres App</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-medium">Mode sombre</p>
                    <p className="text-xs text-gray-500">Toujours activé</p>
                  </div>
                  <input type="checkbox" checked={true} disabled readOnly className="h-5 w-5 accent-primary" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-medium">Notifications</p>
                    <p className="text-xs text-gray-500">UI seulement</p>
                  </div>
                  <input type="checkbox" defaultChecked={false} readOnly className="h-5 w-5 accent-primary" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-medium">Rappel quotidien</p>
                    <p className="text-xs text-gray-500">UI seulement</p>
                  </div>
                  <input type="checkbox" defaultChecked readOnly className="h-5 w-5 accent-primary" />
                </div>
                <label className="block">
                  <span className="text-sm text-gray-300">Heure de rappel</span>
                  <select className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white" defaultValue="09:00">
                    <option value="07:30">07:30</option>
                    <option value="09:00">09:00</option>
                    <option value="12:00">12:00</option>
                    <option value="18:00">18:00</option>
                  </select>
                </label>
              </div>
            </section>

            {/* Badges */}
            <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <h2 className="text-base font-semibold text-white mb-3">Badges & Achievements</h2>
              <div className="grid grid-cols-2 gap-3">
                {badges.map((b) => (
                  <div
                    key={b.key}
                    className={`rounded-xl border p-3 ${
                      b.earned ? "border-primary/40 bg-primary/10" : "border-[#1a1a1a] bg-[#0a0a0a] text-gray-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{b.earned ? "✓" : "🔒"}</span>
                      <p className="font-semibold text-sm">{b.label}</p>
                    </div>
                    <p className={`text-xs mt-2 ${b.earned ? "text-gray-200" : "text-gray-500"}`}>
                      {b.earned ? "Obtenu" : "Verrouillé"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {authUser?.is_admin && (
              <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
                <Link
                  to="/admin"
                  className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-primary hover:bg-primary/20 transition-colors"
                >
                  <span className="font-semibold">Admin Dashboard</span>
                  <span>→</span>
                </Link>
              </section>
            )}

            {/* Danger zone */}
            <section className="rounded-xl border border-red-500/30 bg-red-950/10 p-4">
              <h2 className="text-base font-semibold text-red-300 mb-3">Zone de danger</h2>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/20 transition-colors"
                >
                  Réinitialiser la progression
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/auth");
                  }}
                  className="w-full py-3 rounded-xl bg-transparent text-gray-200 border border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors"
                >
                  Se déconnecter
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav />

      {resetModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#0f0f0f] p-5">
            <h3 className="text-white font-bold text-lg mb-2">Confirmer la réinitialisation</h3>
            <p className="text-gray-400 text-sm mb-4">
              Cette action supprimera tes logs (entraînements, nutrition, photos) et remettra ta progression à zéro.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-[#1a1a1a] text-gray-200 hover:bg-[#232323] transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25 disabled:opacity-50 transition-colors"
              >
                {resetMutation.isPending ? "Réinitialisation..." : "Réinitialiser"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
