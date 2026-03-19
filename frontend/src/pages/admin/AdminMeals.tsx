import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminMeals,
  createAdminMeal,
  updateAdminMeal,
  deleteAdminMeal,
  type AdminMeal,
} from "../../lib/adminApi";

const MEAL_TYPES = [
  { value: "", label: "Tous" },
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
  { value: "snack", label: "Collation" },
];

const PER_PAGE = 20;

export default function AdminMeals() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [dayMin, setDayMin] = useState<number | "">("");
  const [dayMax, setDayMax] = useState<number | "">("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMeal | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "meals", page, dayMin, dayMax, type, search],
    queryFn: () =>
      fetchAdminMeals({
        page,
        limit: PER_PAGE,
        day_min: dayMin === "" ? undefined : Number(dayMin),
        day_max: dayMax === "" ? undefined : Number(dayMax),
        type: type || undefined,
        search: search || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "meals"] });
      setToast({ type: "success", msg: "Repas supprimé." });
    },
    onError: () => setToast({ type: "error", msg: "Erreur lors de la suppression." }),
  });

  const meals = data?.meals ?? [];
  const totalPages = data?.total_pages ?? 0;
  const total = data?.total ?? 0;

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Supprimer le repas « ${name} » ?`)) return;
    deleteMutation.mutate(id);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (m: AdminMeal) => {
    setEditing(m);
    setModalOpen(true);
  };

  const typeLabel = (t: string) => MEAL_TYPES.find((o) => o.value === t)?.label ?? t;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-white">Repas</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Créer un repas +
        </button>
      </div>

      {toast && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            toast.type === "success"
              ? "border-green-500/30 bg-green-950/20 text-green-400"
              : "border-red-500/30 bg-red-950/20 text-red-400"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-3">
        <input
          type="number"
          placeholder="Jour min"
          min={1}
          max={180}
          value={dayMin}
          onChange={(e) => setDayMin(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-24 rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white"
        />
        <input
          type="number"
          placeholder="Jour max"
          min={1}
          max={180}
          value={dayMax}
          onChange={(e) => setDayMax(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-24 rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white"
        >
          {MEAL_TYPES.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Recherche par nom"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[160px] rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white"
        />
      </div>

      {isLoading && <p className="text-gray-400">Chargement…</p>}
      {error && <p className="text-red-400">Erreur lors du chargement des repas.</p>}

      <div className="overflow-x-auto rounded-xl border border-[#1a1a1a] bg-[#0f0f0f]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a] text-gray-500">
              <th className="pb-2 pr-4 font-medium">Jour</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 font-medium">Nom</th>
              <th className="pb-2 pr-4 font-medium">Calories</th>
              <th className="pb-2 pr-4 font-medium">Protéines</th>
              <th className="pb-2 pr-4 font-medium">Difficulté</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {meals.map((m) => (
              <tr
                key={m.id}
                className="border-b border-[#1a1a1a]/50 text-gray-300 hover:bg-[#1a1a1a]/30"
              >
                <td className="py-3 pr-4">{m.day_number}</td>
                <td className="py-3 pr-4">{typeLabel(m.type)}</td>
                <td className="py-3 pr-4 font-medium text-white">{m.name}</td>
                <td className="py-3 pr-4">{m.macros?.calories ?? "—"}</td>
                <td className="py-3 pr-4">{m.macros?.proteins_g ?? "—"} g</td>
                <td className="py-3 pr-4">{m.difficulty ?? "—"}</td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="mr-2 text-primary hover:underline"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id, m.name)}
                    className="text-red-400 hover:underline"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-[#262626] bg-[#0f0f0f] px-3 py-1 text-sm text-gray-300 disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm text-gray-400">
            Page {page} / {totalPages} ({total} repas)
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-[#262626] bg-[#0f0f0f] px-3 py-1 text-sm text-gray-300 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}

      {modalOpen && (
        <MealModal
          meal={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin", "meals"] });
            setToast({
              type: "success",
              msg: editing ? "Repas mis à jour." : "Repas créé.",
            });
            setModalOpen(false);
            setEditing(null);
          }}
          onError={() => setToast({ type: "error", msg: "Erreur enregistrement." })}
        />
      )}
    </div>
  );
}

interface MealModalProps {
  meal: AdminMeal | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: () => void;
}

function MealModal({ meal, onClose, onSuccess, onError }: MealModalProps) {
  const [dayNumber, setDayNumber] = useState(meal?.day_number ?? 1);
  const [type, setType] = useState<"breakfast" | "lunch" | "dinner" | "snack">(
    (meal?.type as "breakfast" | "lunch" | "dinner" | "snack") ?? "breakfast"
  );
  const [name, setName] = useState(meal?.name ?? "");
  const [prepTime, setPrepTime] = useState(meal?.prep_time_minutes ?? 10);
  const [difficulty, setDifficulty] = useState(meal?.difficulty ?? "Facile");
  const [calories, setCalories] = useState(meal?.macros?.calories ?? 0);
  const [proteins, setProteins] = useState(meal?.macros?.proteins_g ?? 0);
  const [carbs, setCarbs] = useState(meal?.macros?.carbs_g ?? 0);
  const [fats, setFats] = useState(meal?.macros?.fats_g ?? 0);
  const [ingredients, setIngredients] = useState<
    Array<{ name: string; quantity: number | string; unit: string }>
  >(
    meal?.ingredients?.length
      ? meal.ingredients.map((i) => ({
          name: i.name,
          quantity: i.quantity ?? "",
          unit: (i as { unit?: string }).unit ?? "",
        }))
      : [{ name: "", quantity: "", unit: "" }]
  );
  const [recipe, setRecipe] = useState(meal?.recipe ?? "");

  const queryClient = useQueryClient();
  const createMu = useMutation({
    mutationFn: createAdminMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "meals"] });
      onSuccess();
    },
    onError,
  });
  const updateMu = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateAdminMeal>[1] }) =>
      updateAdminMeal(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "meals"] });
      onSuccess();
    },
    onError,
  });

  const addIngredient = () => {
    setIngredients((i) => [...i, { name: "", quantity: "", unit: "" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients((i) => i.filter((_, j) => j !== index));
  };

  const updateIngredient = (
    index: number,
    field: "name" | "quantity" | "unit",
    value: string | number
  ) => {
    setIngredients((i) =>
      i.map((ing, j) => (j === index ? { ...ing, [field]: value } : ing))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      day_number: dayNumber,
      type,
      name,
      prep_time_minutes: prepTime,
      difficulty,
      ingredients: ingredients
        .filter((i) => (i.name ?? "").trim() !== "")
        .map((i) => ({
          name: i.name.trim(),
          quantity: i.quantity,
          unit: i.unit || undefined,
        })),
      recipe: recipe || undefined,
      macros: { calories, proteins_g: proteins, carbs_g: carbs, fats_g: fats },
    };
    if (meal) {
      updateMu.mutate({ id: meal.id, body: payload });
    } else {
      createMu.mutate(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-6">
        <h2 className="mb-4 text-lg font-bold text-white">
          {meal ? "Modifier le repas" : "Créer un repas"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Jour (1-180)</label>
              <input
                type="number"
                min={1}
                max={180}
                value={dayNumber}
                onChange={(e) => setDayNumber(Number(e.target.value))}
                className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Type</label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "breakfast" | "lunch" | "dinner" | "snack")
                }
                className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              >
                <option value="breakfast">Petit-déjeuner</option>
                <option value="lunch">Déjeuner</option>
                <option value="dinner">Dîner</option>
                <option value="snack">Collation</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">
                Temps de préparation (min)
              </label>
              <input
                type="number"
                min={0}
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Difficulté</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              >
                <option value="Facile">Facile</option>
                <option value="Moyen">Moyen</option>
                <option value="Difficile">Difficile</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Calories</label>
              <input
                type="number"
                min={0}
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
                className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Protéines (g)</label>
              <input
                type="number"
                min={0}
                value={proteins}
                onChange={(e) => setProteins(Number(e.target.value))}
                className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Glucides (g)</label>
              <input
                type="number"
                min={0}
                value={carbs}
                onChange={(e) => setCarbs(Number(e.target.value))}
                className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Lipides (g)</label>
              <input
                type="number"
                min={0}
                value={fats}
                onChange={(e) => setFats(Number(e.target.value))}
                className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-400">Ingrédients</span>
              <button
                type="button"
                onClick={addIngredient}
                className="text-sm text-primary hover:underline"
              >
                Ajouter +
              </button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nom"
                    value={ing.name}
                    onChange={(e) => updateIngredient(i, "name", e.target.value)}
                    className="flex-1 rounded border border-[#262626] bg-[#0a0a0a] px-2 py-1 text-sm text-white"
                  />
                  <input
                    type="text"
                    placeholder="Quantité"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
                    className="w-20 rounded border border-[#262626] bg-[#0a0a0a] px-2 py-1 text-sm text-white"
                  />
                  <input
                    type="text"
                    placeholder="Unité"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                    className="w-20 rounded border border-[#262626] bg-[#0a0a0a] px-2 py-1 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="text-red-400 hover:underline"
                  >
                    Suppr.
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Recette (étapes)</label>
            <textarea
              value={recipe}
              onChange={(e) => setRecipe(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#262626] px-4 py-2 text-sm text-gray-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMu.isPending || updateMu.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {meal ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
