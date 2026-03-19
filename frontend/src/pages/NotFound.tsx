import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <p className="text-8xl font-bold text-primary mb-2">404</p>
      <p className="text-xl text-gray-300 mb-8">Cette page n'existe pas</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/dashboard"
          className="rounded-lg bg-primary px-6 py-3 text-center font-medium text-white hover:opacity-90"
        >
          Retour au tableau de bord
        </Link>
        <Link
          to="/"
          className="rounded-lg border border-[#262626] bg-[#0f0f0f] px-6 py-3 text-center font-medium text-gray-200 hover:bg-[#1a1a1a]"
        >
          Page d'accueil
        </Link>
      </div>
    </div>
  );
}
