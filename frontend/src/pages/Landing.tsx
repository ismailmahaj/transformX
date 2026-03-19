import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const SECTION_IDS = {
  programme: "programme",
  probleme: "probleme",
  solution: "solution",
  comment: "comment",
  apercu: "apercu",
  stats: "stats",
  cta: "cta",
} as const;

function useVisible(ref: React.RefObject<HTMLElement | null>, threshold = 0.1) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return visible;
}

function useCountUp(
  _ref: React.RefObject<HTMLElement | null>,
  end: number,
  duration = 1500,
  visible: boolean
) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(progress * end));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, end, duration]);
  return value;
}

export default function Landing() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [menuOpen, setMenuOpen] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const heroVisible = useVisible(heroRef, 0.2);

  const statsRef = useRef<HTMLElement>(null);
  const statsVisible = useVisible(statsRef, 0.3);
  const count180 = useCountUp(statsRef, 180, 1600, statsVisible);
  const count720 = useCountUp(statsRef, 720, 1600, statsVisible);
  const count3 = useCountUp(statsRef, 3, 800, statsVisible);

  const scrollToProgramme = () => {
    setMenuOpen(false);
    document.getElementById(SECTION_IDS.programme)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-bold text-white">
            TransformX
          </Link>

          <div className="hidden items-center gap-4 sm:flex">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="rounded-lg border border-[#1a1a1a] px-4 py-2 text-sm font-medium text-gray-200 hover:bg-[#1a1a1a] hover:text-white transition-all duration-300"
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={scrollToProgramme}
                  className="text-sm font-medium text-gray-300 hover:text-white transition-all duration-300"
                >
                  Voir le programme
                </button>
                <Link
                  to="/auth"
                  className="rounded-lg border border-[#1a1a1a] px-4 py-2 text-sm font-medium text-gray-200 hover:bg-[#1a1a1a] transition-all duration-300"
                >
                  Se connecter
                </Link>
                <Link
                  to="/auth"
                  className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea580c] transition-all duration-300"
                >
                  Commencer
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white sm:hidden"
            aria-label="Menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3 sm:hidden">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={scrollToProgramme}
                className="rounded-lg py-2 text-left text-sm text-gray-300 hover:text-white"
              >
                Voir le programme
              </button>
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg py-2 text-sm font-medium text-[#f97316]"
                >
                  Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg py-2 text-sm text-gray-300 hover:text-white"
                  >
                    Se connecter
                  </Link>
                  <Link
                    to="/auth"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg bg-[#f97316] py-2 text-center text-sm font-semibold text-white"
                  >
                    Commencer
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* Hero */}
        <section
          ref={heroRef}
          className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-24 md:py-32"
        >
          {/* Unsplash gym background */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.10]"
            style={{
              backgroundImage: "url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 50% 50% at 50% 0%, rgba(249,115,22,0.15) 0%, transparent 70%)",
            }}
          />
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
          <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center lg:flex-row lg:justify-between lg:gap-12">
            <div
              className={`max-w-2xl text-center transition-all duration-700 lg:text-left ${
                heroVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white md:text-7xl">
                Transforme ton corps en{" "}
                <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                  6 mois
                </span>{" "}
                💪
              </h1>
              <p className="mt-6 text-lg text-gray-300 sm:text-xl">
                Un programme complet jour par jour. CrossFit, nutrition, suivi IA. Zéro excuse.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm lg:justify-start">
                <span className="flex items-center gap-2 text-gray-300">
                  <span>🔥</span> Brûle les graisses
                </span>
                <span className="text-[#f97316]">|</span>
                <span className="flex items-center gap-2 text-gray-300">
                  <span>💪</span> Gagne du muscle
                </span>
                <span className="text-[#f97316]">|</span>
                <span className="flex items-center gap-2 text-gray-300">
                  <span>📊</span> Suivi complet
                </span>
              </div>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  to="/auth"
                  className="w-full rounded-xl bg-[#f97316] px-8 py-4 text-center text-lg font-semibold text-white hover:bg-[#ea580c] transition-all duration-300 sm:w-auto"
                >
                  Commencer gratuitement →
                </Link>
                <button
                  type="button"
                  onClick={scrollToProgramme}
                  className="text-gray-400 hover:text-white transition-all duration-300"
                >
                  Voir le programme ↓
                </button>
              </div>
            </div>
            {/* Mock phone - desktop only */}
            <div className="relative mt-12 hidden shrink-0 lg:block">
              <div
                className={`w-64 rounded-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 shadow-xl shadow-black/50 transition-all duration-700 ${
                  heroVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                }`}
              >
                <div className="rounded-lg bg-[#0a0a0a] px-3 py-2 text-xs text-gray-500">
                  TransformX
                </div>
                <div className="mt-4 rounded-xl bg-[#0a0a0a] p-4">
                  <p className="text-sm font-semibold text-white">Jour 1 / 180</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
                    <div
                      className="h-full rounded-full bg-[#f97316] transition-all duration-500"
                      style={{ width: "0.55%" }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-gray-400">Phase 1 • Perte de graisse</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-[#1a1a1a]" />

        {/* Problem */}
        <ScrollFadeSection id={SECTION_IDS.probleme} className="bg-[#0f0f0f] px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-3xl font-bold text-white md:text-4xl">
              Tu te reconnais ?
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                {
                  emoji: "😤",
                  title: "Tu commences, tu arrêtes",
                  desc: "Manque de structure et de motivation",
                },
                {
                  emoji: "🍕",
                  title: "Tu ne sais pas quoi manger",
                  desc: "Trop d'infos contradictoires",
                },
                {
                  emoji: "📉",
                  title: "Tu vois pas de résultats",
                  desc: "Pas de suivi, pas de progression",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-[#1a1a1a] border-l-4 border-l-orange-500/80 bg-[#0a0a0a] p-6 shadow-lg shadow-black/50 transition-all duration-300 hover:border-l-orange-500 hover:bg-[#141414] hover:shadow-[0_0_24px_rgba(249,115,22,0.12)]"
                >
                  <span className="text-4xl">{card.emoji}</span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm text-gray-400">{card.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-lg font-semibold text-[#f97316]">
              TransformX résout tout ça.
            </p>
          </div>
        </ScrollFadeSection>
        <div className="border-t border-[#1a1a1a]" />

        {/* Solution */}
        <ScrollFadeSection id={SECTION_IDS.solution} className="relative px-4 py-24 md:py-32">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05]"
            style={{
              backgroundImage: "url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-white md:text-4xl">
              Un système complet, pas juste une app
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  emoji: "📅",
                  title: "Programme Jour par Jour",
                  desc: "180 jours structurés. Tu sais exactement quoi faire chaque jour.",
                  iconBg: "bg-[#f97316]",
                  hoverBorder: "hover:border-t-[#f97316]",
                },
                {
                  emoji: "🥗",
                  title: "Nutrition Simplifiée",
                  desc: "Recettes prêtes, liste de courses auto, macros calculés.",
                  iconBg: "bg-green-500",
                  hoverBorder: "hover:border-t-green-500",
                },
                {
                  emoji: "🤖",
                  title: "Coach IA Personnel",
                  desc: "Alex analyse ta progression et répond à toutes tes questions.",
                  iconBg: "bg-blue-500",
                  hoverBorder: "hover:border-t-blue-500",
                  isNew: true,
                },
                {
                  emoji: "📸",
                  title: "Analyse Corporelle IA",
                  desc: "Upload une photo, l'IA analyse ta composition corporelle.",
                  iconBg: "bg-purple-500",
                  hoverBorder: "hover:border-t-purple-500",
                },
                {
                  emoji: "🔥",
                  title: "3 Programmes Adaptés",
                  desc: "CrossFit, Musculation ou Mix selon ton objectif.",
                  iconBg: "bg-red-500",
                  hoverBorder: "hover:border-t-red-500",
                },
                {
                  emoji: "📊",
                  title: "Suivi de Progression",
                  desc: "Poids, mensurations, photos avant/après.",
                  iconBg: "bg-amber-400",
                  hoverBorder: "hover:border-t-amber-400",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className={`group relative rounded-2xl border border-[#1a1a1a] border-t-4 border-t-transparent bg-[#0f0f0f] p-6 shadow-lg shadow-black/50 transition-all duration-300 hover:bg-[#141414] ${card.hoverBorder}`}
                >
                  {card.isNew && (
                    <span className="absolute right-4 top-4 rounded-full bg-[#f97316] px-2 py-0.5 text-xs font-semibold text-white">
                      Nouveau 🔥
                    </span>
                  )}
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${card.iconBg} text-2xl`}
                  >
                    {card.emoji}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm text-gray-400">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollFadeSection>
        <div className="border-t border-[#1a1a1a]" />

        {/* How it works */}
        <ScrollFadeSection id={SECTION_IDS.comment} className="px-4 py-24 md:py-32">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold text-white md:text-4xl">
              Comment ça marche ?
            </h2>
            <div className="relative mt-14 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              {/* Connecting line - desktop */}
              <div
                className="absolute left-[12%] right-[12%] top-7 hidden h-0.5 bg-[#1a1a1a] md:block"
                aria-hidden
              />
              <div
                className="absolute left-[12%] right-[12%] top-7 hidden h-0.5 bg-gradient-to-r from-transparent via-[#f97316] to-transparent md:block"
                style={{ opacity: 0.5 }}
                aria-hidden
              />
              {[
                {
                  num: 1,
                  title: "Crée ton compte",
                  desc: "2 minutes, gratuit",
                  screenshot: "Email + mot de passe, c'est parti.",
                },
                {
                  num: 2,
                  title: "Configure ton profil",
                  desc: "Objectif, niveau, mensurations",
                  screenshot: "Onboarding en 4 étapes.",
                },
                {
                  num: 3,
                  title: "Suis le programme",
                  desc: "Chaque jour: workout + repas + suivi",
                  screenshot: "Jour 1, 2, 3… jusqu'à 180.",
                },
                {
                  num: 4,
                  title: "Transforme-toi",
                  desc: "Résultats visibles en 4-6 semaines",
                  screenshot: "Poids, photos, mensurations.",
                },
              ].map((step) => (
                <div key={step.num} className="relative z-10 flex flex-1 flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f97316] text-xl font-bold text-white shadow-lg shadow-black/50">
                    {step.num}
                  </div>
                  <h3 className="mt-4 font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{step.desc}</p>
                  <p className="mt-2 text-xs text-gray-500">{step.screenshot}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollFadeSection>
        <div className="border-t border-[#1a1a1a]" />

        {/* Program preview */}
        <ScrollFadeSection id={SECTION_IDS.programme} className="px-4 py-24 md:py-32">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold text-white md:text-4xl">
              Aperçu du programme
            </h2>
            {/* Progress indicator */}
            <div className="mt-10 flex justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#f97316] ring-2 ring-[#f97316] ring-offset-2 ring-offset-[#0a0a0a]" title="Phase 1 en cours" />
              <span className="h-2 w-2 rounded-full bg-[#1a1a1a]" />
              <span className="h-2 w-2 rounded-full bg-[#1a1a1a]" />
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  phase: "Phase 1",
                  sub: "Semaines 1-4",
                  emoji: "🔥",
                  title: "Perte de graisse",
                  items: ["3 séances/semaine", "Full body CrossFit", "Déficit calorique"],
                  borderColor: "border-l-[#f97316]",
                  active: true,
                },
                {
                  phase: "Phase 2",
                  sub: "Semaines 5-12",
                  emoji: "💪",
                  title: "Force + Sèche",
                  items: ["4 séances/semaine", "Musculation + CrossFit", "Recomposition"],
                  borderColor: "border-l-blue-500",
                  active: false,
                },
                {
                  phase: "Phase 3",
                  sub: "Semaines 13-24",
                  emoji: "⚡",
                  title: "Physique Athlétique",
                  items: ["5 séances/semaine", "Spécialisation", "Résultats visibles"],
                  borderColor: "border-l-purple-500",
                  active: false,
                },
              ].map((card) => (
                <div
                  key={card.phase}
                  className={`rounded-2xl border border-[#1a1a1a] border-l-4 ${card.borderColor} bg-[#0f0f0f] p-6 shadow-lg shadow-black/50 transition-all duration-300 hover:bg-[#141414]`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#f97316]">
                      {card.phase} — {card.sub}
                    </span>
                    {card.active && (
                      <span className="rounded bg-[#f97316]/20 px-2 py-0.5 text-xs font-medium text-[#f97316]">
                        Phase actuelle
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl">{card.emoji}</span>
                    <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {card.items.map((item) => (
                      <li key={item} className="text-sm text-gray-400">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </ScrollFadeSection>
        <div className="border-t border-[#1a1a1a]" />

        {/* Stats */}
        <section
          ref={statsRef}
          className="relative border-y border-[#1a1a1a] px-4 py-24 md:py-32"
        >
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 80% 80% at 50% 50%, rgba(249,115,22,0.08) 0%, transparent 60%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="relative mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div
                className={`text-6xl font-bold text-[#f97316] md:text-8xl transition-all duration-500 ${
                  statsVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
              >
                {count180}
              </div>
              <div className="mt-2 text-sm text-gray-400">Jours de programme</div>
            </div>
            <div className="text-center">
              <div
                className={`text-6xl font-bold text-[#f97316] md:text-8xl transition-all duration-500 ${
                  statsVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
              >
                {count720}
              </div>
              <div className="mt-2 text-sm text-gray-400">Recettes incluses</div>
            </div>
            <div className="text-center">
              <div
                className={`text-6xl font-bold text-[#f97316] md:text-8xl transition-all duration-500 ${
                  statsVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
              >
                {count3}
              </div>
              <div className="mt-2 text-sm text-gray-400">Programmes différents</div>
            </div>
            <div className="text-center">
              <div
                className={`text-6xl font-bold text-[#f97316] transition-all duration-500 md:text-8xl ${
                  statsVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
              >
                24/7
              </div>
              <div className="mt-2 text-sm text-gray-400">Coach IA disponible</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <ScrollFadeSection id={SECTION_IDS.cta} className="px-4 py-24 md:py-32">
          <div
            className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl px-8 py-16 text-center"
            style={{
              background: "linear-gradient(135deg, #ea580c, #f97316, #fb923c)",
            }}
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                Prêt à te transformer ?
              </h2>
              <p className="mt-4 text-lg text-white/90">
                Rejoins le programme et commence dès aujourd&apos;hui
              </p>
              <Link
                to="/auth"
                className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-[#f97316] transition-all duration-300 hover:bg-gray-100"
              >
                Démarrer mon programme
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <p className="mt-6 text-sm text-white/80">
                Gratuit • Sans engagement • Résultats garantis si tu suis le programme
              </p>
            </div>
          </div>
        </ScrollFadeSection>

        {/* Footer */}
        <footer className="border-t border-[#1a1a1a] bg-[#0a0a0a] px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <Link to="/" className="text-xl font-bold text-white">
                TransformX
              </Link>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
                <button type="button" onClick={scrollToProgramme} className="hover:text-white transition-all duration-300">
                  Programme
                </button>
                <Link to="/auth" className="hover:text-white transition-all duration-300">
                  Nutrition
                </Link>
                <Link to="/auth" className="hover:text-white transition-all duration-300">
                  Coach IA
                </Link>
                <Link to="/auth" className="hover:text-white transition-all duration-300">
                  Connexion
                </Link>
              </div>
            </div>
            <p className="mt-8 text-center text-xs text-gray-500">
              © 2026 TransformX. Tous droits réservés.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function ScrollFadeSection({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const visible = useVisible(ref, 0.08);
  return (
    <section
      id={id}
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className ?? ""}`}
    >
      {children}
    </section>
  );
}
