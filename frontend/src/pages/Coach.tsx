import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Comment perdre du gras rapidement ?",
  "Que manger avant mon entraînement ?",
  "Mon programme est-il adapté à mon niveau ?",
  "Comment améliorer ma récupération ?",
  "J'ai mal aux épaules, que faire ?",
  "Combien de protéines dois-je manger ?",
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

export default function Coach() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasWelcome = useRef(false);

  const userName = user?.name || user?.email || "toi";

  useEffect(() => {
    if (hasWelcome.current) return;
    hasWelcome.current = true;
    setMessages([
      {
        role: "assistant",
        content: `Salut ${userName} ! 💪 Je suis Alex, ton coach IA personnel. Je connais ton programme, ta progression et tes objectifs. Pose-moi n'importe quelle question sur ton entraînement, ta nutrition ou ta récupération. Je suis là pour t'aider à atteindre tes objectifs en 6 mois !`,
      },
    ]);
  }, [userName]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setInput("");
      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setLoading(true);

      try {
        const historyWithNew = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: trimmed },
        ];
        const history = getLastN(historyWithNew, 10);
        const { data } = await api.post<{ reply: string }>("/coach/chat", {
          message: trimmed,
          history,
        });
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
            : null;
        setError(message || "Une erreur est survenue. Réessaie plus tard.");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  const showSuggestions = messages.length === 1 && !loading;

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 px-4 py-3">
        <Link
          to="/dashboard"
          className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors"
          aria-label="Retour"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-white truncate">Coach Alex 🤖</h1>
          <p className="text-xs text-gray-500">Ton coach IA personnel</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
          <span className="text-xs text-gray-500">En ligne</span>
        </div>
      </header>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
          >
            {msg.role === "assistant" ? (
              <div className="flex max-w-[85%] gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  A
                </div>
                <div className="rounded-2xl rounded-tl-none border border-[#1a1a1a] bg-[#1a1a1a] px-4 py-2.5">
                  <p className="text-sm text-gray-100 whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary/90 px-4 py-2.5">
                <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                A
              </div>
              <div className="rounded-2xl rounded-tl-none border border-[#1a1a1a] bg-[#1a1a1a] px-3 py-2">
                <TypingIndicator />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {showSuggestions && (
          <div className="pt-2">
            <p className="text-xs text-gray-500 mb-2">Suggestions :</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-[#1a1a1a] bg-[#0a0a0a] p-4"
      >
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose une question à Alex..."
            disabled={loading}
            className="flex-1 rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] px-4 py-3 text-white placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-xl bg-primary px-4 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}

function getLastN<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  return arr.slice(-n);
}
