import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { BottomNav } from "../components/BottomNav";

type BodyAnalysis = {
  body_fat_estimate: string;
  muscle_mass: string;
  fat_areas: string[];
  muscles_to_develop: string[];
  fitness_level: string;
  morphology: string;
  summary: string;
  advice: string[];
  motivation: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function normalizeFrench(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getApiErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "response" in err) {
    const resp = err as { response?: { data?: { error?: string } } };
    return resp.response?.data?.error || "Une erreur est survenue. Réessaie plus tard.";
  }
  return "Une erreur est survenue. Réessaie plus tard.";
}

function iconForMuscle(raw: string) {
  const s = normalizeFrench(raw);
  if (s.includes("epaul")) return "🏋️";
  if (s.includes("pector")) return "💪";
  if (s.includes("dos")) return "🦅";
  if (s.includes("abdo")) return "🧱";
  if (s.includes("bras")) return "💪";
  if (s.includes("cuiss")) return "🦵";
  if (s.includes("fess")) return "🍑";
  return "💪";
}

function iconForFatArea(raw: string) {
  const s = normalizeFrench(raw);
  if (s.includes("ventre") || s.includes("abdos")) return "🍔";
  if (s.includes("flanc")) return "↔️";
  if (s.includes("hanch")) return "🧬";
  if (s.includes("cuiss") || s.includes("jamb")) return "🦵";
  if (s.includes("bras") || s.includes("avantbras")) return "💪";
  if (s.includes("dos")) return "🧊";
  return "📍";
}

