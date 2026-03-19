import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Meal } from "../types/api";

interface MealResponse {
  meal: Meal;
}

function difficultyBadge(difficulty?: string | null) {
  const d = (difficulty ?? "Facile").toLowerCase();
  if (d.includes("diffic")) return { text: "Difficile", cls: "bg-red-500/20 text-red-300 border border-red-500/30" };
  if (d.includes("moy")) return { text: "Moyen", cls: "bg-primary/20 text-primary border border-primary/30" };
  return { text: "Facile", cls: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/25" };
}

function mealTypeToNutritionType(mealType: string) {
  if (mealType === "breakfast") return "petit-dejeuner";
  if (mealType === "lunch") return "dejeuner";
  if (mealType === "dinner") return "diner";
  return "collation"; // snack
}

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState<string | null>(null);

  const mealId = id ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["meal", mealId],
    enabled: Boolean(mealId),
    queryFn: async () => {
      const { data: res } = await api.get<MealResponse>(`/meals/${mealId}`);
      return res.meal;
    },
  });

  const macro = data?.macros ?? null;
  const badge = difficultyBadge(data?.difficulty);

  const steps = useMemo(() => {
    const text = data?.recipe ?? "";
    return text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [data?.recipe]);

  const ingredients = useMemo(() => {
    const list = (data?.ingredients ?? []) as Array<{ name: string; quantity: number; unit: string }>;
    return list;
  }, [data?.ingredients]);

  const addMealToNutrition = useMutation({
    mutationFn: async () => {
      if (!data || !macro) throw new Error("Meal macros missing");
      const meal_type = mealTypeToNutritionType(data.type);
      await api.post("/nutrition/log", {
        meal_type,
        food_name: data.name,
        quantity_g: 1,
        calories: Math.round(macro.calories),
        proteins_g: Number(macro.proteins_g),
        carbs_g: Number(macro.carbs_g),
        fats_g: Number(macro.fats_g),
      });
      return true;
    },
    onSuccess: () => {
      setSuccess("Ajouté au journal nutrition !");
      queryClient.invalidateQueries({ queryKey: ["nutrition", "today"] });
      setTimeout(() => navigate("/nutrition"), 1200);
    },
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-10">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/nutrition"
            className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white truncate">Recette</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {isLoading && <div className="animate-pulse h-40 rounded-xl bg-gray-800" />}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-red-400 text-sm">
            Impossible de charger la recette.
          </div>
        )}

        {data && (
          <>
            <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white">{data.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.cls}`}>
                      {badge.text}
                    </span>
                    <span className="text-sm text-gray-400">
                      Préparation :{" "}
                      <span className="text-white font-medium">
                        {data.prep_time_minutes != null ? `${data.prep_time_minutes} min` : "—"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Calories</p>
                  <p className="text-white font-semibold mt-1 text-primary">{macro?.calories?.toLocaleString("fr-FR") ?? "—"} kcal</p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Protéines</p>
                  <p className="text-white font-semibold mt-1 text-[#3b82f6]">{macro?.proteins_g?.toLocaleString("fr-FR") ?? "—"} g</p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Glucides</p>
                  <p className="text-white font-semibold mt-1 text-[#eab308]">{macro?.carbs_g?.toLocaleString("fr-FR") ?? "—"} g</p>
                </div>
                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Lipides</p>
                  <p className="text-white font-semibold mt-1 text-[#22c55e]">{macro?.fats_g?.toLocaleString("fr-FR") ?? "—"} g</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => addMealToNutrition.mutate()}
                disabled={addMealToNutrition.isPending || !macro}
                className="w-full mt-4 py-3 rounded-xl bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {addMealToNutrition.isPending ? "Ajout en cours..." : "Ajouter au journal nutrition"}
              </button>
              {success && <p className="text-green-400 text-sm mt-2 text-center">{success}</p>}
            </section>

            <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <h3 className="text-white font-semibold mb-3">Ingrédients</h3>
              {!ingredients.length ? (
                <p className="text-gray-500 text-sm">Aucun ingrédient disponible.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {ingredients.map((ing, idx) => (
                    <li key={`${ing.name}-${idx}`} className="flex items-start justify-between gap-3">
                      <span className="text-gray-300">{ing.name}</span>
                      <span className="text-white font-medium">
                        {typeof ing.quantity === "number" ? ing.quantity : ""}
                        {ing.unit ? ` ${ing.unit}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <h3 className="text-white font-semibold mb-3">Recette</h3>
              {!steps.length ? (
                <p className="text-gray-500 text-sm">Aucune étape disponible.</p>
              ) : (
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                  {steps.map((s, i) => (
                    <li key={`${s}-${i}`}>{s}</li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

