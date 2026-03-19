import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { getCurrentDay, getPhase } from "../lib/dayUtils";
import { WeightChart } from "../components/WeightChart";
import { MeasurementsForm, type MeasurementFields } from "../components/MeasurementsForm";
import { PhotoUpload, type ProgressPhoto } from "../components/PhotoUpload";
import { ProgressStats } from "../components/ProgressStats";
import { BottomNav } from "../components/BottomNav";
import type { ProgressEntry, UserLog, Streak } from "../types/api";

const START_WEIGHT = 81.9;
const GOAL_WEIGHT = 67;

interface ProgressResponse {
  progress: ProgressEntry[];
}
interface PhotosResponse {
  photos: ProgressPhoto[];
}
interface LogsResponse {
  logs: UserLog[];
}
interface StreakResponse {
  streak: Streak;
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function motivationalMessage(day: number, lostKg: number) {
  const phase = getPhase(day);
  if (lostKg >= 6) return "Incroyable constance. Continue comme ça, tu es en train de te transformer.";
  if (lostKg >= 3) return "Très bon rythme. Concentre-toi sur les protéines et la régularité à l'entraînement.";
  if (phase === 1) return "Phase 1 = fondations. Log chaque jour et vise la constance, pas la perfection.";
  if (phase === 2) return "Phase 2 = puissance + sécher. Reste strict sur le sommeil et l'hydratation.";
  return "Phase 3 = finition. Mets l'intensité, garde la technique, et fais confiance au process.";
}

export default function Progress() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const day = getCurrentDay(user?.created_at);

  const [weightInput, setWeightInput] = useState<number | "">("");
  const [success, setSuccess] = useState<string | null>(null);

