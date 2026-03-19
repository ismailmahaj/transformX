import { useMemo, useRef, useState } from "react";
import { api } from "../lib/api";

export interface ProgressPhoto {
  id: string;
  date: string;
  cloudinary_url: string;
  cloudinary_public_id: string;
  created_at: string;
}

interface PhotoUploadProps {
  photos: ProgressPhoto[];
  onUploaded: () => void;
}

function formatDateFr(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function PhotoUpload({ photos, onUploaded }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...photos].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [photos]
  );
  const before = sorted[0] ?? null;
  const after = sorted.length ? sorted[sorted.length - 1] : null;

  const handlePick = () => inputRef.current?.click();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      await api.post("/progress/photos", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded();
    } catch (err) {
      setError("Impossible d'envoyer la photo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Photos avant / après</h3>
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="rounded-lg bg-primary px-4 py-2 text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {uploading ? "Envoi..." : "Uploader une photo"}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1a1a1a] text-sm text-gray-400">Avant</div>
            {before ? (
              <div>
                <img src={before.cloudinary_url} alt="Avant" className="w-full h-40 object-cover" />
                <div className="px-3 py-2 text-xs text-gray-500">{formatDateFr(before.date)}</div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-500 text-sm">Aucune photo</div>
            )}
          </div>

          <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden">
            <div className="px-3 py-2 border-b border-[#1a1a1a] text-sm text-gray-400">Après</div>
            {after ? (
              <div>
                <img src={after.cloudinary_url} alt="Après" className="w-full h-40 object-cover" />
                <div className="px-3 py-2 text-xs text-gray-500">{formatDateFr(after.date)}</div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-500 text-sm">Aucune photo</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
        <h4 className="text-white font-semibold mb-3">Galerie</h4>
        {!sorted.length ? (
          <p className="text-gray-500 text-sm">Aucune photo pour le moment.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {sorted
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="group rounded-lg overflow-hidden border border-[#1a1a1a] bg-[#0a0a0a]"
                  onClick={() => window.open(p.cloudinary_url, "_blank")}
                  title="Voir en grand"
                >
                  <img src={p.cloudinary_url} alt="Progression" className="h-24 w-full object-cover group-hover:opacity-90 transition-opacity" />
                  <div className="px-2 py-1 text-[10px] text-gray-500 truncate">{formatDateFr(p.date)}</div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

