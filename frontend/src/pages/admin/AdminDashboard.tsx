import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  fetchAdminStats,
  fetchAdminUsers,
  type AdminUser,
} from "../../lib/adminApi";

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
      <p className="text-xs uppercase tracking-wider text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function formatWeek(weekStart: string) {
  const d = new Date(weekStart);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export default function AdminDashboard() {
  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
  });

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetchAdminUsers({ page: 1, limit: 10 }),
  });

  const stats = statsQuery.data;
  const users = usersQuery.data?.users ?? [];

  if (statsQuery.isLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Chargement des statistiques…</p>
      </div>
    );
  }

  if (statsQuery.error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-red-400">
        Erreur lors du chargement des statistiques.
      </div>
    );
  }

  const lineData =
    stats.new_users_by_week?.map((w) => ({
      name: formatWeek(w.week_start),
      utilisateurs: w.count,
    })) ?? [];

  const barData =
    stats.workouts_by_day?.map((w) => ({
      name: formatDate(w.date),
      séances: w.count,
    })) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total utilisateurs" value={stats.total_users} />
        <StatCard
          title="Utilisateurs actifs (7j)"
          value={stats.active_users_7d}
        />
        <StatCard
          title="Séances complétées"
          value={stats.total_workouts_completed}
        />
        <StatCard title="Repas loggés" value={stats.total_meals_logged} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
          <h2 className="mb-4 text-sm font-semibold text-white">
            Nouveaux utilisateurs par semaine
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="name" stroke="#737373" fontSize={12} />
                <YAxis stroke="#737373" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #262626",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#a3a3a3" }}
                />
                <Line
                  type="monotone"
                  dataKey="utilisateurs"
                  stroke="var(--color-primary, #f97316)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
          <h2 className="mb-4 text-sm font-semibold text-white">
            Séances complétées par jour
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="name" stroke="#737373" fontSize={12} />
                <YAxis stroke="#737373" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #262626",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="séances"
                  fill="var(--color-primary, #f97316)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
        <h2 className="mb-4 text-sm font-semibold text-white">
          Derniers utilisateurs inscrits
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-gray-500">
                <th className="pb-2 pr-4 font-medium">Nom</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Objectif</th>
                <th className="pb-2 pr-4 font-medium">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: AdminUser) => (
                <tr
                  key={u.id}
                  className="border-b border-[#1a1a1a]/50 text-gray-300 hover:bg-[#1a1a1a]/30"
                >
                  <td className="py-3 pr-4 font-medium text-white">
                    {u.name ?? "—"}
                  </td>
                  <td className="py-3 pr-4">{u.email}</td>
                  <td className="py-3 pr-4">{u.goal ?? "—"}</td>
                  <td className="py-3 pr-4">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
