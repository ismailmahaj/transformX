import { useMemo, useState } from "react";

type Measurements = Record<string, number>;

export interface MeasurementFields {
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  left_arm_cm?: number;
  thigh_cm?: number;
}

interface MeasurementsFormProps {
  lastMeasurements: Measurements | null;
  onSubmit: (measurements: MeasurementFields) => Promise<void> | void;
  isLoading?: boolean;
}

function lastValue(last: Measurements | null, key: string) {
  const v = last?.[key];
  return typeof v === "number" ? `${v} cm` : "—";
}

export function MeasurementsForm({ lastMeasurements, onSubmit, isLoading }: MeasurementsFormProps) {
  const [values, setValues] = useState<MeasurementFields>({});

  const fields = useMemo(
    () => [
      { key: "chest_cm", label: "Tour de poitrine (cm)" },
      { key: "waist_cm", label: "Tour de taille (cm)" },
      { key: "hips_cm", label: "Tour de hanches (cm)" },
      { key: "left_arm_cm", label: "Tour de bras gauche (cm)" },
      { key: "thigh_cm", label: "Tour de cuisse (cm)" },
    ] as const,
    []
  );

  const handleChange = (key: keyof MeasurementFields, raw: string) => {
    const n = Number(raw);
    setValues((prev) => ({ ...prev, [key]: Number.isFinite(n) && n > 0 ? n : undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(values);
    setValues({});
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Mensurations</h3>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-primary px-4 py-2 text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          Enregistrer les mensurations
        </button>
      </div>

      <div className="grid gap-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-300">{f.label}</span>
              <span className="text-xs text-gray-500">Dernier : {lastValue(lastMeasurements, f.key)}</span>
            </div>
            <input
              type="number"
              inputMode="decimal"
              step={0.1}
              min={0}
              value={(values as Record<string, number | undefined>)[f.key] ?? ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
              className="w-full rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] px-3 py-2 text-white placeholder-gray-600"
              placeholder="0"
            />
          </label>
        ))}
      </div>
    </form>
  );
}

