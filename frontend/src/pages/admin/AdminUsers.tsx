import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminUsers,
  deleteAdminUser,
  setAdminUserAdmin,
  type AdminUser,
} from "../../lib/adminApi";

const PER_PAGE = 20;

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", page],
    queryFn: () => fetchAdminUsers({ page, limit: PER_PAGE }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setSelectedUser(null);
      setToast({ type: "success", msg: "Utilisateur supprimé." });
    },
    onError: () => setToast({ type: "error", msg: "Erreur lors de la suppression." }),
  });

  const toggleAdminMu = useMutation({
    mutationFn: ({ id, is_admin }: { id: string; is_admin: boolean }) =>
      setAdminUserAdmin(id, is_admin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setToast({ type: "success", msg: "Statut admin mis à jour." });
      if (selectedUser) {
        setSelectedUser((u) => (u ? { ...u, is_admin: !u.is_admin } : null));
      }
    },
    onError: () => setToast({ type: "error", msg: "Erreur mise à jour admin." }),
  });

  const users = data?.users ?? [];
  const totalPages = data?.total_pages ?? 0;
  const total = data?.total ?? 0;

  const handleDelete = (u: AdminUser) => {
    if (!window.confirm(`Supprimer l'utilisateur « ${u.email} » ? Cette action est irréversible.`))
      return;
    deleteMutation.mutate(u.id);
  };

  const handleToggleAdmin = (u: AdminUser) => {
    toggleAdminMu.mutate({ id: u.id, is_admin: !u.is_admin });
  };

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1 space-y-4">
        <h1 className="text-xl font-bold text-white">Utilisateurs</h1>

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
        {error && <p className="text-red-400">Erreur lors du chargement des utilisateurs.</p>}

        <div className="overflow-x-auto rounded-xl border border-[#1a1a1a] bg-[#0f0f0f]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-gray-500">
                <th className="pb-2 pr-4 font-medium">Nom</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Objectif</th>
                <th className="pb-2 pr-4 font-medium">Jour actuel</th>
                <th className="pb-2 pr-4 font-medium">Streak</th>
                <th className="pb-2 pr-4 font-medium">Séances</th>
                <th className="pb-2 pr-4 font-medium">Admin</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`cursor-pointer border-b border-[#1a1a1a]/50 text-gray-300 hover:bg-[#1a1a1a]/30 ${
                    selectedUser?.id === u.id ? "bg-primary/10" : ""
                  }`}
                >
                  <td className="py-3 pr-4 font-medium text-white">{u.name ?? "—"}</td>
                  <td className="py-3 pr-4">{u.email}</td>
                  <td className="py-3 pr-4">{u.goal ?? "—"}</td>
                  <td className="py-3 pr-4">{u.current_day}</td>
                  <td className="py-3 pr-4">{u.current_streak}</td>
                  <td className="py-3 pr-4">{u.workouts_done}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_admin ? "bg-primary/30 text-primary" : "bg-[#262626] text-gray-400"
                      }`}
                    >
                      {u.is_admin ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleToggleAdmin(u)}
                      disabled={toggleAdminMu.isPending}
                      className="mr-2 text-primary hover:underline disabled:opacity-50"
                    >
                      {u.is_admin ? "Retirer admin" : "Mettre admin"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
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
              Page {page} / {totalPages} ({total} utilisateurs)
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
      </div>

      {selectedUser && (
        <div className="hidden w-80 shrink-0 rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 lg:block">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-white">Détail utilisateur</h2>
            <button
              type="button"
              onClick={() => setSelectedUser(null)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <p className="font-medium text-white">{selectedUser.name ?? "—"}</p>
          <p className="text-sm text-gray-400">{selectedUser.email}</p>
          <p className="mt-2 text-sm text-gray-400">Objectif : {selectedUser.goal ?? "—"}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-2">
              <p className="text-gray-500">Jour actuel</p>
              <p className="font-semibold text-white">{selectedUser.current_day} / 180</p>
            </div>
            <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-2">
              <p className="text-gray-500">Streak</p>
              <p className="font-semibold text-white">{selectedUser.current_streak} jours</p>
            </div>
            <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-2">
              <p className="text-gray-500">Séances</p>
              <p className="font-semibold text-white">{selectedUser.workouts_done}</p>
            </div>
            <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-2">
              <p className="text-gray-500">Repas loggés</p>
              <p className="font-semibold text-white">{selectedUser.meals_done}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Inscrit le{" "}
            {selectedUser.created_at
              ? new Date(selectedUser.created_at).toLocaleDateString("fr-FR")
              : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
