import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { DayCounter } from "../components/DayCounter";
import { TodayWorkout } from "../components/TodayWorkout";
import { TodayMeals } from "../components/TodayMeals";
import { StreakBadge } from "../components/StreakBadge";
import { QuickStats } from "../components/QuickStats";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Navbar */}
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">6MT</span>
            <span className="hidden text-gray-500 sm:inline">Transformation 6 Mois</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {user?.name || user?.email || "Utilisateur"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-[#1a1a1a] px-3 py-1.5 text-sm text-gray-300 hover:bg-[#1a1a1a] hover:text-white transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <DayCounter />
          </div>
          <div>
            <TodayWorkout />
          </div>
          <div>
            <TodayMeals />
          </div>
          <div>
            <StreakBadge />
          </div>
          <div>
            <QuickStats />
          </div>
          <div>
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-5">
              <h2 className="text-lg font-semibold text-white mb-1">Coach Alex 🤖</h2>
              <p className="text-sm text-gray-400 mb-4">Ton coach IA personnel</p>
              <Link
                to="/coach"
                className="inline-flex items-center gap-2 rounded-lg bg-primary/20 text-primary px-4 py-2.5 text-sm font-medium hover:bg-primary/30 transition-colors"
              >
                Poser une question →
              </Link>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="mt-8 flex flex-wrap gap-4 border-t border-[#1a1a1a] pt-6">
          <Link to="/workout" className="text-gray-400 hover:text-primary transition-colors">
            Entraînement
          </Link>
          <Link to="/nutrition" className="text-gray-400 hover:text-primary transition-colors">
            Nutrition
          </Link>
          <Link to="/progress" className="text-gray-400 hover:text-primary transition-colors">
            Progression
          </Link>
          <Link to="/profile" className="text-gray-400 hover:text-primary transition-colors">
            Profil
          </Link>
        </nav>
      </main>
    </div>
  );
}
