import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Workout } from "../types/api";

interface TodayWorkoutResponse {
  day_number: number;
  workout: Workout;
}

function programBadge(goalType: string | undefined) {
  if (goalType === "muscle") return { label: "💪 Musculation", className: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30" };
  if (goalType === "mixed") return { label: "⚡ Mix", className: "bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/30" };
  return { label: "🔥 CrossFit", className: "bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30" };
}

function WorkoutSkeleton() {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5 animate-pulse">
      <div className="h-6 w-3/4 rounded bg-gray-700 mb-3" />
      <div className="h-4 w-1/2 rounded bg-gray-700 mb-4" />
      <div className="h-10 w-full rounded-lg bg-gray-700" />
    </div>
  );
}

export function TodayWorkout() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["workouts", "today"],
    queryFn: async () => {
      const { data: res } = await api.get<TodayWorkoutResponse>("/workouts");
      return res;
    },
  });

  if (isLoading) return <WorkoutSkeleton />;
  if (error || !data) {
    return (
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5 text-gray-400">
        Impossible de charger l&apos;entraînement du jour.
      </div>
    );
  }

  const { workout, day_number } = data;
  const isRestDay = workout?.is_rest_day ?? false;
  const exerciseCount = Array.isArray(workout?.exercises) ? workout.exercises.length : 0;
  const badge = programBadge(workout?.goal_type);

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-lg font-semibold text-white">Entraînement du jour</h2>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      {isRestDay ? (
        <p className="text-gray-400 mb-4">Jour de repos 💤</p>
      ) : (
        <>
          <p className="text-gray-400 mb-1">{workout?.name ?? "Entraînement"}</p>
          <p className="text-sm text-gray-500 mb-4">
            {exerciseCount} exercice{exerciseCount !== 1 ? "s" : ""}
          </p>
          <button
            type="button"
            onClick={() => navigate("/workout", { state: { day: day_number } })}
            className="w-full py-2.5 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition-opacity"
          >
            Commencer la séance
          </button>
        </>
      )}
    </div>
  );
}
