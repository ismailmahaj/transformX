import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MacroBar } from "../components/MacroBar";
import { WaterTracker } from "../components/WaterTracker";
import { AddFoodModal, type FoodItem } from "../components/AddFoodModal";
import { BottomNav } from "../components/BottomNav";
import type { Meal } from "../types/api";

const TAB_STORAGE_KEY = "nutrition.tab";

const MEAL_CONFIG = [
  { type: "petit-dejeuner" as const, label: "Petit-déjeuner" },
  { type: "dejeuner" as const, label: "Déjeuner" },
  { type: "diner" as const, label: "Dîner" },
  { type: "collation" as const, label: "Collation" },
];

const PLAN_TYPE_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;
const PLAN_TYPE_LABEL: Record<(typeof PLAN_TYPE_ORDER)[number], string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

interface NutritionLog {
  id: string;
  meal_type: string;
  food_name: string;
  quantity_g: number;
  calories: number;
  proteins_g: number;
  carbs_g: number;
  fats_g: number;
}

interface TodayResponse {
  date: string;
  logs: NutritionLog[];
  totals: { calories: number; proteins_g: number; carbs_g: number; fats_g: number };
  targets: { calories: number; proteins_g: number; carbs_g: number; fats_g: number; water_ml: number };
  is_training_day: boolean;
  water_ml_logged: number;
}

interface WeekDayPayload {
  day_number: number;
  date: string;
  day_name: string;
  is_today: boolean;
  is_past: boolean;
  is_rest_day: boolean;
  meals: Meal[];
}

interface WeekResponse {
  current_day: number;
  meal_program: string;
  week: WeekDayPayload[];
  meal_prep_lines: string[];
}

type TabId = "today" | "week";

