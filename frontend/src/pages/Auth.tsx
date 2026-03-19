import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";
import { getFriendlyError } from "../lib/errorMessages";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        const { data } = await api.post<{ token: string; user: unknown }>("/auth/login", {
          email,
          password,
        });
        login(data.user as Parameters<typeof login>[0], data.token);
      } else {
        const { data } = await api.post<{ token: string; user: unknown }>("/auth/register", {
          email,
          password,
          name: name || undefined,
        });
        login(data.user as Parameters<typeof login>[0], data.token);
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-white mb-6">
        {isLogin ? "Se connecter" : "Créer un compte"}
      </h1>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {!isLogin && (
          <input
            type="text"
            placeholder="Prénom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500"
        />
        {isLogin && (
          <button
            type="button"
            onClick={() => setForgotPasswordOpen(true)}
            className="text-sm text-gray-400 hover:text-primary"
          >
            Mot de passe oublié ?
          </button>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-primary text-white font-medium disabled:opacity-50"
        >
          {loading ? "Chargement..." : isLogin ? "Se connecter" : "S'inscrire"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setIsLogin((x) => !x)}
        className="mt-4 text-gray-400 text-sm hover:text-white"
      >
        {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
      </button>
      <Link to="/" className="mt-6 text-gray-500 text-sm hover:text-white">
        Retour à l'accueil
      </Link>

      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-6 text-center">
            <p className="text-white font-medium mb-2">Mot de passe oublié</p>
            <p className="text-gray-400 text-sm mb-4">
              Fonctionnalité bientôt disponible.
              <br />
              Contacte-nous à support@transformx.app
            </p>
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(false)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
