import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Streak } from "../types/api";
import type { UserLog } from "../types/api";

interface StreaksResponse {
  streak: Streak;
}

interface LogsResponse {
  logs: UserLog[];
}

function StreakSkeleton() {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5 animate-pulse">
      <div className="h-6 w-1/2 rounded bg-gray-700 mb-4" />
      <div className="h-8 w-full rounded bg-gray-700 mb-2" />
      <div className="h-4 w-2/3 rounded bg-gray-700" />
    </div>
  );
}

export function StreakBadge() {
  const { data: streakData, isLoading: streakLoading } = useQuery({
    queryKey: ["streaks"],
    queryFn: async () => {
      const { data } = await api.get<StreaksResponse>("/streaks");
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

  if (streakLoading) return <StreakSkeleton />;

  const streak = streakData?.streak;
  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const totalXp = (logsData?.logs ?? []).reduce((sum, log) => sum + (log.xp_earned ?? 0), 0);

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
      <h2 className="text-lg font-semibold text-white mb-4">Série & XP</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🔥</span>
          <span className="text-white font-semibold">{currentStreak} jours de suite</span>
        </div>
        <p className="text-gray-400 text-sm">Record : {longestStreak} jours</p>
        <p className="text-primary font-medium">{totalXp.toLocaleString()} XP total</p>
      </div>
    </div>
  );
}
