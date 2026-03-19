const GLASS_ML = 250;
const TOTAL_GLASSES = 12;

interface WaterTrackerProps {
  waterMlLogged: number;
  targetMl: number;
  onAdd: () => void;
  isLoading?: boolean;
}

export function WaterTracker({ waterMlLogged, targetMl, onAdd, isLoading }: WaterTrackerProps) {
  const filledGlasses = Math.min(TOTAL_GLASSES, Math.floor(waterMlLogged / GLASS_ML));

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">💧</span>
          Eau
        </span>
        <span className="text-cyan-400 font-mono">
          {waterMlLogged.toLocaleString("fr-FR")} / {targetMl.toLocaleString("fr-FR")} ml
        </span>
      </div>
      <div className="grid grid-cols-6 gap-2 mb-4">
        {Array.from({ length: TOTAL_GLASSES }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={onAdd}
            disabled={isLoading}
            className={`
              h-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center
              ${i < filledGlasses
                ? "border-cyan-500 bg-cyan-500/30 text-cyan-300"
                : "border-[#2a2a2a] bg-[#1a1a1a] text-gray-500 hover:border-cyan-500/50"
              }
            `}
            title="Ajouter 250 ml"
          >
            <span className="text-sm">🥤</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={isLoading}
        className="w-full py-2 rounded-lg bg-cyan-500/20 text-cyan-400 font-medium hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
      >
        +250 ml
      </button>
    </div>
  );
}