export default function BodyAnalysisPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<BodyAnalysis | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const fatAreaSet = useMemo(() => {
    const set = new Set<string>();
    for (const a of analysis?.fat_areas ?? []) set.add(normalizeFrench(a));
    return set;
  }, [analysis]);

  const highlightBelly = fatAreaSet.has("ventre") || fatAreaSet.has("abdos") || fatAreaSet.has("ventrebas");
  const highlightFlanks = fatAreaSet.has("flancs") || fatAreaSet.has("amour") || fatAreaSet.has("hanches");
  const highlightThighs = fatAreaSet.has("cuisses") || fatAreaSet.has("jambes") || fatAreaSet.has("cuisse");
  const highlightArms = fatAreaSet.has("bras") || fatAreaSet.has("avantbras");
  const highlightBack = fatAreaSet.has("dos");

  const handlePick = () => inputRef.current?.click();

  const handleFile = (picked: File | null) => {
    if (!picked) return;

    setError(null);
    setInfo(null);
    setAnalysis(null);

    if (picked.size > MAX_FILE_SIZE) {
      setError("Photo trop lourde. Taille max : 10MB.");
      return;
    }

    const allowed = new Set(["image/jpeg", "image/png"]);
    if (!allowed.has(picked.type)) {
      setError("Format non supporté. Utilise JPG ou PNG.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
  };

  const handleAnalyze = async () => {
    if (!file || loading) return;

    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("image", file);

      const { data } = await api.post<{ analysis: BodyAnalysis }>("/coach/analyze-body", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAnalysis(data.analysis);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!file || !analysis || saving) return;

    setError(null);
    setInfo(null);
    setSaving(true);
    try {
      const form = new FormData();
      form.append("photo", file);

      // Note lisible dans la galerie (optionnelle côté DB)
      form.append("note", `Analyse IA: ${analysis.body_fat_estimate} · ${analysis.fitness_level}`);
      form.append("analysis", JSON.stringify(analysis));

      await api.post("/progress/photos", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setInfo("Analyse sauvegardée dans ta galerie.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleNewAnalysis = () => {
    setError(null);
    setInfo(null);
    setAnalysis(null);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/progress"
            className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors"
            aria-label="Retour"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-white truncate">Analyse Corporelle IA 📸</h1>
            <p className="text-xs text-gray-500 truncate">Analyse ton corps avec l&apos;intelligence artificielle</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
          <p className="text-xs text-gray-400">
            <span className="text-gray-300 font-medium">Confidentialité :</span> Ta photo n&apos;est pas stockée sur nos serveurs.
          </p>
        </div>

        <section className="space-y-3">
          <div
            role="button"
            tabIndex={0}
            onClick={handlePick}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const picked = e.dataTransfer.files?.[0] ?? null;
              handleFile(picked);
            }}
            className={`rounded-xl border border-dashed transition-colors cursor-pointer ${
              dragOver ? "border-[#f97316] bg-[#f97316]/5" : "border-[#1a1a1a] bg-[#0f0f0f]"
            }`}
            aria-label="Zone de dépôt photo"
          >
            <div className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-white">Dépose une photo</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    JPG ou PNG (max 10MB). Pour une analyse précise, prends une photo de face en bonne lumière, torse nu.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-2xl">📎</span>
                  <span className="rounded-lg bg-primary/20 text-primary px-3 py-2 text-sm font-semibold">
                    Choisir / déposer
                  </span>
                </div>
              </div>

              {previewUrl ? (
                <div className="mt-4 rounded-lg border border-[#1a1a1a] overflow-hidden">
                  <img src={previewUrl} alt="Aperçu" className="w-full max-h-72 object-contain bg-black/20" />
                </div>
              ) : null}

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {error ? <div className="text-sm text-red-400">{error}</div> : null}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity disabled:cursor-not-allowed"
            >
              {loading ? "Analyse en cours..." : "Analyser avec l&apos;IA 🔍"}
            </button>
            <button
              type="button"
              onClick={handleNewAnalysis}
              disabled={loading && !analysis}
              className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] px-4 py-3 text-white font-semibold hover:bg-[#1a1a1a] disabled:opacity-50 transition-colors"
            >
              Nouvelle analyse
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 justify-center rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 animate-pulse">
              <div className="h-5 w-5 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-gray-200">Analyse en cours...</span>
            </div>
          ) : null}
        </section>

        {analysis ? (
          <section className="space-y-4">
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 animate-in fade-in duration-300">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Masse grasse estimée</p>
                  <div className="text-4xl font-bold text-white leading-none mt-2">{analysis.body_fat_estimate}</div>
                  <p className="text-sm text-gray-400 mt-2">Masse musculaire : {analysis.muscle_mass}</p>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-3 py-1 text-sm font-semibold">
                    {analysis.fitness_level}
                  </span>
                  <p className="text-sm text-gray-300 mt-2">
                    Morphologie : <span className="text-white font-semibold">{analysis.morphology}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 animate-in fade-in duration-300">
                <h3 className="text-white font-semibold mb-3">Zones à travailler</h3>

                <div className="flex flex-wrap gap-2 mb-3">
                  {(analysis.fat_areas ?? []).slice(0, 6).map((a) => (
                    <span key={a} className="rounded-full border border-[#1a1a1a] bg-[#0a0a0a]/70 px-3 py-1 text-xs text-gray-200">
                      <span className="mr-2">{iconForFatArea(a)}</span>
                      {a}
                    </span>
                  ))}
                </div>

                <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
                  <p className="text-xs text-gray-500 mb-2">Aperçu (indicatif)</p>
                  <svg viewBox="0 0 220 240" className="w-full h-52" role="img" aria-label="Carte du corps">
                    <rect x="0" y="0" width="220" height="240" fill="transparent" />

                    {/* Torse / ventre */}
                    <ellipse
                      cx="110"
                      cy="118"
                      rx="44"
                      ry="55"
                      fill={highlightBelly ? "rgba(249,115,22,0.85)" : "rgba(255,255,255,0.06)"}
                    />

                    {/* Flancs / hanches */}
                    <ellipse
                      cx="70"
                      cy="120"
                      rx="22"
                      ry="45"
                      fill={highlightFlanks ? "rgba(249,115,22,0.75)" : "rgba(255,255,255,0.04)"}
                    />
                    <ellipse
                      cx="150"
                      cy="120"
                      rx="22"
                      ry="45"
                      fill={highlightFlanks ? "rgba(249,115,22,0.75)" : "rgba(255,255,255,0.04)"}
                    />

                    {/* Bras */}
                    <rect
                      x="33"
                      y="78"
                      width="26"
                      height="78"
                      rx="13"
                      fill={highlightArms ? "rgba(249,115,22,0.6)" : "rgba(255,255,255,0.04)"}
                    />
                    <rect
                      x="161"
                      y="78"
                      width="26"
                      height="78"
                      rx="13"
                      fill={highlightArms ? "rgba(249,115,22,0.6)" : "rgba(255,255,255,0.04)"}
                    />

                    {/* Dos (si détecté) */}
                    <path
                      d="M96 78c-24 12-40 34-40 58 0 30 18 48 44 48"
                      stroke={highlightBack ? "rgba(249,115,22,0.85)" : "rgba(255,255,255,0.08)"}
                      strokeWidth="14"
                      fill="none"
                      strokeLinecap="round"
                      opacity={highlightBack ? 1 : 0.8}
                    />

                    {/* Cuisses */}
                    <rect
                      x="62"
                      y="164"
                      width="36"
                      height="52"
                      rx="18"
                      fill={highlightThighs ? "rgba(249,115,22,0.65)" : "rgba(255,255,255,0.04)"}
                    />
                    <rect
                      x="122"
                      y="164"
                      width="36"
                      height="52"
                      rx="18"
                      fill={highlightThighs ? "rgba(249,115,22,0.65)" : "rgba(255,255,255,0.04)"}
                    />

                    {/* Contour léger */}
                    <ellipse cx="110" cy="128" rx="60" ry="92" fill="none" stroke="rgba(255,255,255,0.14)" />
                  </svg>
                </div>
              </div>

              <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 animate-in fade-in duration-300">
                <h3 className="text-white font-semibold mb-3">Muscles à développer</h3>
                <div className="flex flex-wrap gap-2">
                  {(analysis.muscles_to_develop ?? []).slice(0, 10).map((m) => (
                    <span
                      key={m}
                      className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a]/70 px-3 py-2 text-sm text-gray-200 inline-flex items-center gap-2"
                    >
                      <span>{iconForMuscle(m)}</span>
                      <span className="font-medium">{m}</span>
                    </span>
                  ))}
                </div>

                {analysis.muscles_to_develop?.length ? (
                  <div className="mt-4 text-xs text-gray-500">
                    Astuce : priorise 2-3 groupes musculaires à la fois, puis augmente progressivement la charge.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 animate-in fade-in duration-300">
              <h3 className="text-white font-semibold mb-3">Résumé</h3>
              <p className="text-gray-200 text-sm leading-relaxed">{analysis.summary}</p>

              <div className="mt-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Conseils personnalisés</h4>
                <ul className="space-y-2">
                  {analysis.advice?.slice(0, 3).map((a, idx) => (
                    <li key={`${a}-${idx}`} className="text-sm text-gray-200 flex gap-2">
                      <span className="text-primary font-bold">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl bg-[#f97316]/15 border border-[#f97316]/30 p-4 animate-in fade-in duration-300">
              <h3 className="text-[#f97316] font-semibold mb-2">Motivation</h3>
              <p className="text-white text-sm sm:text-base font-medium">{analysis.motivation}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? "Sauvegarde..." : "Sauvegarder l'analyse"}
              </button>

              <button
                type="button"
                onClick={() => setInfo("Partage bientôt disponible.")}
                className="flex-1 rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] px-4 py-3 text-white font-semibold hover:bg-[#1a1a1a] transition-colors"
              >
                Partager
              </button>
            </div>
          </section>
        ) : null}

        {info ? (
          <div className="rounded-xl border border-green-500/40 bg-green-950/20 p-3 text-green-400 text-sm animate-in fade-in duration-200">
            {info}
          </div>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}

