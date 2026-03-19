interface OnboardingProgressProps {
  step: number; // 1..total
  total?: number;
}

export function OnboardingProgress({ step, total = 4 }: OnboardingProgressProps) {
  const clampedStep = Math.min(total, Math.max(1, step));
  const percent = Math.round((clampedStep / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Étape {clampedStep} / {total}</p>
        <p className="text-xs text-gray-500">{percent}%</p>
      </div>

      <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-start gap-2">
        {Array.from({ length: total }).map((_, idx) => {
          const s = idx + 1;
          const active = s <= clampedStep;
          return (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              className={`h-2 w-2 rounded-full ${active ? "bg-primary" : "bg-gray-700"}`}
            />
          );
        })}
      </div>
    </div>
  );
}

