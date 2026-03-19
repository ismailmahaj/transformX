import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MacroBar } from "../components/MacroBar";
import { WaterTracker } from "../components/WaterTracker";
import { AddFoodModal, type FoodItem } from "../components/AddFoodModal";
import { BottomNav } from "../components/BottomNav";
import { useAuthStore } from "../store/authStore";
import type { Meal } from "../types/api";

const MEAL_CONFIG = [
  { type: "petit-dejeuner" as const, label: "Petit-déjeuner" },
  { type: "dejeuner" as const, label: "Déjeuner" },
  { type: "diner" as const, label: "Dîner" },
  { type: "collation" as const, label: "Collation" },
];

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

export default function Nutrition() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalMeal, setModalMeal] = useState<typeof MEAL_CONFIG[0] | null>(null);
  const authGoal = useAuthStore((s) => s.user?.goal);

  const goalType = authGoal === "Prendre du muscle" ? "muscle" : authGoal === "Les deux" ? "mixed" : "crossfit";

  const goalMacroTargets =
    goalType === "muscle"
      ? { calories: 2500, proteins_g: 180, carbs_g: 280, fats_g: 80 }
      : goalType === "mixed"
        ? { calories: 2100, proteins_g: 170, carbs_g: 220, fats_g: 70 }
        : { calories: 1800, proteins_g: 160, carbs_g: 180, fats_g: 60 };

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
      const { data: res } = await api.get<{ day_number: number; meals: Meal[] }>("/meals");
      return res;
    },
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
    mutationFn: (body: { meal_type: string; food_name: string; quantity_g: number; calories: number; proteins_g: number; carbs_g: number; fats_g: number }) =>
      api.post("/nutrition/log", body),
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

  const targets = data?.targets
    ? { ...data.targets, ...goalMacroTargets }
    : { ...goalMacroTargets, water_ml: 3000 };
  const totals = data?.totals ?? { calories: 0, proteins_g: 0, carbs_g: 0, fats_g: 0 };
  const logs = data?.logs ?? [];
  const foods = foodsData?.foods ?? [];

  const handleAddFood = (entry: { food_name: string; quantity_g: number; calories: number; proteins_g: number; carbs_g: number; fats_g: number }) => {
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white" aria-label="Retour">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold text-white">Nutrition</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {isLoading && (
          <div className="animate-pulse space-y-4">
            <div className="h-24 rounded-xl bg-gray-800" />
            <div className="h-32 rounded-xl bg-gray-800" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-red-400 text-sm">
            Impossible de charger les données nutrition.
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {/* Training day toggle */}
            <div className="flex items-center justify-between rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <span className="text-gray-300">Jour d&apos;entraînement</span>
              <button
                type="button"
                onClick={() => setTrainingMutation.mutate(!data.is_training_day)}
                disabled={setTrainingMutation.isPending}
                className={`relative w-12 h-7 rounded-full transition-colors ${data.is_training_day ? "bg-primary" : "bg-gray-600"}`}
              >
                <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${data.is_training_day ? "left-6" : "left-1"}`} />
              </button>
            </div>

            {/* Macro summary */}
            <section>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Objectifs du jour</h2>
              <div className="grid gap-3">
                <MacroBar label="🔥 Calories" current={totals.calories} target={targets.calories} unit="kcal" color="#f97316" />
                <MacroBar label="💪 Protéines" current={totals.proteins_g} target={targets.proteins_g} unit="g" color="#3b82f6" />
                <MacroBar label="🌾 Glucides" current={totals.carbs_g} target={targets.carbs_g} unit="g" color="#eab308" />
                <MacroBar label="🥑 Lipides" current={totals.fats_g} target={targets.fats_g} unit="g" color="#22c55e" />
              </div>
            </section>

            {/* Water */}
            <WaterTracker
              waterMlLogged={data.water_ml_logged}
              targetMl={targets.water_ml}
              onAdd={() => addWaterMutation.mutate()}
              isLoading={addWaterMutation.isPending}
            />

            {/* Meal sections */}
            <section>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Repas</h2>
              <div className="space-y-4">
                {MEAL_CONFIG.map(({ type, label }) => {
                  const mealLogs = logs.filter((l) => l.meal_type === type);
                  const planMeal = planMealByLogType[type];
                  return (
                    <div key={type} className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-white truncate">{label}</h3>
                          {planMeal ? (
                            <div className="mt-0.5 space-y-0.5">
                              <p className="text-xs text-gray-300 truncate">{planMeal.name}</p>
                              <p className="text-xs text-gray-500 truncate">
                                {planMeal.prep_time_minutes != null ? `${planMeal.prep_time_minutes} min` : "—"}
                                {" · "}
                                {planMeal.macros?.calories != null ? `${planMeal.macros.calories} kcal` : ""}
                                {planMeal.macros?.proteins_g != null ? ` · P${planMeal.macros.proteins_g}g` : ""}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600 mt-0.5">—</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (!planMeal?.id) return;
                              navigate(`/recipe/${planMeal.id}`);
                            }}
                            disabled={!planMeal?.id}
                            className="hidden sm:inline-flex rounded-lg border border-[#1a1a1a] px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-[#1a1a1a] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Voir la recette →
                          </button>

                          <button
                            type="button"
                            onClick={() => setModalMeal({ type, label })}
                            className="rounded-lg bg-primary/20 text-primary px-3 py-1.5 text-sm font-medium hover:bg-primary/30"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <ul className="divide-y divide-[#1a1a1a]">
                        {mealLogs.length === 0 ? (
                          <li className="px-4 py-3 text-gray-500 text-sm">Aucun aliment</li>
                        ) : (
                          mealLogs.map((log) => (
                            <li key={log.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                              <div>
                                <p className="text-white font-medium">{log.food_name}</p>
                                <p className="text-gray-500 text-sm">
                                  {log.quantity_g} g — {log.calories} kcal · P{log.proteins_g} C{log.carbs_g} F{log.fats_g}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteLogMutation.mutate(log.id)}
                                disabled={deleteLogMutation.isPending}
                                className="p-2 text-gray-400 hover:text-red-400 rounded-lg"
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
      </main>

      <AddFoodModal
        isOpen={modalMeal !== null}
        onClose={() => setModalMeal(null)}
        mealType={modalMeal?.type ?? ""}
        mealLabel={modalMeal?.label ?? ""}
        foods={foods.map((f) => ({ name: f.name, calories: f.calories, proteins: f.proteins, carbs: f.carbs, fats: f.fats }))}
        onAdd={handleAddFood}
      />

      <BottomNav />
    </div>
  );
}
