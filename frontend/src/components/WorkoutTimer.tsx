import { useState, useRef, useEffect } from "react";

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function WorkoutTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const handlePauseResume = () => setIsRunning((r) => !r);
  const handleStop = () => {
    setIsRunning(false);
    setElapsed(0);
  };

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-6 text-center">
      <p className="text-4xl sm:text-5xl font-mono font-bold text-white tabular-nums">
        {formatMMSS(elapsed)}
      </p>
      <p className="text-gray-500 text-sm mt-1">Temps de séance</p>
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {elapsed === 0 && !isRunning ? (
          <button
            type="button"
            onClick={() => setIsRunning(true)}
            className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:opacity-90 transition-opacity"
          >
            Démarrer
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePauseResume}
              className="px-5 py-2.5 rounded-lg border border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a] transition-colors"
            >
              {isRunning ? "Pause" : "Reprendre"}
            </button>
            <button
              type="button"
              onClick={handleStop}
              className="px-5 py-2.5 rounded-lg border border-[#1a1a1a] text-gray-300 hover:bg-[#1a1a1a] transition-colors"
            >
              Arrêter
            </button>
          </>
        )}
      </div>
    </div>
  );
}
