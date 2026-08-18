import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import type { SubmissionResult } from "../../types"

interface PercentileChartProps {
  results: SubmissionResult[]
}

export const PercentileChart = ({ results }: PercentileChartProps) => {
  const sortedData = [...results]
    .sort((a, b) => a.percentile - b.percentile)
    .map(r => ({
      percentile: r.percentile,
      score: r.final_score,
      id: r.submission_id
    }))

  const scores = results.map(r => r.final_score).sort((a, b) => a - b)
  const median = scores.length > 0 ? (
    scores.length % 2 === 0 
      ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2 
      : scores[Math.floor(scores.length / 2)]
  ).toFixed(1) : "0.0"

  const mean = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0
  const stdDev = scores.length > 0 ? Math.sqrt(
    scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
  ).toFixed(1) : "0.0"

  return (
    <div className="w-full bg-surface-700 rounded-xl border border-surface-500 p-5">
      <h3 className="text-sm font-medium text-white">Score Percentile Curve</h3>
      <p className="text-xs text-surface-400 mt-0.5 mb-6">Each submission's score vs its cohort percentile</p>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={sortedData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
          <XAxis 
            dataKey="percentile" 
            tick={{ fill: "#888780", fontSize: 11 }} 
            axisLine={false} 
            tickLine={false} 
            tickFormatter={(v) => `${Number(v).toFixed(0)}%`} 
          />
          <YAxis 
            domain={[0, 100]} 
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
            formatter={(value: number, name: string) => [
              name === "score" ? `${value.toFixed(1)}/100` : value,
              name === "score" ? "Score" : "Submission"
            ]}
            labelFormatter={(label) => `${Number(label).toFixed(1)}th percentile`}
          />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#1D9E75" 
            strokeWidth={2} 
            fill="url(#scoreGradient)" 
            dot={{ fill: "#1D9E75", r: 3, strokeWidth: 0 }} 
            activeDot={{ r: 5, fill: "#1D9E75" }} 
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex flex-row gap-4 mt-4 justify-center items-center">
        <span className="text-xs text-surface-400">Median: {median}</span>
        <span className="text-surface-600">|</span>
        <span className="text-xs text-surface-400">Std dev: {stdDev}</span>
      </div>
    </div>
  )
}
