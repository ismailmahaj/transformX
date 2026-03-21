import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

type WorkType = "bureau" | "domicile" | "variable" | "nuit" | "sans_emploi";
type PreferredWorkoutTime = "matin" | "midi" | "soir";

export default function PlannerSettings() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [wakeTime, setWakeTime] = useState(user?.wake_time ?? "07:00");
  const [sleepTime, setSleepTime] = useState(user?.sleep_time ?? "23:00");
  const [workType, setWorkType] = useState<WorkType>(user?.work_type ?? "bureau");
  const [workStart, setWorkStart] = useState(user?.work_start ?? "09:00");
  const [workEnd, setWorkEnd] = useState(user?.work_end ?? "17:00");
  const [commuteMinutes, setCommuteMinutes] = useState<number>(user?.commute_minutes ?? 30);
  const [hasFamily, setHasFamily] = useState<boolean>(Boolean(user?.has_family));
  const [preferredWorkoutTime, setPreferredWorkoutTime] = useState<PreferredWorkoutTime>(
    user?.preferred_workout_time ?? "soir"
  );
  const [message, setMessage] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<{ user: typeof user }>("/users/profile", {
        wake_time: wakeTime,
        sleep_time: sleepTime,
        work_start: workStart,
        work_end: workEnd,
        work_type: workType,
        commute_minutes: commuteMinutes,
        has_family: hasFamily,
        preferred_workout_time: preferredWorkoutTime,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data?.user) setUser(data.user);
      const d = new Date();
      const key = `planner_${d.getFullYear()}_${d.getMonth() + 1}_${user?.id ?? "anonymous"}`;
      localStorage.removeItem(key);
      setMessage("Préférences enregistrées ✅");
      setTimeout(() => {
        setMessage(null);
        navigate("/planner?refresh=1");
      }, 700);
    },
    onError: () => setMessage("Erreur lors de l’enregistrement."),
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/planner" className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white">←</Link>
          <h1 className="text-lg font-bold text-white">Paramètres horaires</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 space-y-4">
          {message && <div className="text-sm text-primary">{message}</div>}

          <label className="block">
            <span className="text-sm text-gray-300">Heure de réveil</span>
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300">Heure de coucher</span>
            <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white" />
          </label>
          <label className="block">
            <span className="text-sm text-gray-300">Type de travail</span>
            <select value={workType} onChange={(e) => setWorkType(e.target.value as WorkType)} className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white">
              <option value="bureau">🏢 Bureau</option>
              <option value="domicile">🏠 Domicile</option>
              <option value="variable">🔄 Horaires variables</option>
              <option value="nuit">🌙 Travail de nuit</option>
              <option value="sans_emploi">🎯 Sans emploi / Indépendant</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm text-gray-300">Début travail</span>
              <input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white" />
            </label>
            <label className="block">
              <span className="text-sm text-gray-300">Fin travail</span>
              <input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} className="mt-1 w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white" />
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-gray-300">Temps de trajet: {commuteMinutes} min</span>
            <input type="range" min={0} max={120} value={commuteMinutes} onChange={(e) => setCommuteMinutes(Number(e.target.value))} className="mt-2 w-full accent-primary" />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Famille / enfants</span>
            <input type="checkbox" checked={hasFamily} onChange={(e) => setHasFamily(e.target.checked)} className="h-5 w-5 accent-primary" />
          </label>

          <div>
            <span className="text-sm text-gray-300">Préférence entraînement</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                { key: "matin", label: "🌅 Matin" },
                { key: "midi", label: "☀️ Midi" },
                { key: "soir", label: "🌆 Soir" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPreferredWorkoutTime(opt.key as PreferredWorkoutTime)}
                  className={`rounded-lg border px-2 py-2 text-sm ${preferredWorkoutTime === opt.key ? "border-primary bg-primary/10 text-primary" : "border-[#1a1a1a] text-gray-300"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {saveMutation.isPending ? "Sauvegarde..." : "Sauvegarder et régénérer le planning"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/planner")}
            className="w-full rounded-xl border border-[#1a1a1a] px-4 py-3 text-gray-300"
          >
            Retour au planning
          </button>
        </div>
      </main>
    </div>
  );
}

