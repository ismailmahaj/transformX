import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { BottomNav } from "../components/BottomNav";

const STORAGE_KEY_PREFIX = "shopping-checked-";

interface ShoppingItem {
  name: string;
  total_quantity: number;
  unit: string;
  estimated_kg: string;
  checked: boolean;
}

interface ShoppingCategory {
  name: string;
  items: ShoppingItem[];
}

interface ShoppingResponse {
  period: string;
  days_covered: [number, number];
  categories: ShoppingCategory[];
  by_week: Array<{
    week: number;
    start_day: number;
    end_day: number;
    categories: ShoppingCategory[];
  }>;
}

function itemKey(item: ShoppingItem): string {
  return `${item.name}|${item.unit}`;
}

function loadChecked(daysCovered: [number, number]): Record<string, boolean> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${daysCovered[0]}-${daysCovered[1]}`;
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveChecked(daysCovered: [number, number], checked: Record<string, boolean>) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${daysCovered[0]}-${daysCovered[1]}`;
    localStorage.setItem(key, JSON.stringify(checked));
  } catch {
    // ignore
  }
}

export default function Shopping() {
  const [selectedWeek, setSelectedWeek] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["shopping", 4],
    queryFn: async () => {
      const { data: res } = await api.get<ShoppingResponse>("/shopping?weeks=4");
      return res;
    },
  });

  const daysCovered = data?.days_covered ?? [1, 28];
  const categories = useMemo(() => {
    if (!data) return [];
    if (selectedWeek === 0) return data.categories;
    const w = data.by_week?.[selectedWeek - 1];
    return w?.categories ?? data.categories;
  }, [data, selectedWeek]);

  useEffect(() => {
    if (data?.days_covered) setChecked(loadChecked(data.days_covered));
  }, [data?.days_covered?.[0], data?.days_covered?.[1]]);

  const persistChecked = useCallback(
    (next: Record<string, boolean>) => {
      setChecked(next);
      saveChecked(daysCovered, next);
    },
    [daysCovered]
  );

  const toggleItem = useCallback(
    (key: string) => {
      persistChecked({ ...checked, [key]: !checked[key] });
    },
    [checked, persistChecked]
  );

  const checkAll = useCallback(
    (value: boolean) => {
      const next: Record<string, boolean> = {};
      categories.forEach((cat) => cat.items.forEach((item) => (next[itemKey(item)] = value)));
      persistChecked(next);
    },
    [categories, persistChecked]
  );

  const toggleCollapse = useCallback((categoryName: string) => {
    setCollapsed((prev) => ({ ...prev, [categoryName]: !prev[categoryName] }));
  }, []);

  const totalItems = useMemo(
    () => categories.reduce((acc, cat) => acc + cat.items.length, 0),
    [categories]
  );
  const checkedCount = useMemo(
    () =>
      categories.reduce(
        (acc, cat) => acc + cat.items.filter((item) => checked[itemKey(item)]).length,
        0
      ),
    [categories, checked]
  );

  const handlePrint = useCallback(() => {
    setCollapsed({});
    setTimeout(() => window.print(), 100);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24 print:pb-0">
      {/* Print: hide header/nav/buttons */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          body { background: white; }
          .print\\:text-black { color: #111; }
          .print\\:border-gray-300 { border-color: #d1d5db; }
        }
      `}</style>

      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/dashboard"
            className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
            aria-label="Retour"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">Liste de Courses</h1>
            <p className="text-sm text-gray-500">Pour les 4 prochaines semaines</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {isLoading && (
          <div className="animate-pulse space-y-4">
            <div className="h-20 rounded-xl bg-gray-800" />
            <div className="h-48 rounded-xl bg-gray-800" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-red-400 text-sm">
            Impossible de charger la liste de courses.
          </div>
        )}

        {data && !isLoading && !error && (
          <>
            {/* Week tabs */}
            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedWeek(0)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  selectedWeek === 0 ? "bg-primary text-white" : "bg-[#1a1a1a] text-gray-300 hover:bg-[#252525]"
                }`}
              >
                Tout
              </button>
              {[1, 2, 3, 4].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setSelectedWeek(w as 1 | 2 | 3 | 4)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    selectedWeek === w ? "bg-primary text-white" : "bg-[#1a1a1a] text-gray-300 hover:bg-[#252525]"
                  }`}
                >
                  Semaine {w}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => checkAll(true)}
                className="rounded-lg border border-[#1a1a1a] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a]"
              >
                Tout cocher
              </button>
              <button
                type="button"
                onClick={() => checkAll(false)}
                className="rounded-lg border border-[#1a1a1a] bg-[#0f0f0f] px-3 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a]"
              >
                Tout décocher
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-lg bg-primary/20 text-primary px-3 py-2 text-sm font-medium hover:bg-primary/30"
              >
                Imprimer / Exporter
              </button>
            </div>

            {/* Summary card */}
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <p className="text-sm text-gray-400">
                Total : <span className="font-semibold text-white">{totalItems}</span> ingrédients
              </p>
              <p className="text-sm text-gray-400 mt-0.5">
                Cochés : <span className="font-semibold text-primary">{checkedCount}</span> / {totalItems}
              </p>
              <div className="mt-2 h-2 w-full rounded-full bg-[#1a1a1a] overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: totalItems ? `${(checkedCount / totalItems) * 100}%` : "0%" }}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              {categories.map((cat) => {
                const isOpen = collapsed[cat.name] !== true;
                return (
                  <div
                    key={cat.name}
                    className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCollapse(cat.name)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors print:pointer-events-none"
                    >
                      <span className="font-semibold text-white">{cat.name}</span>
                      <span className="text-gray-500 print:hidden">
                        {isOpen ? "▼" : "▶"}
                      </span>
                    </button>
                    {isOpen && (
                      <ul className="divide-y divide-[#1a1a1a]">
                        {cat.items.map((item) => {
                          const key = itemKey(item);
                          const isChecked = checked[key];
                          return (
                            <li
                              key={key}
                              className={`flex items-center gap-3 px-4 py-2.5 ${isChecked ? "opacity-60" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={!!isChecked}
                                onChange={() => toggleItem(key)}
                                className="h-5 w-5 shrink-0 rounded border-gray-600 bg-[#0a0a0a] accent-primary print:pointer-events-none"
                              />
                              <div className="min-w-0 flex-1">
                                <span
                                  className={`font-medium text-white ${isChecked ? "line-through text-gray-500" : ""}`}
                                >
                                  {item.name}
                                </span>
                                <p className="text-sm text-gray-500">{item.estimated_kg}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <div className="print:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
