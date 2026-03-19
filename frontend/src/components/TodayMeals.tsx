import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Meal } from "../types/api";

interface TodayMealsResponse {
  day_number: number;
  meals: Meal[];
}

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<string, string> = { breakfast: "Petit-déjeuner", lunch: "Déjeuner", dinner: "Dîner", snack: "Collation" };

function MealsSkeleton() {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5 animate-pulse">
      <div className="h-6 w-1/3 rounded bg-gray-700 mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-700" />
        ))}
      </div>
    </div>
  );
}

export function TodayMeals() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["meals", "today"],
    queryFn: async () => {
      const { data: res } = await api.get<TodayMealsResponse>("/meals");
      return res;
    },
  });

  if (isLoading) return <MealsSkeleton />;
  if (error || !data) {
    return (
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5 text-gray-400">
        Impossible de charger les repas du jour.
      </div>
    );
  }

  const mealsByType = (data.meals ?? []).reduce<Record<string, Meal>>((acc, m) => {
    acc[m.type] = m;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
      <h2 className="text-lg font-semibold text-white mb-4">Repas du jour</h2>
      <div className="grid grid-cols-2 gap-3">
        {MEAL_ORDER.map((type) => {
          const meal = mealsByType[type];
          const label = MEAL_LABELS[type] ?? type;
          const kcal = meal?.macros?.calories ?? null;
          const protein = meal?.macros?.proteins_g ?? null;
          return (
            <div
              key={type}
              className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3 flex flex-col"
            >
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-white font-medium truncate mb-2">{meal?.name ?? "—"}</p>
              <p className="text-xs text-gray-500 mb-3">
                {meal?.prep_time_minutes != null ? `${meal.prep_time_minutes} min` : "—"}
                {kcal != null && protein != null ? ` · ${kcal} kcal · P${protein}g` : ""}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!meal?.id) return;
                  navigate(`/recipe/${meal.id}`);
                }}
                className="mt-auto text-sm text-primary hover:underline"
                disabled={!meal?.id}
              >
                Voir la recette
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
