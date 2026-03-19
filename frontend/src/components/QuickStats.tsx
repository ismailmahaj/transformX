import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";
import { getCurrentDay, getDaysRemaining } from "../lib/dayUtils";
import type { ProgressEntry } from "../types/api";
import type { UserLog } from "../types/api";

interface ProgressResponse {
  progress: ProgressEntry[];
}

interface LogsResponse {
  logs: UserLog[];
}

export function QuickStats() {
  const user = useAuthStore((s) => s.user);
  const currentDay = getCurrentDay(user?.created_at);
  const daysRemaining = getDaysRemaining(currentDay);

  const { data: progressData } = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const { data } = await api.get<ProgressResponse>("/progress");
      return data;
    },
  });

  const { data: logsData } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const { data } = await api.get<LogsResponse>("/logs");
      return data;
    },
  });

  const progress = progressData?.progress ?? [];
  const sortedProgress = [...progress].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const lastEntry = sortedProgress[0];
  const currentWeight = lastEntry?.weight_kg ?? user?.weight_start_kg ?? "—";

  const logs = logsData?.logs ?? [];
  const workoutsCompleted = logs.filter((l) => l.workout_done).length;

  const stat = (label: string, value: string | number) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-white font-semibold mt-0.5">{value}</p>
    </div>
  );

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
      <h2 className="text-lg font-semibold text-white mb-4">Statistiques rapides</h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {stat("Poids actuel", typeof currentWeight === "number" ? `${currentWeight} kg` : currentWeight)}
        {stat("Séances complétées", workoutsCompleted)}
        {stat("Jours restants", daysRemaining)}
      </div>
      <Link
        to="/progress"
        className="text-sm text-primary hover:underline"
      >
        Voir la progression →
      </Link>
    </div>
  );
}
