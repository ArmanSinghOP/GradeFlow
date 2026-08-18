import { useEffect } from "react"
import { X, Plus, RefreshCw } from "lucide-react"
import type { RubricDefinition, RubricCriterion } from "../../types"

interface RubricStepProps {
  rubric: Partial<RubricDefinition>
  onChange: (rubric: Partial<RubricDefinition>) => void
}

const DEFAULT_CRITERIA: RubricCriterion[] = [
  { name: "Argument", description: "Strength of argument", weight: 0.5, max_score: 10 },
  { name: "Evidence", description: "Quality of evidence", weight: 0.3, max_score: 10 },
  { name: "Clarity", description: "Clarity of writing", weight: 0.2, max_score: 10 },
]

export function RubricStep({ rubric, onChange }: RubricStepProps) {
  useEffect(() => {
    if (!rubric.criteria || rubric.criteria.length === 0) {
      onChange({ ...rubric, criteria: DEFAULT_CRITERIA })
    }
  }, [])

  const criteria = rubric.criteria || []

  const handleUpdate = (field: keyof RubricDefinition, value: string | RubricCriterion[]) => {
    onChange({ ...rubric, [field]: value })
  }

  const updateCriterion = (index: number, field: keyof RubricCriterion, value: string | number) => {
    const updated = [...criteria]
    updated[index] = { ...updated[index], [field]: value }
    handleUpdate("criteria", updated)
  }

  const removeCriterion = (index: number) => {
    if (criteria.length <= 1) return
    const updated = [...criteria]
    updated.splice(index, 1)
    handleUpdate("criteria", updated)
  }

  const addCriterion = () => {
    handleUpdate("criteria", [
      ...criteria,
      { name: "", description: "", weight: 0.1, max_score: 10 },
    ])
  }

  const autoBalance = () => {
    if (criteria.length === 0) return
    const n = criteria.length
    const baseWeight = Math.round((1 / n) * 1000) / 1000
    const updated = criteria.map((c) => ({ ...c, weight: baseWeight }))
    
    // Fix remainder on the last one
    const sum = updated.slice(0, n - 1).reduce((s, c) => s + c.weight, 0)
    updated[n - 1].weight = Math.max(0, Math.round((1.0 - sum) * 1000) / 1000)
    
    handleUpdate("criteria", updated)
  }

  const weightSum = criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0)
  const isBalanced = Math.abs(weightSum - 1.0) < 0.001

  // Prevent Enter logic
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") e.preventDefault()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-surface-200">Rubric Name</label>
          <input
            type="text"
            value={rubric.name || ""}
            onChange={(e) => handleUpdate("name", e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Standard Essay Rubric"
            className="bg-surface-700 border border-surface-500 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-400 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-sm font-medium text-surface-200">Description</label>
          <textarea
            value={rubric.description || ""}
            onChange={(e) => handleUpdate("description", e.target.value)}
            placeholder="Brief description of this rubric's usage"
            rows={2}
            className="bg-surface-700 border border-surface-500 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-400 transition-colors resize-y"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-surface-600 pt-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-white">Evaluation Criteria</h3>
          <div className="flex items-center gap-4">
            <div className={`text-sm font-medium px-3 py-1 rounded ${isBalanced ? "bg-brand-400/20 text-brand-400 border border-brand-400/30" : "bg-red-400/20 text-red-400 border border-red-400/30"}`}>
              Weights sum: {weightSum.toFixed(3)} / 1.00
            </div>
            <button
              onClick={autoBalance}
              className="flex items-center gap-1.5 text-xs text-surface-200 bg-surface-600 hover:bg-surface-500 px-2 py-1.5 rounded transition-colors border border-surface-500"
              title="Distribute weights evenly"
            >
              <RefreshCw size={14} />
              Auto-balance
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {criteria.map((criterion, index) => (
            <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 bg-surface-800 p-3 rounded-lg border border-surface-600 items-start">
              <div className="flex flex-col gap-1 w-full md:w-1/4">
                <label className="text-xs text-surface-400">Name</label>
                <input
                  type="text"
                  value={criterion.name}
                  onChange={(e) => updateCriterion(index, "name", e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Criterion Name"
                  className="bg-surface-700 border border-surface-500 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-400 w-full"
                />
              </div>
              <div className="flex flex-col gap-1 w-full md:w-2/5">
                <label className="text-xs text-surface-400">Description</label>
                <input
                  type="text"
                  value={criterion.description}
                  onChange={(e) => updateCriterion(index, "description", e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Detail what to look for..."
                  className="bg-surface-700 border border-surface-500 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-400 w-full"
                />
              </div>
              <div className="flex flex-col gap-1 w-[45%] md:w-1/6">
                <label className="text-xs text-surface-400">Weight</label>
                <input
                  type="number"
                  min="0.01"
                  max="1.0"
                  step="0.05"
                  value={criterion.weight}
                  onChange={(e) => updateCriterion(index, "weight", parseFloat(e.target.value) || 0)}
                  onKeyDown={handleKeyDown}
                  className="bg-surface-700 border border-surface-500 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-400 w-full"
                />
              </div>
              <div className="flex flex-col gap-1 w-[40%] md:w-1/6 relative pr-8">
                <label className="text-xs text-surface-400">Max Score</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={criterion.max_score}
                  onChange={(e) => updateCriterion(index, "max_score", parseFloat(e.target.value) || 10)}
                  onKeyDown={handleKeyDown}
                  className="bg-surface-700 border border-surface-500 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-400 w-full"
                />
                <button
                  onClick={() => removeCriterion(index)}
                  disabled={criteria.length <= 1}
                  className="absolute right-0 top-6 text-surface-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-surface-400 transition-colors"
                  title="Remove criterion"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-start mt-2">
          <button
            onClick={addCriterion}
            className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors"
          >
            <Plus size={16} />
            Add Criterion
          </button>
        </div>
      </div>
    </div>
  )
}
