import { useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";
import { getCurrentDay, getPhase } from "../lib/dayUtils";
import { ExerciseCard } from "../components/ExerciseCard";
import { WorkoutTimer } from "../components/WorkoutTimer";
import { BottomNav } from "../components/BottomNav";
import type { Workout, WorkoutExercise } from "../types/api";

interface WorkoutResponse {
  day_number?: number;
  workout: Workout;
}

function estimateDurationMinutes(exercises: WorkoutExercise[]): number {
  if (!Array.isArray(exercises) || exercises.length === 0) return 0;
  let totalSec = 0;
  for (const ex of exercises) {
    const sets = Number(ex.sets) || 3;
    const reps = Number(ex.reps) || 10;
    const rest = ex.rest_seconds ?? 60;
    totalSec += sets * (Math.min(Number(reps) * 3, 90) + rest);
  }
  return Math.round(totalSec / 60);
}

export default function Workout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentDay = getCurrentDay(user?.created_at);
  const dayFromState = (location.state as { day?: number } | null)?.day;
  const day = dayFromState ?? currentDay;

  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [completeSuccess, setCompleteSuccess] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["workouts", day],
    queryFn: async () => {
      const { data: res } = await api.get<WorkoutResponse>(`/workouts/${day}`);
      return res;
    },
    enabled: day >= 1 && day <= 180,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await api.post("/logs", {
        day_number: day,
        workout_done: true,
        xp_earned: 50,
      });
      await api.post("/streaks/update");
    },
    onSuccess: () => {
      setCompleteSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["workouts", "today"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      setTimeout(() => navigate("/dashboard"), 2000);
    },
  });

  const toggleExercise = (index: number) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const workout = data?.workout;
  const dayNumber = data?.day_number ?? day;
  const phase = getPhase(dayNumber);
  const isRestDay = workout?.is_rest_day ?? false;
  const exercises = (workout?.exercises ?? []) as WorkoutExercise[];
  const estimatedMin = estimateDurationMinutes(exercises);

  const goalType = workout?.goal_type;
  const programBadge = goalType === "muscle"
    ? { label: "💪 Musculation", className: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30" }
    : goalType === "mixed"
      ? { label: "⚡ Mix", className: "bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/30" }
      : { label: "🔥 CrossFit", className: "bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30" };

  const recommendationLine = useMemo(() => {
    if (!goalType) return null;
    if (isRestDay) return null;
    if (goalType === "muscle") return "Charge recommandée: 70-80% de votre max";
    if (goalType === "crossfit") return "Format: AMRAP / For Time";
    if (goalType === "mixed") {
      const name = workout?.name ?? "";
      const subtype = name.startsWith("Musculation — ") ? "Musculation" : "CrossFit";
      return `Aujourd&apos;hui: ${subtype}`;
    }
    return null;
  }, [goalType, workout?.name, isRestDay]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link
            to="/dashboard"
            className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors"
            aria-label="Retour au tableau de bord"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Entraînement du Jour</h1>
            {!isLoading && !error && (
              <>
                <p className="text-sm text-gray-500">Jour {dayNumber} — Phase {phase}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${programBadge.className}`}>
                    {programBadge.label}
                  </span>
                  {recommendationLine && <p className="text-xs text-gray-400">{recommendationLine}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-2/3 rounded bg-gray-800" />
            <div className="h-24 rounded-xl bg-gray-800" />
            <div className="h-20 rounded-xl bg-gray-800" />
            <div className="h-20 rounded-xl bg-gray-800" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-center">
            <p className="text-red-400">Impossible de charger l&apos;entraînement.</p>
            <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">
              Retour au tableau de bord
            </Link>
          </div>
        )}

        {!isLoading && !error && workout && isRestDay && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-4xl font-bold text-white mb-2">Jour de Repos 💤</p>
            <p className="text-gray-400 text-center max-w-sm mb-8">
              La récupération fait partie du programme. Ton corps se reconstruit aujourd&apos;hui.
            </p>
            <Link
              to="/dashboard"
              className="rounded-lg bg-primary px-6 py-3 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Retour au tableau de bord
            </Link>
          </div>
        )}

        {!isLoading && !error && workout && !isRestDay && (
          <>
            {/* Workout info bar */}
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">{workout.name}</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {exercises.length} exercice{exercises.length !== 1 ? "s" : ""}
                    {estimatedMin > 0 && ` · ~${estimatedMin} min`}
                  </p>
                </div>
                <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
                  Phase {phase}
                </span>
              </div>
            </div>

            {/* Timer */}
            <div className="mb-6">
              <WorkoutTimer />
            </div>

            {/* Exercise list */}
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              Exercices
            </h3>
            <ul className="space-y-3">
              {exercises.map((ex, i) => (
                <li key={i}>
                  <ExerciseCard
                    exercise={ex}
                    index={i + 1}
                    checked={completedExercises.has(i)}
                    onToggle={() => toggleExercise(i)}
                  />
                </li>
              ))}
            </ul>

            {/* Complete button */}
            <div className="mt-8">
              {completeSuccess ? (
                <div className="rounded-xl border border-green-500/50 bg-green-950/30 p-4 text-center">
                  <p className="text-green-400 font-medium">Séance terminée ! +50 XP 🎉</p>
                  <p className="text-gray-500 text-sm mt-1">Redirection...</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="w-full py-3.5 rounded-xl bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
                >
                  {completeMutation.isPending ? "Enregistrement..." : "Terminer la séance ✓"}
                </button>
              )}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
