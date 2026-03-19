import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: "📊" },
  { to: "/admin/workouts", label: "WODs", icon: "🏋️" },
  { to: "/admin/meals", label: "Repas", icon: "🥗" },
  { to: "/admin/users", label: "Utilisateurs", icon: "👥" },
  { to: "/admin/badges", label: "Badges", icon: "🏆" },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/admin" className="font-semibold text-white">
            TransformX Admin
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {user?.name ?? user?.email ?? "Admin"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-[#1a1a1a] px-3 py-1.5 text-sm text-gray-300 hover:bg-[#252525] hover:text-primary"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-56 shrink-0 border-r border-[#1a1a1a] bg-[#0f0f0f] md:block">
          <nav className="sticky top-14 flex flex-col gap-0.5 p-3">
            {NAV_ITEMS.map(({ to, label, icon }) => {
              const isActive =
                to === "/admin"
                  ? location.pathname === "/admin"
                  : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
                  }`}
                >
                  <span>{icon}</span>
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-h-[calc(100vh-3.5rem)] flex-1 p-4 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom tabs (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#1a1a1a] bg-[#0f0f0f] md:hidden">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map(({ to, label, icon }) => {
            const isActive =
              to === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium ${
                  isActive ? "text-primary" : "text-gray-400"
                }`}
              >
                <span className="text-lg">{icon}</span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
