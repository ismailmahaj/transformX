import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminBadges,
  createAdminBadge,
  updateAdminBadge,
  type AdminBadge,
} from "../../lib/adminApi";

const CONDITION_LABELS: Record<string, string> = {
  workouts_done: "Séances réalisées",
  streak: "Série de jours",
  day_reached: "Jour atteint",
  xp_total: "XP total",
};

export default function AdminBadges() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBadge | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "badges"],
    queryFn: fetchAdminBadges,
  });

  const createMu = useMutation({
    mutationFn: createAdminBadge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "badges"] });
      setToast({ type: "success", msg: "Badge créé." });
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => setToast({ type: "error", msg: "Erreur lors de la création." }),
  });

  const updateMu = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateAdminBadge>[1] }) =>
      updateAdminBadge(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "badges"] });
      setToast({ type: "success", msg: "Badge mis à jour." });
      setModalOpen(false);
      setEditing(null);
    },
    onError: () => setToast({ type: "error", msg: "Erreur lors de la mise à jour." }),
  });

  const badges = data?.badges ?? [];

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (b: AdminBadge) => {
    setEditing(b);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-white">Badges</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Créer un badge +
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

      {isLoading && <p className="text-gray-400">Chargement…</p>}
      {error && <p className="text-red-400">Erreur lors du chargement des badges.</p>}

      <div className="overflow-x-auto rounded-xl border border-[#1a1a1a] bg-[#0f0f0f]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a] text-gray-500">
              <th className="pb-2 pr-4 font-medium">Emoji</th>
              <th className="pb-2 pr-4 font-medium">Nom</th>
              <th className="pb-2 pr-4 font-medium">Condition</th>
              <th className="pb-2 pr-4 font-medium">Valeur seuil</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {badges.map((b) => (
              <tr
                key={b.id}
                className="border-b border-[#1a1a1a]/50 text-gray-300 hover:bg-[#1a1a1a]/30"
              >
                <td className="py-3 pr-4 text-xl">{b.emoji}</td>
                <td className="py-3 pr-4 font-medium text-white">{b.name}</td>
                <td className="py-3 pr-4">
                  {CONDITION_LABELS[b.condition_type] ?? b.condition_type}
                </td>
                <td className="py-3 pr-4">{b.threshold}</td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    className="text-primary hover:underline"
                  >
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <BadgeModal
          badge={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={(payload) => {
            if (editing) {
              updateMu.mutate({ id: editing.id, body: payload });
            } else {
              createMu.mutate(payload);
            }
          }}
          isPending={createMu.isPending || updateMu.isPending}
        />
      )}
    </div>
  );
}

interface BadgeModalProps {
  badge: AdminBadge | null;
  onClose: () => void;
  onSubmit: (payload: {
    emoji?: string;
    name: string;
    description?: string;
    condition_type: "workouts_done" | "streak" | "day_reached" | "xp_total";
    threshold: number;
  }) => void;
  isPending: boolean;
}

function BadgeModal({ badge, onClose, onSubmit, isPending }: BadgeModalProps) {
  const [emoji, setEmoji] = useState(badge?.emoji ?? "🏆");
  const [name, setName] = useState(badge?.name ?? "");
  const [description, setDescription] = useState(badge?.description ?? "");
  const [conditionType, setConditionType] = useState<
    "workouts_done" | "streak" | "day_reached" | "xp_total"
  >(
    (badge?.condition_type as "workouts_done" | "streak" | "day_reached" | "xp_total") ??
      "workouts_done"
  );
  const [threshold, setThreshold] = useState(badge?.threshold ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      emoji,
      name,
      description: description || undefined,
      condition_type: conditionType,
      threshold,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-6">
        <h2 className="mb-4 text-lg font-bold text-white">
          {badge ? "Modifier le badge" : "Créer un badge"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Emoji</label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
              maxLength={10}
            />
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
          <div>
            <label className="mb-1 block text-sm text-gray-400">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Type de condition</label>
            <select
              value={conditionType}
              onChange={(e) =>
                setConditionType(
                  e.target.value as "workouts_done" | "streak" | "day_reached" | "xp_total"
                )
              }
              className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 text-white"
            >
              <option value="workouts_done">Séances réalisées</option>
              <option value="streak">Série de jours</option>
              <option value="day_reached">Jour atteint</option>
              <option value="xp_total">XP total</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Valeur seuil</label>
            <input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
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
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {badge ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
