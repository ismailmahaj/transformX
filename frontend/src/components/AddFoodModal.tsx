import { useState, useMemo } from "react";

export interface FoodItem {
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

interface AddFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealType: string;
  mealLabel: string;
  foods: FoodItem[];
  onAdd: (entry: { food_name: string; quantity_g: number; calories: number; proteins_g: number; carbs_g: number; fats_g: number }) => void;
}

export function AddFoodModal({ isOpen, onClose, mealLabel, foods, onAdd }: AddFoodModalProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState(100);

  const filtered = useMemo(() => {
    if (!search.trim()) return foods.slice(0, 20);
    const q = search.toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 20);
  }, [foods, search]);

  const calculated = useMemo(() => {
    if (!selected) return null;
    const r = quantity / 100;
    return {
      calories: Math.round(selected.calories * r),
      proteins: Math.round((selected.proteins * r) * 10) / 10,
      carbs: Math.round((selected.carbs * r) * 10) / 10,
      fats: Math.round((selected.fats * r) * 10) / 10,
    };
  }, [selected, quantity]);

  const handleConfirm = () => {
    if (!selected || !calculated) return;
    onAdd({
      food_name: selected.name,
      quantity_g: quantity,
      calories: calculated.calories,
      proteins_g: calculated.proteins,
      carbs_g: calculated.carbs,
      fats_g: calculated.fats,
    });
    setSelected(null);
    setQuantity(100);
    setSearch("");
    onClose();
  };

  const handleClose = () => {
    setSelected(null);
    setQuantity(100);
    setSearch("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={handleClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-[#0f0f0f] border border-[#1a1a1a] shadow-xl flex flex-col">
        <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Ajouter — {mealLabel}</h2>
          <button type="button" onClick={handleClose} className="p-2 text-gray-400 hover:text-white rounded-lg">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <input
            type="text"
            placeholder="Rechercher un aliment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 mb-4"
          />
          <div className="space-y-1 max-h-48 overflow-y-auto mb-4">
            {filtered.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setSelected(f)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selected?.name === f.name ? "bg-primary/20 text-primary border border-primary/50" : "bg-[#1a1a1a] text-gray-200 hover:bg-[#2a2a2a]"
                }`}
              >
                <span className="font-medium">{f.name}</span>
                <span className="text-gray-500 text-sm ml-2">
                  {f.calories} kcal — P{f.proteins} C{f.carbs} F{f.fats}
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <>
              <label className="block text-sm text-gray-400 mb-1">Quantité (g)</label>
              <input
                type="number"
                min={1}
                max={5000}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 100)}
                className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white mb-3"
              />
              <div className="rounded-lg bg-[#1a1a1a] p-3 text-sm text-gray-300 mb-4">
                <p className="font-medium text-white mb-1">Macros pour {quantity} g</p>
                <p>
                  {calculated?.calories} kcal — P {calculated?.proteins}g · G {calculated?.carbs}g · L {calculated?.fats}g
                </p>
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t border-[#1a1a1a]">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
