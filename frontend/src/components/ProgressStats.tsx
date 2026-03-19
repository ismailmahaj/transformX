import { getPhase } from "../lib/dayUtils";

interface ProgressStatsProps {
  startWeight: number;
  currentWeight: number | null;
  heightCm: number | null;
  day: number;
}

function bmi(weightKg: number, heightCm: number) {
  const h = heightCm / 100;
  if (h <= 0) return null;
  return weightKg / (h * h);
}

export function ProgressStats({ startWeight, currentWeight, heightCm, day }: ProgressStatsProps) {
  const current = currentWeight ?? startWeight;
  const lost = startWeight - current;
  const bmiValue = heightCm ? bmi(current, heightCm) : null;
  const phase = getPhase(day);

  const lostColor = lost >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Poids de départ</p>
        <p className="text-white font-semibold mt-1">{Number(startWeight).toFixed(1)} kg</p>
      </div>
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Poids actuel</p>
        <p className="text-white font-semibold mt-1">{Number(current).toFixed(1)} kg</p>
      </div>
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Perdu</p>
        <p className={`font-semibold mt-1 ${lostColor}`}>{lost >= 0 ? Number(lost).toFixed(1) : `+${Number(Math.abs(lost)).toFixed(1)}`} kg</p>
      </div>

      <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 col-span-3 flex items-center justify-between">
        <p className="text-sm text-gray-400">
          IMC actuel :{" "}
          <span className="text-white font-medium">
            {bmiValue ? Number(bmiValue).toFixed(1) : "—"}
          </span>
        </p>
        <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
          Phase {phase} / 3
        </span>
      </div>
    </div>
  );
}

