interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
}

export function MacroBar({ label, current, target, unit, color }: MacroBarProps) {
  const value = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const isOver = target > 0 && current > target;
  const displayTarget = target.toLocaleString("fr-FR");
  const displayCurrent = current.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#0f0f0f] p-3">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">
          {displayCurrent} <span className="text-gray-500">/ {displayTarget} {unit}</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-[#1a1a1a] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${Math.min(100, value)}%`,
            backgroundColor: isOver ? "#ef4444" : color,
          }}
        />
      </div>
    </div>
  );
}
