import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";
import { getCurrentDay, getPhase } from "../lib/dayUtils";
import { ExerciseCard } from "../components/ExerciseCard";
import { WorkoutTimer } from "../components/WorkoutTimer";
import { BottomNav } from "../components/BottomNav";
import { VideoModal } from "../components/VideoModal";
import type { Workout, WorkoutExercise } from "../types/api";
import type { ScannedWodData, ScannedWodRow } from "../types/wodScan";

const TAB_STORAGE_KEY = "workout.tab";

function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface WorkoutResponse {
  day_number?: number;
  workout: Workout;
}

interface WeekDayPayload {
  day_number: number;
  date: string;
  day_name: string;
  is_today: boolean;
  is_past: boolean;
  day_type: "training" | "rest" | "active_rest";
  workout: Workout | null;
}

interface WeekWorkoutResponse {
  week: WeekDayPayload[];
  current_day: number;
  goal_type: string;
  summary: {
    seances_cette_semaine: number;
    volume_total_exercices: number;
    jours_repos: number;
    intensite_moyenne: "haute" | "moyenne" | "basse";
  };
}

type TabId = "today" | "week";

function estimateDurationMinutes(exercises: WorkoutExercise[]): number {
  if (!Array.isArray(exercises) || exercises.length === 0) return 0;
  let totalSec = 0;
  for (const ex of exercises) {
    const sets = Number(ex.sets) || 3;
    const reps = Number(ex.reps) || 10;
    const rest = ex.rest_seconds ?? 60;
    totalSec += sets * (Math.min(Number(reps) * 3, 90) + rest);
  }
  return Math.round(totalSec / 60);
}

