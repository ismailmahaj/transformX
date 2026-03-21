import { useEffect, useMemo, useState } from "react";
import type { WorkoutExercise } from "../types/api";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: WorkoutExercise | null;
}

export function VideoModal({ isOpen, onClose, exercise }: VideoModalProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const videoId = exercise?.video_id ?? null;
  const embedUrl = useMemo(() => {
    if (!videoId) return null;
    const autoplay = isMobile ? "0" : "1";
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay}&rel=0&playsinline=1`;
  }, [videoId, isMobile]);

  if (!isOpen || !exercise || !videoId || !embedUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 transition-opacity duration-200">
      <button
        type="button"
        aria-label="Fermer la vidéo"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center">
        <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[600px] rounded-t-2xl md:rounded-2xl border border-[#1a1a1a] bg-[#0f0f0f] p-4 md:p-5 overflow-y-auto transition-transform duration-200">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className="text-white text-lg font-semibold">{exercise.name ?? "Démo exercice"}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#2a2a2a] px-2 py-1 text-sm text-gray-300 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#1a1a1a]">
            <iframe
              title={`Démo ${exercise.name ?? "exercice"}`}
              src={embedUrl}
              width="100%"
              height="315"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>

          <div className="mt-4 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-3">
            <p className="text-sm text-gray-300">
              Rappel: {exercise.sets ?? "—"} séries × {exercise.reps ?? "—"} répétitions
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Conseil: {exercise.note?.trim() ? exercise.note : "Concentre-toi sur la technique et l’amplitude."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
