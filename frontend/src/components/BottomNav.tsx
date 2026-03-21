import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS: Array<{ to: string; label: string; icon?: string }> = [
  { to: "/dashboard", label: "Tableau de bord" },
  { to: "/workout", label: "Entraînement" },
  { to: "/wod-scanner", label: "Scanner", icon: "📸" },
  { to: "/nutrition", label: "Nutrition" },
  { to: "/shopping", label: "Courses", icon: "🛒" },
  { to: "/coach", label: "Coach", icon: "🤖" },
  { to: "/planner", label: "Planning", icon: "📅" },
  { to: "/progress", label: "Progression" },
  { to: "/profile", label: "Profil" },
];

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur safe-area-pb">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ to, label, icon }) => {
          const isActive = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`
                flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors
                ${isActive ? "text-primary" : "text-gray-400 hover:text-gray-200"}
              `}
            >
              {icon ? <span className="text-base leading-none">{icon}</span> : null}
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
