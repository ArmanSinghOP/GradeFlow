import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { SubmissionResult } from "../../types"

interface ScoreDistributionChartProps {
  results: SubmissionResult[]
}

const getBarColor = (range: string) => {
  const start = parseInt(range.split("-")[0])
  if (start >= 90) return "#1D9E75"
  if (start >= 80) return "#5DCAA5"
  if (start >= 70) return "#378ADD"
  if (start >= 60) return "#EF9F27"
  return "#E24B4A"
}

export const ScoreDistributionChart = ({ results }: ScoreDistributionChartProps) => {
  const bins = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${(i + 1) * 10}`,
    count: results.filter((r) =>
      r.final_score >= i * 10 &&
      r.final_score < (i + 1) * 10 + (i === 9 ? 1 : 0)
    ).length
  }))

  return (
    <div className="w-full bg-surface-700 rounded-xl border border-surface-500 p-5">
      <h3 className="text-sm font-medium text-white">Score Distribution</h3>
      <p className="text-xs text-surface-400 mt-0.5 mb-6">How scores are distributed across the cohort</p>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={bins} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
          <XAxis 
            dataKey="range" 
            tick={{ fill: "#888780", fontSize: 11 }} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            tick={{ fill: "#888780", fontSize: 11 }} 
            axisLine={false} 
            tickLine={false} 
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1A1A1A",
              border: "1px solid #2A2A2A",
              borderRadius: "8px",
              color: "#ffffff"
            }}
            formatter={(value: number) => [value, "Submissions"]}
            cursor={{ fill: '#2A2A2A', opacity: 0.4 }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {bins.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.range)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-row gap-3 mt-4 justify-center items-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#1D9E75]" />
          <span className="text-xs text-surface-400">A (90+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#5DCAA5]" />
          <span className="text-xs text-surface-400">B (80-89)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#378ADD]" />
          <span className="text-xs text-surface-400">C (70-79)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#EF9F27]" />
          <span className="text-xs text-surface-400">D (60-69)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#E24B4A]" />
          <span className="text-xs text-surface-400">F (&lt;60)</span>
        </div>
      </div>
    </div>
  )
}