function capitalizeFr(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDayHeaderFr(dateIso: string) {
  const d = new Date(`${dateIso}T12:00:00`);
  return capitalizeFr(
    d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
  );
}

export default function Nutrition() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalMeal, setModalMeal] = useState<(typeof MEAL_CONFIG)[0] | null>(null);

  const [tab, setTab] = useState<TabId>(() => {
    try {
      const s = localStorage.getItem(TAB_STORAGE_KEY);
      if (s === "week" || s === "today") return s;
    } catch {
      /* ignore */
    }
    return "today";
  });

  useEffect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  const [openDayIndex, setOpenDayIndex] = useState<number | null>(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["nutrition", "today"],
    queryFn: async () => {
      const { data: res } = await api.get<TodayResponse>("/nutrition/today");
      return res;
    },
  });

  const { data: foodsData } = useQuery({
    queryKey: ["nutrition", "foods"],
    queryFn: async () => {
      const { data: res } = await api.get<{ foods: FoodItem[] }>("/nutrition/foods");
      return res;
    },
  });

  const { data: mealPlanData } = useQuery({
    queryKey: ["meals", "today"],
    queryFn: async () => {
      const { data: res } = await api.get<{ day_number: number; meal_program: string; meals: Meal[] }>("/meals");
      return res;
    },
  });

  const {
    data: weekData,
    isLoading: weekLoading,
    error: weekError,
  } = useQuery({
    queryKey: ["meals", "week"],
    queryFn: async () => {
      const { data: res } = await api.get<WeekResponse>("/meals/week");
      return res;
    },
    enabled: tab === "week",
  });

  const planMealByLogType = useMemo(() => {
    const map: Record<string, Meal | null> = {
      "petit-dejeuner": null,
      dejeuner: null,
      diner: null,
      collation: null,
    };
    const byType: Record<string, string> = {
      "petit-dejeuner": "breakfast",
      dejeuner: "lunch",
      diner: "dinner",
      collation: "snack",
    };
    const meals = mealPlanData?.meals ?? [];
    (Object.keys(map) as Array<keyof typeof map>).forEach((logType) => {
      const planType = byType[logType];
      map[logType] = meals.find((m) => m.type === planType) ?? null;
    });
    return map;
  }, [mealPlanData?.meals]);

  const setTrainingMutation = useMutation({
    mutationFn: (is_training_day: boolean) => api.post("/nutrition/targets", { is_training_day }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nutrition", "today"] }),
  });

  const addLogMutation = useMutation({
    mutationFn: (body: {
      meal_type: string;
      food_name: string;
      quantity_g: number;
      calories: number;
      proteins_g: number;
      carbs_g: number;
      fats_g: number;
    }) => api.post("/nutrition/log", body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nutrition", "today"] }),
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/nutrition/log/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nutrition", "today"] }),
  });

  const addWaterMutation = useMutation({
    mutationFn: () => api.post("/nutrition/water", { amount_ml: 250 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nutrition", "today"] }),
  });

  const targets = data?.targets ?? { calories: 0, proteins_g: 0, carbs_g: 0, fats_g: 0, water_ml: 3000 };
  const totals = data?.totals ?? { calories: 0, proteins_g: 0, carbs_g: 0, fats_g: 0 };
  const logs = data?.logs ?? [];
  const foods = foodsData?.foods ?? [];

  const mealProgramLabel = (program?: string | null) => {
    if (program === "prise_de_masse") return "Prise de Masse 💪";
    if (program === "diabetique") return "Diabétique 🩺";
    return "Programme Standard";
  };

  const handleAddFood = (entry: {
    food_name: string;
    quantity_g: number;
    calories: number;
    proteins_g: number;
    carbs_g: number;
    fats_g: number;
  }) => {
    if (!modalMeal) return;
    addLogMutation.mutate({
      meal_type: modalMeal.type,
      food_name: entry.food_name,
      quantity_g: entry.quantity_g,
      calories: entry.calories,
      proteins_g: entry.proteins_g,
      carbs_g: entry.carbs_g,
      fats_g: entry.fats_g,
    });
  };

  const getMealByPlanType = (meals: Meal[], planType: (typeof PLAN_TYPE_ORDER)[number]) =>
    meals.find((m) => m.type === planType) ?? null;

  const handlePrintWeek = () => {
    window.print();
  };

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0a] pb-24 print:hidden">
        <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
                aria-label="Retour"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-lg font-bold text-white">Nutrition</h1>
            </div>

            <div className="flex rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-1">
              <button
                type="button"
                onClick={() => setTab("today")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  tab === "today" ? "bg-primary/20 text-primary" : "text-gray-400 hover:text-white"
                }`}
              >
                Aujourd&apos;hui
              </button>
              <button
                type="button"
                onClick={() => setTab("week")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  tab === "week" ? "bg-primary/20 text-primary" : "text-gray-400 hover:text-white"
                }`}
              >
                Cette Semaine
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
          {tab === "today" && isLoading && (
            <div className="animate-pulse space-y-4">
              <div className="h-24 rounded-xl bg-gray-800" />
              <div className="h-32 rounded-xl bg-gray-800" />
            </div>
          )}

          {tab === "today" && error && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-400">
              Impossible de charger les données nutrition.
            </div>
          )}

          {tab === "today" && !isLoading && !error && data && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
                <span className="text-gray-300">Jour d&apos;entraînement</span>
                <button
                  type="button"
                  onClick={() => setTrainingMutation.mutate(!data.is_training_day)}
                  disabled={setTrainingMutation.isPending}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    data.is_training_day ? "bg-primary" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                      data.is_training_day ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {mealPlanData?.meal_program ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
                  <span className="text-sm text-gray-300">Programme</span>
                  <span className="font-semibold text-primary">{mealProgramLabel(mealPlanData.meal_program)}</span>
                </div>
              ) : null}

              {mealPlanData && (mealPlanData.meals?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
                  Aucun repas trouvé pour ton programme. Essaie de mettre tes restrictions à jour dans ton profil.
                </div>
              ) : null}

              <section>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">Objectifs du jour</h2>
                <div className="grid gap-3">
                  <MacroBar
                    label="🔥 Calories"
                    current={totals.calories}
                    target={targets.calories}
                    unit="kcal"
                    color="#f97316"
                  />
                  <MacroBar
                    label="💪 Protéines"
                    current={totals.proteins_g}
                    target={targets.proteins_g}
                    unit="g"
                    color="#3b82f6"
                  />
                  <MacroBar
                    label="🌾 Glucides"
                    current={totals.carbs_g}
                    target={targets.carbs_g}
                    unit="g"
                    color="#eab308"
                  />
                  <MacroBar
                    label="🥑 Lipides"
                    current={totals.fats_g}
                    target={targets.fats_g}
                    unit="g"
                    color="#22c55e"
                  />
                </div>
              </section>

              <WaterTracker
                waterMlLogged={data.water_ml_logged}
                targetMl={targets.water_ml}
                onAdd={() => addWaterMutation.mutate()}
                isLoading={addWaterMutation.isPending}
              />

              <section>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">Repas</h2>
                <div className="space-y-4">
                  {MEAL_CONFIG.map(({ type, label }) => {
                    const mealLogs = logs.filter((l) => l.meal_type === type);
                    const planMeal = planMealByLogType[type];
                    return (
                      <div key={type} className="overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0f0f0f]">
                        <div className="flex items-center justify-between border-b border-[#1a1a1a] px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold text-white">{label}</h3>
                            {planMeal ? (
                              <div className="mt-0.5 space-y-0.5">
                                <p className="truncate text-xs text-gray-300">{planMeal.name}</p>
                                <p className="truncate text-xs text-gray-500">
                                  {planMeal.prep_time_minutes != null ? `${planMeal.prep_time_minutes} min` : "—"}
                                  {" · "}
                                  {planMeal.macros?.calories != null ? `${planMeal.macros.calories} kcal` : ""}
                                  {planMeal.macros?.proteins_g != null ? ` · P${planMeal.macros.proteins_g}g` : ""}
                                </p>
                              </div>
                            ) : (
                              <p className="mt-0.5 text-xs text-gray-600">—</p>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!planMeal?.id) return;
                                navigate(`/recipe/${planMeal.id}`);
                              }}
                              disabled={!planMeal?.id}
                              className="hidden rounded-lg border border-[#1a1a1a] px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:bg-[#1a1a1a] hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
                            >
                              Voir la recette →
                            </button>

                            <button
                              type="button"
                              onClick={() => setModalMeal({ type, label })}
                              className="rounded-lg bg-primary/20 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/30"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <ul className="divide-y divide-[#1a1a1a]">
                          {mealLogs.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-gray-500">Aucun aliment</li>
                          ) : (
                            mealLogs.map((log) => (
                              <li key={log.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                                <div>
                                  <p className="font-medium text-white">{log.food_name}</p>
                                  <p className="text-sm text-gray-500">
                                    {log.quantity_g} g — {log.calories} kcal · P{log.proteins_g} C{log.carbs_g} F
                                    {log.fats_g}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteLogMutation.mutate(log.id)}
                                  disabled={deleteLogMutation.isPending}
                                  className="rounded-lg p-2 text-gray-400 hover:text-red-400"
                                  aria-label="Supprimer"
                                >
                                  ✕
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {tab === "week" && (
            <div className="space-y-4">
              {weekLoading && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-28 rounded-xl bg-green-950/30" />
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 rounded-xl bg-gray-800" />
                  ))}
                </div>
              )}

              {weekError && (
                <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-400">
                  Impossible de charger la semaine.
                </div>
              )}

              {!weekLoading && !weekError && weekData && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                      Programme :{" "}
                      <span className="text-primary">{mealProgramLabel(weekData.meal_program)}</span>
                    </p>
                    <button
                      type="button"
                      onClick={handlePrintWeek}
                      className="rounded-lg border border-[#1a1a1a] px-3 py-2 text-xs font-medium text-gray-300 hover:bg-[#1a1a1a] hover:text-white"
                    >
                      Imprimer le menu de la semaine
                    </button>
                  </div>

                  <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-4">
                    <h2 className="mb-3 font-semibold text-white">🍳 Résumé Meal Prep</h2>
                    {weekData.meal_prep_lines.length === 0 ? (
                      <p className="text-sm text-gray-400">Aucun ingrédient agrégé pour cette semaine.</p>
                    ) : (
                      <ul className="mb-4 space-y-2 text-sm text-gray-300">
                        {weekData.meal_prep_lines.map((line) => (
                          <li key={line} className="flex gap-2">
                            <span className="text-green-400">•</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      to="/shopping"
                      className="inline-flex rounded-lg bg-green-500/20 px-4 py-2 text-sm font-medium text-green-300 hover:bg-green-500/30"
                    >
                      Voir la liste complète →
                    </Link>
                  </div>

                  <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1 sm:max-h-none">
                    {weekData.week.map((day, i) => {
                      const open = openDayIndex === i;
                      const headerLine = `${formatDayHeaderFr(day.date)} ${
                        day.is_rest_day ? "😴 Repos" : "💪 Entraînement"
                      }`;
                      return (
                        <div
                          key={`${day.date}-${day.day_number}`}
                          className={`overflow-hidden rounded-xl border transition-all duration-300 ${
                            day.is_today ? "border-orange-500 ring-2 ring-orange-500/40" : "border-[#1a1a1a]"
                          } ${day.is_past ? "opacity-50" : ""} bg-[#0f0f0f]`}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenDayIndex(open ? null : i)}
                            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                          >
                            <span className="text-sm font-medium text-white">{headerLine}</span>
                            <span className="text-gray-500">{open ? "▲" : "▼"}</span>
                          </button>
                          {open && (
                            <div className="border-t border-[#1a1a1a] transition-opacity duration-200">
                              <div className="space-y-3 px-4 pb-4 pt-2">
                                {PLAN_TYPE_ORDER.map((pt) => {
                                  const m = getMealByPlanType(day.meals, pt);
                                  return (
                                    <div
                                      key={pt}
                                      className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3"
                                    >
                                      <p className="text-xs font-medium uppercase text-gray-500">
                                        {PLAN_TYPE_LABEL[pt]}
                                      </p>
                                      {m ? (
                                        <>
                                          <p className="mt-1 font-medium text-white">{m.name}</p>
                                          <p className="mt-1 text-xs text-gray-400">
                                            {m.macros?.calories != null ? `${m.macros.calories} kcal` : "—"}
                                            {m.macros?.proteins_g != null ? ` · P${m.macros.proteins_g} g` : ""}
                                            {m.macros?.carbs_g != null ? ` · G${m.macros.carbs_g} g` : ""}
                                            {m.macros?.fats_g != null ? ` · L${m.macros.fats_g} g` : ""}
                                          </p>
                                          <button
                                            type="button"
                                            onClick={() => navigate(`/recipe/${m.id}`)}
                                            className="mt-2 text-xs text-gray-500 hover:text-primary"
                                          >
                                            Voir la recette →
                                          </button>
                                        </>
                                      ) : (
                                        <p className="mt-1 text-sm text-gray-600">—</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </main>

        <AddFoodModal
          isOpen={modalMeal !== null}
          onClose={() => setModalMeal(null)}
          mealType={modalMeal?.type ?? ""}
          mealLabel={modalMeal?.label ?? ""}
          foods={foods.map((f) => ({
            name: f.name,
            calories: f.calories,
            proteins: f.proteins,
            carbs: f.carbs,
            fats: f.fats,
          }))}
          onAdd={handleAddFood}
        />

        <BottomNav />
      </div>

      {weekData && tab === "week" && (
        <div className="hidden print:block">
          <div className="min-h-screen bg-white p-8 text-black">
            <h1 className="mb-2 text-2xl font-bold">Menu de la semaine</h1>
            <p className="mb-6 text-sm text-gray-600">
              Jour programme : {weekData.current_day} · {mealProgramLabel(weekData.meal_program)}
            </p>
            {weekData.meal_prep_lines.length > 0 && (
              <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h2 className="mb-2 font-semibold">Résumé meal prep (quantités indicatives)</h2>
                <ul className="list-disc pl-5 text-sm">
                  {weekData.meal_prep_lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-6">
              {weekData.week.map((day) => (
                <section key={day.date}>
                  <h2 className="mb-2 border-b border-gray-300 pb-1 text-lg font-semibold">
                    {formatDayHeaderFr(day.date)} — {day.is_rest_day ? "Repos" : "Entraînement"}
                  </h2>
                  <ul className="space-y-2 text-sm">
                    {PLAN_TYPE_ORDER.map((pt) => {
                      const m = getMealByPlanType(day.meals, pt);
                      return (
                        <li key={pt}>
                          <strong>{PLAN_TYPE_LABEL[pt]} :</strong>{" "}
                          {m ? (
                            <>
                              {m.name}
                              {m.macros?.calories != null ? ` (${m.macros.calories} kcal)` : ""}
                            </>
                          ) : (
                            "—"
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