function capitalizeFr(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDayHeaderFr(dateIso: string) {
  const d = new Date(`${dateIso}T12:00:00`);
  return capitalizeFr(
    d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
  );
}

function intensityLabel(v: "haute" | "moyenne" | "basse") {
  if (v === "haute") return "Élevée";
  if (v === "moyenne") return "Moyenne";
  return "Basse";
}

export default function Workout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentDay = getCurrentDay(user?.created_at);
  const dayFromState = (location.state as { day?: number } | null)?.day;
  const day = dayFromState ?? currentDay;

  const [tab, setTab] = useState<TabId>(() => {
    try {
      const s = localStorage.getItem(TAB_STORAGE_KEY);
      if (s === "week" || s === "today") return s;
    } catch {
      /* ignore */
    }
    return "today";
  });

  useEffect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [completeSuccess, setCompleteSuccess] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<WorkoutExercise | null>(null);
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(0);
  const [scannedScoreOpen, setScannedScoreOpen] = useState(false);
  const [sTime, setSTime] = useState("");
  const [sRounds, setSRounds] = useState("");
  const [sNotes, setSNotes] = useState("");

  const todayIso = useMemo(() => todayIsoLocal(), []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["workouts", day],
    queryFn: async () => {
      const { data: res } = await api.get<WorkoutResponse>(`/workouts/${day}`);
      return res;
    },
    enabled: tab === "today" && day >= 1 && day <= 180,
  });

  const {
    data: weekData,
    isLoading: weekLoading,
    error: weekError,
  } = useQuery({
    queryKey: ["workouts", "week"],
    queryFn: async () => {
      const { data: res } = await api.get<WeekWorkoutResponse>("/workouts/week");
      return res;
    },
    enabled: tab === "week",
  });

  const { data: scannedWodRow } = useQuery({
    queryKey: ["coach", "scanned-wod", todayIso],
    queryFn: async () => {
      const { data: res } = await api.get<{ scanned_wod: ScannedWodRow | null }>(`/coach/wod/${todayIso}`);
      return res.scanned_wod;
    },
    enabled: tab === "today" && day >= 1 && day <= 180 && day === currentDay,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await api.post("/logs", {
        day_number: day,
        workout_done: true,
        xp_earned: 50,
      });
      await api.post("/streaks/update");
    },
    onSuccess: () => {
      setCompleteSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["workouts", "today"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      setTimeout(() => navigate("/dashboard"), 2000);
    },
  });

  const completeScannedMutation = useMutation({
    mutationFn: async () => {
      const parts: string[] = [];
      if (sTime.trim()) parts.push(`Temps: ${sTime.trim()}`);
      if (sRounds.trim()) parts.push(`Tours: ${sRounds.trim()}`);
      if (sNotes.trim()) parts.push(`Notes: ${sNotes.trim()}`);
      const scoreStr = parts.join(" · ") || "Terminé";
      await api.post("/logs", {
        day_number: day,
        workout_done: true,
        xp_earned: 50,
      });
      await api.post("/streaks/update");
      await api.put(`/coach/wod/${todayIso}/complete`, {
        score: scoreStr,
        notes: sNotes.trim() || null,
      });
    },
    onSuccess: () => {
      setScannedScoreOpen(false);
      setCompleteSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["coach", "scanned-wod", todayIso] });
      queryClient.invalidateQueries({ queryKey: ["workouts", "today"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["streaks"] });
      setTimeout(() => navigate("/dashboard"), 2000);
    },
  });

  const toggleExercise = (index: number) => {
    setCompletedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const openVideo = (exercise: WorkoutExercise) => {
    if (!exercise.video_id) return;
    setSelectedExercise(exercise);
    setIsVideoOpen(true);
  };

  const workout = data?.workout;
  const dayNumber = data?.day_number ?? day;
  const phase = getPhase(dayNumber);
  const isRestDay = workout?.is_rest_day ?? false;
  const exercises = (workout?.exercises ?? []) as WorkoutExercise[];
  const estimatedMin = estimateDurationMinutes(exercises);

  const goalType = workout?.goal_type;
  const programBadge = goalType === "muscle"
    ? { label: "💪 Musculation", className: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/30" }
    : goalType === "mixed"
      ? { label: "⚡ Mix", className: "bg-[#a855f7]/15 text-[#a855f7] border-[#a855f7]/30" }
      : { label: "🔥 CrossFit", className: "bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30" };

  const isCrossfitStyleSession = Boolean(
    goalType === "crossfit" ||
      (goalType === "mixed" && !(workout?.name ?? "").startsWith("Musculation"))
  );

  const showScannedInstead = Boolean(
    scannedWodRow?.wod_data &&
      isCrossfitStyleSession &&
      !isRestDay &&
      day === currentDay
  );

  const showScannerButton =
    tab === "today" &&
    !isRestDay &&
    day === currentDay &&
    isCrossfitStyleSession;

  const scannedWod = (scannedWodRow?.wod_data ?? null) as ScannedWodData | null;

  const recommendationLine = useMemo(() => {
    if (!goalType) return null;
    if (isRestDay) return null;
    if (goalType === "muscle") return "Charge recommandée: 70-80% de votre max";
    if (goalType === "crossfit") return "Format: AMRAP / For Time";
    if (goalType === "mixed") {
      const name = workout?.name ?? "";
      const subtype = name.startsWith("Musculation — ") ? "Musculation" : "CrossFit";
      return `Aujourd&apos;hui: ${subtype}`;
    }
    return null;
  }, [goalType, workout?.name, isRestDay]);

  const dayTypeBadge = (t: WeekDayPayload["day_type"]) => {
    if (t === "training") {
      return (
        <span className="rounded-full border border-orange-500/40 bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-300">
          💪 Entraînement
        </span>
      );
    }
    if (t === "active_rest") {
      return (
        <span className="rounded-full border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-300">
          🚶 Repos actif
        </span>
      );
    }
    return (
      <span className="rounded-full border border-gray-600/50 bg-gray-800/50 px-2 py-0.5 text-xs font-medium text-gray-400">
        😴 Repos
      </span>
    );
  };

  const cardShellClass = (d: WeekDayPayload, open: boolean) => {
    const base = "overflow-hidden rounded-xl border transition-all duration-300";
    const past = d.is_past ? "opacity-50" : "";
    const ring = d.is_today ? "ring-2 ring-orange-500" : "";
    let tint = "border-[#1a1a1a] bg-[#0f0f0f]";
    if (d.is_today) tint = "border-orange-500/50 bg-orange-500/5";
    else if (d.day_type === "training") tint = "border-orange-500/20 bg-orange-500/[0.07]";
    else if (d.day_type === "active_rest") tint = "border-blue-500/25 bg-blue-500/10";
    else if (d.day_type === "rest") tint = "border-[#1a1a1a] bg-[#0f0f0f]";
    return `${base} ${tint} ${past} ${ring} ${open ? "shadow-lg shadow-black/20" : ""}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      <header className="sticky top-0 z-10 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#1a1a1a] hover:text-white"
              aria-label="Retour au tableau de bord"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-white">
                {tab === "today" ? "Entraînement du jour" : "Planning de la semaine"}
              </h1>
              {tab === "today" && !isLoading && !error && (
                <>
                  <p className="text-sm text-gray-500">
                    Jour {dayNumber} — Phase {phase}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${programBadge.className}`}>
                      {programBadge.label}
                    </span>
                    {recommendationLine && <p className="text-xs text-gray-400">{recommendationLine}</p>}
                  </div>
                </>
              )}
              {tab === "week" && weekData && (
                <p className="text-sm text-gray-500">
                  Jour programme {weekData.current_day} ·{" "}
                  {weekData.goal_type === "muscle"
                    ? "Musculation"
                    : weekData.goal_type === "mixed"
                      ? "Programme mixte"
                      : "CrossFit"}
                </p>
              )}
            </div>
          </div>

          <div className="flex rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-1">
            <button
              type="button"
              onClick={() => setTab("today")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "today" ? "bg-primary/20 text-primary" : "text-gray-400 hover:text-white"
              }`}
            >
              Aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={() => setTab("week")}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "week" ? "bg-primary/20 text-primary" : "text-gray-400 hover:text-white"
              }`}
            >
              Cette Semaine
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {tab === "today" && isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-2/3 rounded bg-gray-800" />
            <div className="h-24 rounded-xl bg-gray-800" />
            <div className="h-20 rounded-xl bg-gray-800" />
            <div className="h-20 rounded-xl bg-gray-800" />
          </div>
        )}

        {tab === "today" && error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-center">
            <p className="text-red-400">Impossible de charger l&apos;entraînement.</p>
            <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">
              Retour au tableau de bord
            </Link>
          </div>
        )}

        {tab === "today" && !isLoading && !error && workout && isRestDay && (
          <div className="flex flex-col items-center justify-center px-4 py-16">
            <p className="mb-2 text-4xl font-bold text-white">Jour de Repos 💤</p>
            <p className="mb-8 max-w-sm text-center text-gray-400">
              La récupération fait partie du programme. Ton corps se reconstruit aujourd&apos;hui.
            </p>
            <Link
              to="/dashboard"
              className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
            >
              Retour au tableau de bord
            </Link>
          </div>
        )}

        {tab === "today" && !isLoading && !error && workout && !isRestDay && (
          <>
            {showScannerButton && (
              <Link
                to="/wod-scanner"
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 py-3 text-sm font-medium text-orange-300 hover:bg-orange-500/20"
              >
                📸 Scanner le WOD du coach
              </Link>
            )}

            {showScannedInstead && scannedWod ? (
              <>
                <div className="mb-4 rounded-xl border border-primary/40 bg-primary/10 p-3 text-center text-sm text-orange-200">
                  WOD scanné du jour — remplace la séance programme
                </div>
                <div className="mb-6 rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{scannedWod.nom}</h2>
                      <p className="mt-0.5 text-sm text-gray-400">
                        {scannedWod.format}
                        {scannedWod.duree_estimee_minutes != null && ` · ~${scannedWod.duree_estimee_minutes} min`}
                        {` · ${(scannedWod.exercices ?? []).length} exercice${(scannedWod.exercices ?? []).length !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
                        Phase {phase}
                      </span>
                      <Link to="/wod-scanner" className="text-xs text-primary hover:underline">
                        Modifier le WOD →
                      </Link>
                    </div>
                  </div>
                </div>

                {scannedWod.echauffement ? (
                  <div className="mb-6 rounded-xl border border-green-500/30 bg-green-950/20 p-4">
                    <h3 className="mb-1 text-sm font-medium text-green-300">Échauffement</h3>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{scannedWod.echauffement}</p>
                  </div>
                ) : null}

                <div className="mb-6">
                  <WorkoutTimer />
                </div>

                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
                  Exercices
                </h3>
                <ul className="space-y-3">
                  {(scannedWod.exercices ?? []).map((ex, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4"
                    >
                      <p className="font-semibold text-white">{ex.nom}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {ex.series != null && ex.series !== "" && `Séries : ${String(ex.series)}`}
                        {ex.repetitions != null && ex.repetitions !== "" && ` · Reps : ${String(ex.repetitions)}`}
                        {ex.poids != null && ex.poids !== "" && ` · Poids : ${String(ex.poids)}`}
                      </p>
                      {ex.note != null && String(ex.note) !== "" && (
                        <p className="mt-2 text-xs text-gray-500">Note : {String(ex.note)}</p>
                      )}
                    </li>
                  ))}
                </ul>

                {(scannedWod.transitions ?? []).length > 0 && (
                  <div className="mt-4 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-4">
                    <h3 className="mb-2 text-sm font-medium text-gray-500">Transitions</h3>
                    <ul className="list-inside list-disc text-sm text-gray-300">
                      {(scannedWod.transitions ?? []).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {scannedWod.notes_generales ? (
                  <p className="mt-4 text-sm text-gray-400">{scannedWod.notes_generales}</p>
                ) : null}

                <div className="mt-8">
                  {completeSuccess ? (
                    <div className="rounded-xl border border-green-500/50 bg-green-950/30 p-4 text-center">
                      <p className="font-medium text-green-400">Séance terminée ! +50 XP 🎉</p>
                      <p className="mt-1 text-sm text-gray-500">Redirection...</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setScannedScoreOpen(true)}
                      disabled={completeScannedMutation.isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Terminer la séance ✓
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{workout.name}</h2>
                      <p className="mt-0.5 text-sm text-gray-400">
                        {exercises.length} exercice{exercises.length !== 1 ? "s" : ""}
                        {estimatedMin > 0 && ` · ~${estimatedMin} min`}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
                      Phase {phase}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <WorkoutTimer />
                </div>

                <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
                  Exercices
                </h3>
                <ul className="space-y-3">
                  {exercises.map((ex, i) => (
                    <li key={i}>
                      <ExerciseCard
                        exercise={ex}
                        index={i + 1}
                        checked={completedExercises.has(i)}
                        onToggle={() => toggleExercise(i)}
                        onOpenVideo={() => openVideo(ex)}
                      />
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {completeSuccess ? (
                    <div className="rounded-xl border border-green-500/50 bg-green-950/30 p-4 text-center">
                      <p className="font-medium text-green-400">Séance terminée ! +50 XP 🎉</p>
                      <p className="mt-1 text-sm text-gray-500">Redirection...</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => completeMutation.mutate()}
                      disabled={completeMutation.isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {completeMutation.isPending ? "Enregistrement..." : "Terminer la séance ✓"}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {scannedScoreOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-6 sm:rounded-2xl">
              <h3 className="text-lg font-semibold text-white">Enregistrer ton score</h3>
              <label className="mt-4 block text-sm text-gray-400">
                Temps (MM:SS)
                <input
                  type="text"
                  value={sTime}
                  onChange={(e) => setSTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-white"
                />
              </label>
              <label className="mt-3 block text-sm text-gray-400">
                Tours complétés
                <input
                  type="text"
                  value={sRounds}
                  onChange={(e) => setSRounds(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-white"
                />
              </label>
              <label className="mt-3 block text-sm text-gray-400">
                Notes
                <textarea
                  value={sNotes}
                  onChange={(e) => setSNotes(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-white"
                />
              </label>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setScannedScoreOpen(false)}
                  className="flex-1 rounded-lg border border-[#333] py-2 text-gray-300"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => completeScannedMutation.mutate()}
                  disabled={completeScannedMutation.isPending}
                  className="flex-1 rounded-lg bg-primary py-2 font-medium text-white disabled:opacity-50"
                >
                  {completeScannedMutation.isPending ? "..." : "Valider"}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "week" && (
          <div className="space-y-4">
            {weekLoading && (
              <div className="space-y-3 animate-pulse">
                <div className="h-24 rounded-xl bg-green-950/30" />
                <div className="h-20 rounded-xl bg-gray-800" />
                <div className="h-20 rounded-xl bg-gray-800" />
                <div className="h-20 rounded-xl bg-gray-800" />
              </div>
            )}

            {weekError && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-center text-sm text-red-400">
                Impossible de charger la semaine.
              </div>
            )}

            {!weekLoading && !weekError && weekData && (
              <>
                <div className="rounded-xl border border-green-500/30 bg-green-950/20 p-4">
                  <h2 className="mb-3 font-semibold text-white">📊 Semaine en un coup d&apos;œil</h2>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>
                      Séances cette semaine :{" "}
                      <strong className="text-white">
                        {weekData.summary.seances_cette_semaine}/7
                      </strong>
                    </li>
                    <li>
                      Volume total estimé :{" "}
                      <strong className="text-white">{weekData.summary.volume_total_exercices}</strong>{" "}
                      exercices
                    </li>
                    <li>
                      Jours de repos :{" "}
                      <strong className="text-white">{weekData.summary.jours_repos}</strong>
                    </li>
                    <li>
                      Intensité moyenne :{" "}
                      <strong className="text-white">
                        {intensityLabel(weekData.summary.intensite_moyenne)}
                      </strong>
                    </li>
                  </ul>
                </div>

                <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1 sm:max-h-none">
                  {weekData.week.map((d, i) => {
                    const open = openDayIndex === i;
                    const w = d.workout;
                    const exList = (w?.exercises ?? []) as WorkoutExercise[];
                    const est = estimateDurationMinutes(exList);
                    const ph = w ? getPhase(d.day_number) : null;

                    return (
                      <div key={`${d.date}-${d.day_number}`} className={cardShellClass(d, open)}>
                        <button
                          type="button"
                          onClick={() => setOpenDayIndex(open ? null : i)}
                          className={`flex w-full flex-col gap-2 px-4 py-3 text-left ${
                            d.is_today ? "bg-orange-500/10" : ""
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {formatDayHeaderFr(d.date)}
                              </p>
                              <p className="text-xs text-gray-500">{d.date}</p>
                            </div>
                            <span className="text-gray-500">{open ? "▲" : "▼"}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {dayTypeBadge(d.day_type)}
                            {ph != null && (
                              <span className="rounded-full border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-0.5 text-xs text-gray-300">
                                Phase {ph}
                              </span>
                            )}
                          </div>
                        </button>

                        {open && (
                          <div className="border-t border-[#1a1a1a] px-4 pb-4 pt-2 transition-opacity duration-200">
                            {!w ? (
                              <p className="text-sm text-gray-500">Aucune séance trouvée pour ce jour.</p>
                            ) : w.is_rest_day ? (
                              <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-4">
                                <p className="text-sm text-gray-300">
                                  {d.day_type === "active_rest"
                                    ? "Journée légère : marche, mobilité ou yoga doux. Écoute ton corps et hydrate-toi."
                                    : "Profite de ce repos pour récupérer. Sommeil, hydratation et étirements légers : c’est aussi du travail."}
                                </p>
                              </div>
                            ) : (
                              <>
                                <h3 className="text-lg font-semibold text-white">{w.name}</h3>
                                <p className="mt-1 text-sm text-gray-400">
                                  {exList.length} exercice{exList.length !== 1 ? "s" : ""}
                                  {est > 0 && ` · ~${est} min`}
                                </p>
                                <ul className="mt-4 space-y-3">
                                  {exList.map((ex, j) => (
                                    <li key={j}>
                                      <ExerciseCard
                                        exercise={ex}
                                        index={j + 1}
                                        checked={false}
                                        onToggle={() => {}}
                                        hideCheckbox
                                        onOpenVideo={() => openVideo(ex)}
                                      />
                                    </li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <VideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        exercise={selectedExercise}
      />

      <BottomNav />
    </div>
  );
}
