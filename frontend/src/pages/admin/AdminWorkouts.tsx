import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminWorkouts,
  createAdminWorkout,
  updateAdminWorkout,
  deleteAdminWorkout,
  type AdminWorkout,
} from "../../lib/adminApi";

const GOAL_OPTIONS = [
  { value: "", label: "Tous" },
  { value: "crossfit", label: "CrossFit" },
  { value: "muscle", label: "Muscle" },
  { value: "mixed", label: "Mixte" },
];

const PHASE_OPTIONS = [0, 1, 2, 3];

const PER_PAGE = 20;

export default function AdminWorkouts() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [phase, setPhase] = useState<number | "">("");
  const [goalType, setGoalType] = useState("");
  const [dayMin, setDayMin] = useState<number | "">("");
  const [dayMax, setDayMax] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminWorkout | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "workouts", page, phase, goalType, dayMin, dayMax, search],
    queryFn: () =>
      fetchAdminWorkouts({
        page,
        limit: PER_PAGE,
        phase: phase === "" ? undefined : Number(phase),
        goal_type: goalType || undefined,
        day_min: dayMin === "" ? undefined : Number(dayMin),
        day_max: dayMax === "" ? undefined : Number(dayMax),
        search: search || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "workouts"] });
      setToast({ type: "success", msg: "WOD supprimé." });
    },
    onError: () => setToast({ type: "error", msg: "Erreur lors de la suppression." }),
  });

  const workouts = data?.workouts ?? [];
  const totalPages = data?.total_pages ?? 0;
  const total = data?.total ?? 0;

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Supprimer le WOD « ${name} » ?`)) return;
    deleteMutation.mutate(id);
  };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (w: AdminWorkout) => {
    setEditing(w);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-white">WODs</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Créer un WOD +
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-3">
        <select
          value={phase}
          onChange={(e) => setPhase(e.target.value === "" ? "" : Number(e.target.value))}
          className="rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white"
        >
          <option value="">Phase (toutes)</option>
          {PHASE_OPTIONS.filter(Boolean).map((p) => (
            <option key={p} value={p}>
              Phase {p}
            </option>
          ))}
        </select>
        <select
          value={goalType}
          onChange={(e) => setGoalType(e.target.value)}
          className="rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white"
        >
          {GOAL_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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
        <input
          type="text"
          placeholder="Recherche par nom"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[160px] rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-1.5 text-sm text-white"
        />
      </div>

      {isLoading && (
        <p className="text-gray-400">Chargement…</p>
      )}
      {error && (
        <p className="text-red-400">Erreur lors du chargement des WODs.</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#1a1a1a] bg-[#0f0f0f]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a] text-gray-500">
              <th className="pb-2 pr-4 font-medium">Jour</th>
              <th className="pb-2 pr-4 font-medium">Phase</th>
              <th className="pb-2 pr-4 font-medium">Nom</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 font-medium">Nb exercices</th>
              <th className="pb-2 pr-4 font-medium">Repos</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {workouts.map((w) => (
              <tr
                key={w.id}
                className="border-b border-[#1a1a1a]/50 text-gray-300 hover:bg-[#1a1a1a]/30"
              >
                <td className="py-3 pr-4">{w.day_number}</td>
                <td className="py-3 pr-4">{w.phase}</td>
                <td className="py-3 pr-4 font-medium text-white">{w.name}</td>
                <td className="py-3 pr-4">{w.goal_type}</td>
                <td className="py-3 pr-4">{w.exercises_count ?? (w.exercises?.length ?? 0)}</td>
                <td className="py-3 pr-4">{w.is_rest_day ? "Oui" : "Non"}</td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => openEdit(w)}
                    className="mr-2 text-primary hover:underline"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(w.id, w.name)}
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
            Page {page} / {totalPages} ({total} WODs)
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
        <WorkoutModal
          workout={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin", "workouts"] });
            setToast({ type: "success", msg: editing ? "WOD mis à jour." : "WOD créé." });
            setModalOpen(false);
            setEditing(null);
          }}
          onError={() => setToast({ type: "error", msg: "Erreur enregistrement." })}
        />
      )}
    </div>
  );
}

interface WorkoutModalProps {
  workout: AdminWorkout | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: () => void;
}

function WorkoutModal({ workout, onClose, onSuccess, onError }: WorkoutModalProps) {
  const [dayNumber, setDayNumber] = useState(workout?.day_number ?? 1);
  const [phase, setPhase] = useState(workout?.phase ?? 1);
  const [goalType, setGoalType] = useState<"crossfit" | "muscle" | "mixed">(
    (workout?.goal_type as "crossfit" | "muscle" | "mixed") ?? "crossfit"
  );
  const [name, setName] = useState(workout?.name ?? "");
  const [isRestDay, setIsRestDay] = useState(workout?.is_rest_day ?? false);
  const [exercises, setExercises] = useState<
    Array<{ name: string; sets?: number; reps?: number; rest_seconds?: number; note?: string }>
  >(workout?.exercises?.length ? [...workout.exercises] : [{ name: "" }]);

  const queryClient = useQueryClient();
  const createMu = useMutation({
    mutationFn: createAdminWorkout,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "workouts"] }); onSuccess(); },
    onError,
  });
  const updateMu = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateAdminWorkout>[1] }) =>
      updateAdminWorkout(id, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "workouts"] }); onSuccess(); },
    onError,
  });

  const addExercise = () => {
    setExercises((e) => [...e, { name: "" }]);
  };

  const removeExercise = (index: number) => {
    setExercises((e) => e.filter((_, i) => i !== index));
  };

  const moveExercise = (index: number, dir: "up" | "down") => {
    if (dir === "up" && index === 0) return;
    if (dir === "down" && index === exercises.length - 1) return;
    const next = [...exercises];
    const j = dir === "up" ? index - 1 : index + 1;
    [next[index], next[j]] = [next[j], next[index]];
    setExercises(next);
  };

  const updateExercise = (index: number, field: string, value: string | number) => {
    setExercises((e) =>
      e.map((ex, i) =>
        i === index ? { ...ex, [field]: value } : ex
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      day_number: dayNumber,
      phase,
      goal_type: goalType,
      name,
      is_rest_day: isRestDay,
      exercises: exercises
        .filter((ex) => (ex.name ?? "").trim() !== "")
        .map((ex) => ({
          name: ex.name.trim(),
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          note: ex.note,
        })),
    };
    if (workout) {
      updateMu.mutate({ id: workout.id, body: payload });
    } else {
      createMu.mutate(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-6">
        <h2 className="mb-4 text-lg font-bold text-white">
          {workout ? "Modifier le WOD" : "Créer un WOD"}
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
              <label className="mb-1 block text-sm text-gray-400">Phase</label>
              <select
                value={phase}
                onChange={(e) => setPhase(Number(e.target.value))}
                className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              >
                {[1, 2, 3].map((p) => (
                  <option key={p} value={p}>Phase {p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Objectif</label>
            <select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as "crossfit" | "muscle" | "mixed")}
              className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
            >
              <option value="crossfit">CrossFit</option>
              <option value="muscle">Muscle</option>
              <option value="mixed">Mixte</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Nom du WOD</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={isRestDay}
              onChange={(e) => setIsRestDay(e.target.checked)}
            />
            Jour de repos
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-400">Exercices</span>
              <button
                type="button"
                onClick={addExercise}
                className="text-sm text-primary hover:underline"
              >
                Ajouter un exercice +
              </button>
            </div>
            <div className="space-y-3">
              {exercises.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveExercise(i, "up")}
                      disabled={i === 0}
                      className="text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveExercise(i, "down")}
                      disabled={i === exercises.length - 1}
                      className="text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <input
                      type="text"
                      placeholder="Nom exercice"
                      value={ex.name}
                      onChange={(e) => updateExercise(i, "name", e.target.value)}
                      className="flex-1 rounded border border-[#262626] bg-[#0a0a0a] px-2 py-1 text-sm text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeExercise(i)}
                      className="text-red-400 hover:underline"
                    >
                      Suppr.
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                    <input
                      type="number"
                      placeholder="Séries"
                      min={0}
                      value={ex.sets ?? ""}
                      onChange={(e) =>
                        updateExercise(i, "sets", e.target.value === "" ? undefined! : Number(e.target.value))
                      }
                      className="rounded border border-[#262626] bg-[#0a0a0a] px-2 py-1 text-white"
                    />
                    <input
                      type="number"
                      placeholder="Reps"
                      min={0}
                      value={ex.reps ?? ""}
                      onChange={(e) =>
                        updateExercise(i, "reps", e.target.value === "" ? undefined! : Number(e.target.value))
                      }
                      className="rounded border border-[#262626] bg-[#0a0a0a] px-2 py-1 text-white"
                    />
                    <input
                      type="number"
                      placeholder="Repos (s)"
                      min={0}
                      value={ex.rest_seconds ?? ""}
                      onChange={(e) =>
                        updateExercise(
                          i,
                          "rest_seconds",
                          e.target.value === "" ? undefined! : Number(e.target.value)
                        )
                      }
                      className="rounded border border-[#262626] bg-[#0a0a0a] px-2 py-1 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Note"
                      value={ex.note ?? ""}
                      onChange={(e) => updateExercise(i, "note", e.target.value)}
                      className="rounded border border-[#262626] bg-[#0a0a0a] px-2 py-1 text-white sm:col-span-2"
                    />
                  </div>
                </div>
              ))}
            </div>
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
              {workout ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
