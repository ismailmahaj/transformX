import type { WorkoutExercise } from "../types/api";

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  index: number;
  checked: boolean;
  onToggle: () => void;
  onOpenVideo?: () => void;
}

function formatSetsReps(exercise: WorkoutExercise): string {
  const sets = exercise.sets != null ? String(exercise.sets) : "—";
  const reps = exercise.reps != null ? String(exercise.reps) : "—";
  return `${sets} × ${reps}`;
}

export function ExerciseCard({ exercise, index, checked, onToggle, onOpenVideo }: ExerciseCardProps) {
  const name = exercise.name ?? "Exercice";
  const restSec = exercise.rest_seconds ?? 0;
  const setsReps = formatSetsReps(exercise);
  const hasVideo = Boolean(exercise.video_id);

  return (
    <div
      className={`
        rounded-xl border p-4 transition-all duration-200
        ${checked
          ? "border-green-500/50 bg-green-950/30"
          : "border-[#1a1a1a] bg-[#0f0f0f] hover:border-[#2a2a2a] hover:bg-[#141414]"
        }
      `}
    >
      <div className="flex items-start gap-4">
        <span className="text-sm font-mono text-gray-500 shrink-0">
          {String(index).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold text-white transition-all duration-200 ${
              checked ? "line-through text-gray-400" : ""
            }`}
          >
            {name}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-400">
            <span>{setsReps}</span>
            {restSec > 0 && <span>Repos : {restSec} s</span>}
            {hasVideo && onOpenVideo && (
              <button
                type="button"
                onClick={onOpenVideo}
                className="text-xs text-gray-500 hover:text-primary transition-colors"
              >
                ▶ Démo
              </button>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="sr-only peer"
            aria-label={`Marquer ${name} comme fait`}
          />
          <span
            className={`
              flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all duration-200
              ${checked
                ? "border-green-500 bg-green-500/20 text-green-400"
                : "border-gray-600 text-transparent hover:border-gray-500"
              }
            `}
          >
            {checked ? "✓" : ""}
          </span>
        </label>
      </div>
    </div>
  );
}
