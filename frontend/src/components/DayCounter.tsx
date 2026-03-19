import { useAuthStore } from "../store/authStore";
import { getCurrentDay, getPhase } from "../lib/dayUtils";

export function DayCounter() {
  const user = useAuthStore((s) => s.user);
  const createdAt = user?.created_at;
  const day = getCurrentDay(createdAt);
  const phase = getPhase(day);
  const percent = Math.round((day / 180) * 100);

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl font-bold text-white">
          Jour {day} <span className="text-gray-500 font-normal">/ 180</span>
        </span>
        <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
          Phase {phase}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-[#1a1a1a] overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