  const progressQuery = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const { data } = await api.get<ProgressResponse>("/progress");
      return data.progress;
    },
  });

  const photosQuery = useQuery({
    queryKey: ["progress", "photos"],
    queryFn: async () => {
      const { data } = await api.get<PhotosResponse>("/progress/photos");
      return data.photos;
    },
  });

  const logsQuery = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const { data } = await api.get<LogsResponse>("/logs");
      return data.logs;
    },
  });

  const streakQuery = useQuery({
    queryKey: ["streaks"],
    queryFn: async () => {
      const { data } = await api.get<StreakResponse>("/streaks");
      return data.streak;
    },
  });

  const saveProgressMutation = useMutation({
    mutationFn: (body: { weight_kg?: number; measurements?: MeasurementFields }) =>
      api.post("/progress", body),
    onSuccess: () => {
      setSuccess("Succès : données enregistrées.");
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      setTimeout(() => setSuccess(null), 2500);
    },
  });

  const progress = progressQuery.data ?? [];
  const sorted = useMemo(
    () => [...progress].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [progress]
  );
  const last = sorted.length ? sorted[sorted.length - 1] : null;
  const lastWeight = last?.weight_kg ?? null;
  const lastMeasurements = (last?.measurements as Record<string, number> | undefined) ?? null;

  const chartData = useMemo(
    () =>
      sorted
        .filter((p) => typeof p.weight_kg === "number")
        .map((p) => ({ date: p.date, weight: Number(p.weight_kg) })),
    [sorted]
  );

  const last5 = useMemo(() => {
    return [...sorted]
      .filter((p) => typeof p.weight_kg === "number")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sorted]);

  const logs = logsQuery.data ?? [];
  const workoutsCompleted = logs.filter((l) => l.workout_done).length;
  const xpEarned = logs.reduce((sum, l) => sum + (l.xp_earned ?? 0), 0);
  const currentStreak = streakQuery.data?.current_streak ?? 0;

  const heightCm = user?.height_cm ?? 170;
  const currentWeightForStats = lastWeight ?? START_WEIGHT;
  const lostKg = START_WEIGHT - currentWeightForStats;

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weightInput === "") return;
    await saveProgressMutation.mutateAsync({ weight_kg: Number(weightInput) });
    setWeightInput("");
  };

  const handleSaveMeasurements = async (measurements: MeasurementFields) => {
    await saveProgressMutation.mutateAsync({ measurements });
  };

  const photos = photosQuery.data ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">Ma Progression</h1>
            <p className="text-sm text-gray-500">Jour {day} / 180</p>
          </div>
          <Link to="/dashboard" className="text-gray-400 hover:text-primary transition-colors">
            Tableau de bord
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
        <div className="rounded-xl border border-[#f97316]/30 bg-[#f97316]/10 p-4">
          <Link
            to="/body-analysis"
            className="block text-center text-sm font-semibold text-[#f97316] hover:opacity-90 transition-opacity"
          >
            Analyse IA 📸
          </Link>
          <p className="mt-1 text-center text-xs text-gray-500">Analyse corporelle avec Claude Vision</p>
        </div>

        {success && (
          <div className="rounded-xl border border-green-500/40 bg-green-950/20 p-3 text-green-400 text-sm">
            {success}
          </div>
        )}

        {(progressQuery.isLoading || logsQuery.isLoading || streakQuery.isLoading) && (
          <div className="animate-pulse space-y-4">
            <div className="h-28 rounded-xl bg-gray-800" />
            <div className="h-64 rounded-xl bg-gray-800" />
            <div className="h-48 rounded-xl bg-gray-800" />
          </div>
        )}

        {(progressQuery.error || logsQuery.error || streakQuery.error) && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-red-400 text-sm">
            Erreur : impossible de charger ta progression.
          </div>
        )}

        {/* Stats */}        
        {!progressQuery.isLoading && !progressQuery.error && (
          <section className="space-y-4">
            <ProgressStats
              startWeight={START_WEIGHT}
              currentWeight={lastWeight}
              heightCm={heightCm}
              day={day}
            />
          </section>
        )}

        {/* Weight section */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Poids</h2>
              <p className="text-sm text-gray-500">Suivi au fil du temps</p>
            </div>
            <span className="text-sm text-gray-500">{isoToday()}</span>
          </div>

          <WeightChart data={chartData} startWeight={START_WEIGHT} goalWeight={GOAL_WEIGHT} />

          <form onSubmit={handleSaveWeight} className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
              <label className="flex-1">
                <span className="block text-sm text-gray-300 mb-1">Poids (kg)</span>
                <input
                  type="number"
                  step={0.1}
                  inputMode="decimal"
                  min={30}
                  max={250}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white placeholder-gray-600"
                  placeholder="81,9"
                />
              </label>
              <button
                type="submit"
                disabled={saveProgressMutation.isPending || weightInput === ""}
                className="rounded-lg bg-primary px-5 py-2.5 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                Enregistrer le poids
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">5 dernières entrées</p>
              {!last5.length ? (
                <p className="text-gray-500 text-sm">Aucune entrée pour le moment.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {last5.map((p) => (
                    <li key={p.id} className="flex justify-between text-gray-300">
                      <span className="text-gray-500">{p.date}</span>
                      <span className="text-white font-medium">{Number(p.weight_kg).toFixed(1)} kg</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </form>
        </section>

        {/* Measurements */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Mensurations</h2>
          <MeasurementsForm
            lastMeasurements={lastMeasurements}
            onSubmit={handleSaveMeasurements}
            isLoading={saveProgressMutation.isPending}
          />
        </section>

        {/* Photos */}
        <section className="space-y-3">
          <PhotoUpload
            photos={photos}
            onUploaded={() => queryClient.invalidateQueries({ queryKey: ["progress", "photos"] })}
          />
        </section>

        {/* Summary */}
        <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
          <h2 className="text-base font-semibold text-white mb-3">Résumé</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Séances</p>
              <p className="text-white font-semibold mt-1">{workoutsCompleted} / 180</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Série</p>
              <p className="text-white font-semibold mt-1">{currentStreak} jours</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">XP</p>
              <p className="text-white font-semibold mt-1">{xpEarned.toLocaleString("fr-FR")}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Phase</p>
              <p className="text-white font-semibold mt-1">{getPhase(day)} / 3</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm">{motivationalMessage(day, lostKg)}</p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
