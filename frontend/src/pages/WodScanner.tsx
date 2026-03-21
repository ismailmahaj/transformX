import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getFriendlyError } from "../lib/errorMessages";
import { BottomNav } from "../components/BottomNav";
import { useAuthStore } from "../store/authStore";
import type { ScannedWodData, ScannedWodExercise } from "../types/wodScan";

function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyWod(): ScannedWodData {
  return {
    nom: "WOD du jour",
    format: "autre",
    duree_estimee_minutes: null,
    echauffement: "",
    exercices: [],
    transitions: [],
    notes_generales: "",
    niveau: "",
    muscles_cibles: [],
  };
}

function draftKey(userId: string) {
  return `wodScanner.draft.${userId}`;
}

export default function WodScanner() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "anon";
  const today = todayIsoLocal();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [wod, setWod] = useState<ScannedWodData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [manualEdit, setManualEdit] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);

  const [scoreOpen, setScoreOpen] = useState(false);
  const [scoreTime, setScoreTime] = useState("");
  const [scoreRounds, setScoreRounds] = useState("");
  const [scoreNotes, setScoreNotes] = useState("");

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(draftKey(userId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { wod?: ScannedWodData; preview?: string | null };
      if (parsed.wod) setWod(parsed.wod);
      if (parsed.preview) setPreviewUrl(parsed.preview);
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    if (!wod) return;
    try {
      localStorage.setItem(
        draftKey(userId),
        JSON.stringify({ wod, preview: previewUrl, date: today })
      );
    } catch {
      /* ignore */
    }
  }, [wod, previewUrl, userId, today]);

  const scanMutation = useMutation({
    mutationFn: async (img: File) => {
      const fd = new FormData();
      fd.append("image", img);
      const { data } = await api.post<{ wod: ScannedWodData; warning?: string }>(
        "/coach/scan-wod",
        fd,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return data;
    },
    onSuccess: (data) => {
      setWod(data.wod);
      setScanWarning(data.warning ?? null);
      setScanError(null);
      setSaved(false);
    },
    onError: (err: unknown) => {
      setScanWarning(null);
      setScanError(getFriendlyError(err));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { date: string; wod_data: ScannedWodData }) => {
      const { data } = await api.post<{ scanned_wod: { id: string } }>("/coach/save-wod", payload);
      return data.scanned_wod;
    },
    onSuccess: (row) => {
      setSaved(true);
      setSavedRowId(row.id);
      try {
        localStorage.removeItem(draftKey(userId));
      } catch {
        /* ignore */
      }
    },
    onError: (err: unknown) => {
      setScanError(getFriendlyError(err));
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const parts: string[] = [];
      if (scoreTime.trim()) parts.push(`Temps: ${scoreTime.trim()}`);
      if (scoreRounds.trim()) parts.push(`Tours: ${scoreRounds.trim()}`);
      if (scoreNotes.trim()) parts.push(`Notes: ${scoreNotes.trim()}`);
      const scoreStr = parts.join(" · ") || "Terminé";
      await api.put(`/coach/wod/${today}/complete`, {
        score: scoreStr,
        notes: scoreNotes.trim() || null,
      });
    },
    onSuccess: () => {
      setScoreOpen(false);
      navigate("/workout");
    },
    onError: (err: unknown) => {
      setScanError(getFriendlyError(err));
    },
  });

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setScanError(null);
    setSaved(false);
  };

  const updateExercise = (index: number, patch: Partial<ScannedWodExercise>) => {
    setWod((prev) => {
      if (!prev) return prev;
      const ex = [...(prev.exercices ?? [])];
      ex[index] = { ...ex[index], ...patch };
      return { ...prev, exercices: ex };
    });
  };

  const removeExercise = (index: number) => {
    setWod((prev) => {
      if (!prev) return prev;
      const ex = [...(prev.exercices ?? [])];
      ex.splice(index, 1);
      return { ...prev, exercices: ex };
    });
  };

  const addExercise = () => {
    setWod((prev) => {
      const base = prev ?? emptyWod();
      return {
        ...base,
        exercices: [...(base.exercices ?? []), { nom: "Nouvel exercice", series: "", repetitions: "", poids: "", note: "" }],
      };
    });
  };

  const updateTransition = (index: number, value: string) => {
    setWod((prev) => {
      if (!prev) return prev;
      const t = [...(prev.transitions ?? [])];
      t[index] = value;
      return { ...prev, transitions: t };
    });
  };

  const addTransition = () => {
    setWod((prev) => {
      const base = prev ?? emptyWod();
      return { ...base, transitions: [...(base.transitions ?? []), ""] };
    });
  };

  const removeTransition = (index: number) => {
    setWod((prev) => {
      if (!prev) return prev;
      const t = [...(prev.transitions ?? [])];
      t.splice(index, 1);
      return { ...prev, transitions: t };
    });
  };

  const rescan = () => {
    setWod(null);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setScanError(null);
    setScanWarning(null);
    setSaved(false);
    setManualEdit(false);
    try {
      localStorage.removeItem(draftKey(userId));
    } catch {
      /* ignore */
    }
  };

  const handleSave = () => {
    if (!wod) return;
    saveMutation.mutate({ date: today, wod_data: wod });
  };

  const musclePills = useMemo(() => wod?.muscles_cibles ?? [], [wod]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-start gap-3 px-4 py-3">
          <Link
            to="/workout"
            className="rounded-lg p-2 text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
            aria-label="Retour"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Scanner le WOD 📸</h1>
            <p className="text-sm text-gray-500">Prends en photo le tableau de ton coach</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {scanWarning && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-sm text-amber-200">
            {scanWarning}
          </div>
        )}
        {scanError && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-300">{scanError}</div>
        )}

        {!wod && (
          <div className="rounded-2xl border-2 border-dashed border-[#333] bg-[#0f0f0f] p-8 text-center">
            <p className="mb-2 text-4xl">📷</p>
            <p className="mb-4 text-sm text-gray-400">
              📌 Assure-toi que le tableau est bien éclairé et lisible
            </p>
            <label className="inline-flex cursor-pointer flex-col items-center gap-2">
              <span className="rounded-xl bg-primary px-6 py-3 font-semibold text-white hover:opacity-90">
                Choisir une photo
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPickFile}
              />
            </label>
            {previewUrl && (
              <div className="mt-6">
                <img src={previewUrl} alt="Aperçu" className="mx-auto max-h-64 rounded-xl border border-[#1a1a1a] object-contain" />
                <button
                  type="button"
                  onClick={() => file && scanMutation.mutate(file)}
                  disabled={scanMutation.isPending || !file}
                  className="mt-4 w-full rounded-xl bg-primary py-3.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {scanMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Coach Alex lit le tableau...
                    </span>
                  ) : (
                    "🔍 Analyser le WOD"
                  )}
                </button>
                <p className="mt-2 text-center text-xs text-gray-500">~5 secondes</p>
              </div>
            )}
          </div>
        )}

        {wod && (
          <>
            {manualEdit && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-orange-200">
                ✏️ Mode édition manuelle : corrige les champs si besoin.
              </div>
            )}

            <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
              <label className="block text-xs uppercase text-gray-500">Nom du WOD</label>
              <input
                type="text"
                value={wod.nom}
                onChange={(e) => setWod({ ...wod, nom: e.target.value })}
                className="mt-1 w-full border-b border-[#333] bg-transparent pb-1 text-lg font-semibold text-white outline-none focus:border-primary"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-orange-500/40 bg-orange-500/15 px-3 py-1 text-xs text-orange-300">
                  {wod.format}
                </span>
                {wod.duree_estimee_minutes != null && (
                  <span className="rounded-full border border-[#333] px-3 py-1 text-xs text-gray-300">
                    ~{wod.duree_estimee_minutes} min
                  </span>
                )}
                {wod.niveau ? (
                  <span className="rounded-full border border-[#333] px-3 py-1 text-xs text-gray-300">
                    {wod.niveau}
                  </span>
                ) : null}
              </div>
              {musclePills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {musclePills.map((m) => (
                    <span key={m} className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-xs text-gray-400">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {wod.echauffement ? (
              <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-4">
                <h2 className="mb-2 font-semibold text-green-300">Échauffement</h2>
                <textarea
                  value={wod.echauffement}
                  onChange={(e) => setWod({ ...wod, echauffement: e.target.value })}
                  rows={3}
                  className="w-full resize-none border-b border-green-900/50 bg-transparent text-sm text-gray-200 outline-none focus:border-green-500"
                />
              </div>
            ) : null}

            <div>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">Exercices</h2>
              <ul className="space-y-3">
                {(wod.exercices ?? []).map((ex, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4"
                  >
                    <div className="flex justify-between gap-2">
                      <input
                        type="text"
                        value={ex.nom}
                        onChange={(e) => updateExercise(i, { nom: e.target.value })}
                        className="flex-1 border-b border-[#333] bg-transparent font-medium text-white outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => removeExercise(i)}
                        className="shrink-0 text-sm text-red-400 hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <label className="text-gray-500">
                        Séries
                        <input
                          type="text"
                          value={ex.series != null ? String(ex.series) : ""}
                          onChange={(e) => updateExercise(i, { series: e.target.value })}
                          className="mt-0.5 w-full border-b border-[#333] bg-transparent text-gray-200 outline-none focus:border-primary"
                        />
                      </label>
                      <label className="text-gray-500">
                        Reps
                        <input
                          type="text"
                          value={ex.repetitions != null ? String(ex.repetitions) : ""}
                          onChange={(e) => updateExercise(i, { repetitions: e.target.value })}
                          className="mt-0.5 w-full border-b border-[#333] bg-transparent text-gray-200 outline-none focus:border-primary"
                        />
                      </label>
                      <label className="text-gray-500">
                        Poids
                        <input
                          type="text"
                          value={ex.poids != null ? String(ex.poids) : ""}
                          onChange={(e) => updateExercise(i, { poids: e.target.value })}
                          className="mt-0.5 w-full border-b border-[#333] bg-transparent text-gray-200 outline-none focus:border-primary"
                        />
                      </label>
                    </div>
                    <label className="mt-2 block text-xs text-gray-500">
                      Note
                      <input
                        type="text"
                        value={ex.note != null ? String(ex.note) : ""}
                        onChange={(e) => updateExercise(i, { note: e.target.value })}
                        className="mt-0.5 w-full border-b border-[#333] bg-transparent text-sm text-gray-300 outline-none focus:border-primary"
                      />
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addExercise}
                className="mt-3 w-full rounded-lg border border-dashed border-[#333] py-2 text-sm text-gray-400 hover:border-primary hover:text-primary"
              >
                ➕ Ajouter un exercice
              </button>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-gray-500">Transitions</h2>
              <ul className="space-y-2">
                {(wod.transitions ?? []).map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={t}
                      onChange={(e) => updateTransition(i, e.target.value)}
                      className="flex-1 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-sm text-gray-200 outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeTransition(i)}
                      className="text-gray-500 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addTransition}
                className="mt-2 text-sm text-primary hover:underline"
              >
                + Ajouter une transition
              </button>
            </div>

            <label className="block">
              <span className="text-xs uppercase text-gray-500">Notes générales</span>
              <textarea
                value={wod.notes_generales ?? ""}
                onChange={(e) => setWod({ ...wod, notes_generales: e.target.value })}
                rows={2}
                className="mt-1 w-full border-b border-[#333] bg-transparent text-gray-200 outline-none focus:border-primary"
              />
            </label>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="w-full rounded-xl bg-primary py-3.5 font-semibold text-white disabled:opacity-50"
              >
                {saveMutation.isPending ? "Sauvegarde..." : "💾 Sauvegarder ce WOD"}
              </button>
              <button
                type="button"
                onClick={rescan}
                className="w-full rounded-xl border border-[#1a1a1a] py-3 text-gray-300 hover:bg-[#1a1a1a]"
              >
                🔄 Rescanner
              </button>
              <button
                type="button"
                onClick={() => setManualEdit((v) => !v)}
                className="w-full rounded-xl border border-[#1a1a1a] py-3 text-gray-300 hover:bg-[#1a1a1a]"
              >
                ✏️ Tout modifier manuellement
              </button>
            </div>

            {saved && (
              <div className="rounded-xl border border-green-500/40 bg-green-950/30 p-4 text-center">
                <p className="font-medium text-green-400">✅ WOD sauvegardé !</p>
                <p className="mt-1 text-xs text-gray-500">ID : {savedRowId}</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Link
                    to="/workout"
                    className="rounded-lg bg-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/30"
                  >
                    Voir mon WOD →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setScoreOpen(true)}
                    className="rounded-lg border border-[#333] px-4 py-2 text-sm text-gray-200 hover:bg-[#1a1a1a]"
                  >
                    Marquer comme terminé ✓
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {scoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-6 sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-white">Enregistrer ton score</h3>
            <p className="mt-1 text-sm text-gray-500">Temps (MM:SS), tours, notes</p>
            <label className="mt-4 block text-sm text-gray-400">
              Temps (ex. 12:34)
              <input
                type="text"
                value={scoreTime}
                onChange={(e) => setScoreTime(e.target.value)}
                placeholder="MM:SS"
                className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-white"
              />
            </label>
            <label className="mt-3 block text-sm text-gray-400">
              Tours complétés
              <input
                type="text"
                value={scoreRounds}
                onChange={(e) => setScoreRounds(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-white"
              />
            </label>
            <label className="mt-3 block text-sm text-gray-400">
              Notes / observations
              <textarea
                value={scoreNotes}
                onChange={(e) => setScoreNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-white"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setScoreOpen(false)}
                className="flex-1 rounded-lg border border-[#333] py-2 text-gray-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="flex-1 rounded-lg bg-primary py-2 font-medium text-white disabled:opacity-50"
              >
                {completeMutation.isPending ? "..." : "Sauvegarder le score"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
