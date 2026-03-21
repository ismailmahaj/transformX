import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { BottomNav } from "../components/BottomNav";
import { useAuthStore } from "../store/authStore";

type DayType = "workout" | "rest" | "active_rest" | "shopping" | "meal_prep";

interface PlannerDay {
  day: number;
  date: string;
  day_number: number;
  type: DayType;
  type_label: string;
  emoji: string;
  focus_short: string;
  focus_description: string;
  coach_conseil: string;
  intensite: "haute" | "moyenne" | "basse";
  is_today: boolean;
  is_past: boolean;
  actions: { workout: boolean; shopping: boolean };
}

interface MonthPlanResponse {
  year: number;
  month: number;
  first_weekday: number;
  days: PlannerDay[];
  stats: {
    seances_prevues: number;
    jours_repos: number;
    meal_prep: number;
    courses: number;
  };
}

function getCacheKey(year: number, month: number, userId: string) {
  return `planner_${year}_${month}_${userId}`;
}

export default function Planner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<MonthPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<PlannerDay | null>(null);
  const now = new Date();
  const year = Number.parseInt(searchParams.get("year") || "", 10) || now.getFullYear();
  const month = Number.parseInt(searchParams.get("month") || "", 10) || now.getMonth() + 1;
  const cacheKey = getCacheKey(year, month, user?.id ?? "anonymous");

  const cellStyle: Record<DayType, string> = {
    workout: "bg-orange-500/10 border-orange-500/30",
    rest: "bg-[#0f0f0f]",
    active_rest: "bg-blue-500/10 border-blue-500/30",
    shopping: "bg-yellow-500/10 border-yellow-500/30",
    meal_prep: "bg-green-500/10 border-green-500/30",
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { data: MonthPlanResponse; timestamp: number };
          const age = Date.now() - parsed.timestamp;
          if (age < 24 * 60 * 60 * 1000) return parsed.data;
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }
      const { data } = await api.get<MonthPlanResponse>(`/planner/month?year=${year}&month=${month}`);
      localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
      return data;
    },
    onSuccess: (res) => {
      setData(res);
      const today = res.days.find((d) => d.is_today);
      setSelectedDay(today ?? res.days[0] ?? null);
      setError(null);
    },
    onError: () => {
      setError("Impossible de générer le planning");
    },
  });

  useEffect(() => {
    if (searchParams.get("refresh") === "1") {
      localStorage.removeItem(cacheKey);
      searchParams.delete("refresh");
      setSearchParams(searchParams, { replace: true });
    }
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, cacheKey]);

  const calendarCells = useMemo(() => {
    if (!data) return [];
    const leading = Array.from({ length: data.first_weekday }, () => null);
    return [...leading, ...data.days];
  }, [data]);

  const next3 = useMemo(() => {
    if (!data) return [];
    const todayIso = new Date().toISOString().slice(0, 10);
    return data.days.filter((d) => d.date >= todayIso).slice(0, 3);
  }, [data]);

  const navigateMonth = (dir: -1 | 1) => {
    const d = new Date(year, month - 1 + dir, 1);
    setSearchParams({ year: String(d.getFullYear()), month: String(d.getMonth() + 1) });
  };

  const regenerate = () => {
    localStorage.removeItem(cacheKey);
    generateMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">Mon Planning du Mois 📅</h1>
            <p className="text-xs text-gray-500">
              {new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={regenerate}
              disabled={generateMutation.isPending}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {generateMutation.isPending ? "Génération..." : "Régénérer"}
            </button>
            <Link to="/planner/settings" className="rounded-lg border border-[#1a1a1a] px-3 py-2 text-xs text-gray-300">
              Paramètres horaires ⚙️
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-300">{error}</div>
        )}

        {!data && generateMutation.isPending && (
          <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-6 text-center">
            <p className="text-primary font-semibold animate-pulse">Coach Alex prépare ton planning...</p>
            <div className="mt-4 grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-[#1a1a1a] animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {data && (
          <>
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-3 flex items-center justify-between">
              <button type="button" onClick={() => navigateMonth(-1)} className="text-gray-400 hover:text-white px-2">←</button>
              <span className="text-sm text-gray-200">
                {new Date(year, month - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </span>
              <button type="button" onClick={() => navigateMonth(1)} className="text-gray-400 hover:text-white px-2">→</button>
            </div>

            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-3">
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-2">
                {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {calendarCells.map((cell, idx) => {
                  if (!cell) return <div key={`empty-${idx}`} className="h-16" />;
                  const d = cell as PlannerDay;
                  const selected = selectedDay?.date === d.date;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDay(d)}
                      className={`h-16 rounded-lg border p-1 text-left transition hover:scale-105 ${cellStyle[d.type]} ${
                        d.is_today ? "ring-2 ring-orange-500" : ""
                      } ${d.is_past ? "opacity-50" : ""} ${selected ? "border-primary" : "border-[#1a1a1a]"}`}
                    >
                      <div className="text-[10px] text-gray-400">{d.day}</div>
                      <div className="text-sm">{d.emoji}</div>
                      <div className={`text-[10px] text-gray-300 truncate ${selected ? "block" : "hidden sm:block"}`}>{d.focus_short}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <div className="mb-3 text-xs text-gray-500 uppercase">Légende</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                <span>💪 Entraînement</span>
                <span>😴 Repos</span>
                <span>🚶 Repos Actif</span>
                <span>🛒 Courses</span>
                <span>🍳 Meal Prep</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <h2 className="text-sm font-semibold text-white mb-2">Stats du mois</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-[#0a0a0a] p-3 text-gray-300">Séances prévues: <b>{data.stats.seances_prevues}</b></div>
                <div className="rounded-lg bg-[#0a0a0a] p-3 text-gray-300">Jours de repos: <b>{data.stats.jours_repos}</b></div>
                <div className="rounded-lg bg-[#0a0a0a] p-3 text-gray-300">Meal prep: <b>{data.stats.meal_prep}</b> fois</div>
                <div className="rounded-lg bg-[#0a0a0a] p-3 text-gray-300">Courses: <b>{data.stats.courses}</b> fois</div>
              </div>
            </div>

            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <h2 className="text-sm font-semibold text-white mb-2">Prochains 3 jours</h2>
              <div className="space-y-2">
                {next3.map((d) => (
                  <div key={d.date} className="rounded-lg bg-[#0a0a0a] p-2 text-sm text-gray-300">
                    <span className="mr-2">{d.emoji}</span>
                    <span className="mr-2 text-gray-500">{new Date(d.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                    {d.focus_short}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {selectedDay && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setSelectedDay(null)} />
          <div className="fixed z-40 right-0 bottom-0 top-auto md:top-0 w-full md:w-[420px] h-[70vh] md:h-full bg-[#0f0f0f] border-l border-[#1a1a1a] rounded-t-2xl md:rounded-none p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Détail du jour</h3>
              <button type="button" onClick={() => setSelectedDay(null)} className="text-gray-400">✕</button>
            </div>
            <p className="text-sm text-gray-500">{new Date(selectedDay.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
            <div className="mt-3 inline-flex rounded-full bg-[#1a1a1a] px-3 py-1 text-xs text-gray-200">{selectedDay.type_label}</div>
            <p className="mt-4 text-white font-semibold">{selectedDay.emoji} {selectedDay.focus_short}</p>
            <p className="mt-2 text-sm text-gray-400">{selectedDay.focus_description}</p>
            <p className="mt-3 text-sm text-orange-300">Conseil coach: {selectedDay.coach_conseil}</p>
            <div className="mt-3 inline-flex rounded-full border border-primary/40 px-3 py-1 text-xs text-primary">
              Intensité: {selectedDay.intensite}
            </div>

            <div className="mt-5 flex gap-2">
              {selectedDay.actions.workout && (
                <Link to="/workout" className="rounded-lg bg-primary/20 px-3 py-2 text-sm text-primary">Voir le WOD →</Link>
              )}
              {selectedDay.actions.shopping && (
                <Link to="/shopping" className="rounded-lg bg-yellow-500/20 px-3 py-2 text-sm text-yellow-300">Voir la liste de courses →</Link>
              )}
            </div>
          </div>
        </>
      )}
      <BottomNav />
    </div>
  );
}

