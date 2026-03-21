import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type Point = { date: string; weight: number };

interface WeightChartProps {
  data: Point[];
  startWeight: number;
  goalWeight: number;
}

function formatDateShort(iso: string) {
  // iso: YYYY-MM-DD
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

export function WeightChart({ data, startWeight, goalWeight }: WeightChartProps) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-6 text-gray-400">
        Aucune donnée yet — commence à logger ton poids
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1a1a1a] bg-[#0f0f0f] p-4">
      <div className="h-[200px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={200} minWidth={0}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={formatDateShort}
              axisLine={{ stroke: "#1a1a1a" }}
              tickLine={{ stroke: "#1a1a1a" }}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={{ stroke: "#1a1a1a" }}
              tickLine={{ stroke: "#1a1a1a" }}
              domain={["dataMin - 2", "dataMax + 2"]}
              tickFormatter={(v) => `${v} kg`}
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #1a1a1a",
                borderRadius: 12,
                color: "#fff",
              }}
              labelStyle={{ color: "#9ca3af" }}
              formatter={(value: unknown) => [`${value} kg`, "Poids"]}
              labelFormatter={(label) => `Date : ${label}`}
            />
            <ReferenceLine
              y={startWeight}
              stroke="#9ca3af"
              strokeDasharray="4 4"
              label={{ value: `Départ ${startWeight} kg`, fill: "#9ca3af", position: "insideTopLeft" }}
            />
            <ReferenceLine
              y={goalWeight}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{ value: `Objectif ${goalWeight} kg`, fill: "#22c55e", position: "insideBottomLeft" }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#f97316"
              strokeWidth={3}
              dot={{ r: 3, fill: "#f97316" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

