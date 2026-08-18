import { useState, useEffect, useRef } from "react"
import { X, Upload, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from "lucide-react"
import { createAnchor } from "../../api/anchors"
import { useToast } from "../../hooks/useToast"
import { cn } from "../../utils/cn"
import type { AnchorSetCreate, ContentType, AnchorEntry, AnchorCriterion } from "../../types"

interface CreateAnchorModalProps {
  onClose: () => void
  onSuccess: () => void
}

const DEFAULT_CRITERIA: AnchorCriterion[] = [
  { name: "Argument", weight: 0.5, max_score: 10 },
  { name: "Evidence", weight: 0.3, max_score: 10 },
  { name: "Clarity", weight: 0.2, max_score: 10 }
]

const CONTENT_TYPES: ContentType[] = ["essay", "code", "report", "interview"]
const DIFFICULTIES = ["weak", "developing", "proficient", "strong", "exemplary"] as const

export function CreateAnchorModal({ onClose, onSuccess }: CreateAnchorModalProps) {
  const [activeTab, setActiveTab] = useState<"json" | "form">("json")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Tab A: JSON State
  const [jsonText, setJsonText] = useState("")
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isValidJson, setIsValidJson] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tab B: Form State
  const [formId, setFormId] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formContentType, setFormContentType] = useState<ContentType>("essay")
  const [formRubricName, setFormRubricName] = useState("")
  const [formCriteria, setFormCriteria] = useState<AnchorCriterion[]>(DEFAULT_CRITERIA)
  
  const [formAnchors, setFormAnchors] = useState<AnchorEntry[]>([
    { id: "", content: "", human_scores: {}, final_score: 0, difficulty: "proficient", notes: "" }
  ])
  const [expandedAnchorIndex, setExpandedAnchorIndex] = useState<number>(0)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  // JSON Validation
  useEffect(() => {
    if (!jsonText.trim()) {
      setJsonError(null)
      setIsValidJson(false)
      return
    }
    try {
      JSON.parse(jsonText)
      setJsonError(null)
      setIsValidJson(true)
    } catch (e: any) {
      setJsonError(e.message)
      setIsValidJson(false)
    }
  }, [jsonText])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setJsonText(event.target.result as string)
      }
    }
    reader.readAsText(file)
  }

  const handleJsonSubmit = async () => {
    try {
      setApiError(null)
      const payload = JSON.parse(jsonText)
      setIsSubmitting(true)
      await createAnchor(payload)
      toast.success("Anchor set created successfully")
      onSuccess()
    } catch (err: any) {
      if (err.response?.status === 409) {
        setApiError("An anchor set with this ID already exists.")
      } else if (err.response?.status === 422) {
        const details = err.response.data.detail
        if (Array.isArray(details)) {
          setApiError("Validation errors: " + details.map((d: any) => `${d.loc.join(".")}: ${d.msg}`).join(", "))
        } else {
          setApiError(err.response.data.detail || "Validation failed")
        }
      } else {
        setApiError(err.message || "Failed to create anchor set")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormSubmit = async () => {
    setApiError(null)
    
    // Validate form
    if (!/^[a-zA-Z0-9_-]+$/.test(formId)) {
      setApiError("Invalid anchor set ID. Use only letters, numbers, hyphens, and underscores.")
      return
    }
    if (!formDescription) {
      setApiError("Description is required.")
      return
    }
    if (!formRubricName) {
      setApiError("Rubric name is required.")
      return
    }
    if (formAnchors.length < 5) {
      setApiError("At least 5 anchors are required.")
      return
    }

    const weightSum = formCriteria.reduce((sum, c) => sum + c.weight, 0)
    if (Math.abs(weightSum - 1.0) > 0.01) {
      setApiError(`Criteria weights must sum to 1.0 (currently ${weightSum.toFixed(2)}).`)
      return
    }

    const payload: AnchorSetCreate = {
      anchor_set_id: formId,
      content_type: formContentType,
      description: formDescription,
      version: 1,
      rubric_name: formRubricName,
      rubric_criteria: formCriteria,
      anchors: formAnchors
    }

    try {
      setIsSubmitting(true)
      await createAnchor(payload)
      toast.success("Anchor set created successfully")
      onSuccess()
    } catch (err: any) {
      if (err.response?.status === 409) {
        setApiError("An anchor set with this ID already exists.")
      } else if (err.response?.status === 422) {
        const details = err.response.data.detail
        if (Array.isArray(details)) {
          setApiError("Validation errors: " + details.map((d: any) => `${d.loc.join(".")}: ${d.msg}`).join(", "))
        } else {
          setApiError(err.response.data.detail || "Validation failed")
        }
      } else {
        setApiError(err.message || "Failed to create anchor set")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateAnchorScore = (anchorIndex: number, criterionName: string, scoreStr: string) => {
    const score = parseFloat(scoreStr)
    setFormAnchors(prev => {
      const newAnchors = [...prev]
      const anchor = { ...newAnchors[anchorIndex] }
      const newScores = { ...anchor.human_scores }
      
      if (isNaN(score)) {
        delete newScores[criterionName]
      } else {
        newScores[criterionName] = score
      }
      
      anchor.human_scores = newScores
      
      // Compute final score
      anchor.final_score = formCriteria.reduce((sum, c) => {
        return sum + (newScores[c.name] ?? 0) * c.weight
      }, 0)
      
      newAnchors[anchorIndex] = anchor
      return newAnchors
    })
  }

  const totalWeight = formCriteria.reduce((sum, c) => sum + c.weight, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-2xl bg-surface-800 rounded-xl border border-surface-500 shadow-2xl mt-16 mb-16 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-surface-600">
          <h2 className="text-xl font-semibold text-white">Create Anchor Set</h2>
          <button 
            onClick={onClose}
            className="text-surface-400 hover:text-white p-1 rounded hover:bg-surface-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-surface-600">
          <button
            onClick={() => setActiveTab("json")}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === "json" ? "border-brand-400 text-brand-400" : "border-transparent text-surface-400 hover:text-white"
            )}
          >
            JSON Upload
          </button>
          <button
            onClick={() => setActiveTab("form")}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === "form" ? "border-brand-400 text-brand-400" : "border-transparent text-surface-400 hover:text-white"
            )}
          >
            Quick Form
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto max-h-[calc(80vh-140px)]">
          {activeTab === "json" && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-surface-300">
                  Paste your anchor set JSON below or upload a file.
                </p>
                <div>
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-surface-200 border border-surface-500 rounded px-3 py-1.5 hover:bg-surface-600 transition-colors"
                  >
                    <Upload size={14} />
                    Upload JSON file
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  placeholder={`{\n  "anchor_set_id": "example-v1",\n  "content_type": "essay",\n  "description": "...",\n  "version": 1,\n  "rubric_name": "...",\n  "rubric_criteria": [...],\n  "anchors": [...]\n}`}
                  className="w-full h-64 bg-surface-700 border border-surface-500 rounded-lg p-3 font-mono text-xs text-white placeholder-surface-500 focus:outline-none focus:border-brand-400"
                />
                {jsonText.trim() && (
                  <div className="absolute top-3 right-3 flex items-center">
                    {isValidJson ? (
                      <span className="flex items-center gap-1 text-xs text-brand-400 bg-brand-400/10 px-2 py-1 rounded">
                        <CheckCircle size={12} /> Valid JSON
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                        <AlertCircle size={12} /> Invalid JSON
                      </span>
                    )}
                  </div>
                )}
              </div>
              {jsonError && (
                <div className="text-xs text-red-400 mt-1 font-mono break-all">{jsonError}</div>
              )}

              {apiError && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{apiError}</p>
                </div>
              )}

              <button
                onClick={handleJsonSubmit}
                disabled={!isValidJson || isSubmitting}
                className="w-full py-2.5 bg-brand-400 hover:bg-brand-500 text-surface-900 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Creating..." : "Create Anchor Set"}
              </button>
            </div>
          )}

          {activeTab === "form" && (
            <div className="flex flex-col gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Anchor Set ID</label>
                  <input
                    type="text"
                    value={formId}
                    onChange={e => setFormId(e.target.value)}
                    placeholder="e.g. essay-anchors-v1"
                    className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    placeholder="Brief description of this anchor set"
                    className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Content Type</label>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => setFormContentType(type)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm capitalize border transition-colors",
                          formContentType === type 
                            ? "bg-brand-400/10 border-brand-400 text-brand-300"
                            : "bg-surface-700 border-surface-500 text-surface-300 hover:text-white"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-600">
                  <h3 className="text-sm font-medium text-white mb-3">Rubric Definition</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-1">Rubric Name</label>
                      <input
                        type="text"
                        value={formRubricName}
                        onChange={e => setFormRubricName(e.target.value)}
                        placeholder="e.g. Essay Quality Rubric"
                        className="w-full bg-surface-700 border border-surface-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <label className="block text-sm font-medium text-surface-300">Criteria</label>
                        <span className={cn(
                          "text-xs font-mono px-2 py-0.5 rounded",
                          Math.abs(totalWeight - 1.0) < 0.01 ? "bg-brand-400/20 text-brand-400" : "bg-amber-400/20 text-amber-400"
                        )}>
                          Weight sum: {totalWeight.toFixed(2)}
                        </span>
                      </div>
                      
                      {formCriteria.map((criterion, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={criterion.name}
                            onChange={e => {
                              const newCriteria = [...formCriteria]
                              newCriteria[i].name = e.target.value
                              setFormCriteria(newCriteria)
                            }}
                            placeholder="Criterion name"
                            className="flex-1 bg-surface-700 border border-surface-500 rounded p-2 text-sm text-white"
                          />
                          <input
                            type="number"
                            value={criterion.weight}
                            step="0.1"
                            onChange={e => {
                              const newCriteria = [...formCriteria]
                              newCriteria[i].weight = parseFloat(e.target.value) || 0
                              setFormCriteria(newCriteria)
                            }}
                            className="w-20 bg-surface-700 border border-surface-500 rounded p-2 text-sm text-white"
                            title="Weight (0-1)"
                          />
                          <button
                            onClick={() => setFormCriteria(formCriteria.filter((_, idx) => idx !== i))}
                            className="text-surface-400 hover:text-red-400 p-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      
                      <button
                        onClick={() => setFormCriteria([...formCriteria, { name: "", weight: 0.1, max_score: 10 }])}
                        className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 py-1"
                      >
                        <Plus size={14} /> Add Criterion
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-600">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-white">Anchors</h3>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      formAnchors.length >= 5 ? "bg-brand-400/20 text-brand-400" : "bg-amber-400/20 text-amber-400"
                    )}>
                      {formAnchors.length}/5 required
                    </span>
                  </div>

                  <div className="space-y-3">
                    {formAnchors.map((anchor, i) => (
                      <div key={i} className="border border-surface-500 rounded-lg overflow-hidden bg-surface-800">
                        <div 
                          className="flex justify-between items-center p-3 bg-surface-700 cursor-pointer select-none"
                          onClick={() => setExpandedAnchorIndex(i === expandedAnchorIndex ? -1 : i)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-surface-400 w-4">{i + 1}.</span>
                            <span className="text-sm font-medium text-surface-200">
                              {anchor.id || `Anchor ${i + 1}`}
                            </span>
                            <span className="text-xs text-surface-400 capitalize bg-surface-600 px-2 py-0.5 rounded-full">
                              {anchor.difficulty}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-brand-400">
                              Score: {anchor.final_score.toFixed(2)}
                            </span>
                            {expandedAnchorIndex === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                        
                        {expandedAnchorIndex === i && (
                          <div className="p-4 space-y-4 border-t border-surface-500">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-surface-300 mb-1">ID</label>
                                <input
                                  type="text"
                                  value={anchor.id}
                                  onChange={e => {
                                    const newAnchors = [...formAnchors]
                                    newAnchors[i].id = e.target.value
                                    setFormAnchors(newAnchors)
                                  }}
                                  className="w-full bg-surface-700 border border-surface-500 rounded px-2 py-1.5 text-sm text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-surface-300 mb-1">Difficulty</label>
                                <select
                                  value={anchor.difficulty}
                                  onChange={e => {
                                    const newAnchors = [...formAnchors]
                                    newAnchors[i].difficulty = e.target.value as any
                                    setFormAnchors(newAnchors)
                                  }}
                                  className="w-full bg-surface-700 border border-surface-500 rounded px-2 py-1.5 text-sm text-white capitalize"
                                >
                                  {DIFFICULTIES.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-surface-300 mb-1">Content</label>
                              <textarea
                                value={anchor.content}
                                onChange={e => {
                                  const newAnchors = [...formAnchors]
                                  newAnchors[i].content = e.target.value
                                  setFormAnchors(newAnchors)
                                }}
                                rows={4}
                                className="w-full bg-surface-700 border border-surface-500 rounded px-2 py-1.5 text-sm text-white resize-y"
                              />
                            </div>
                            
                            <div className="bg-surface-700 p-3 rounded border border-surface-600">
                              <label className="block text-xs font-medium text-surface-300 mb-2">Scores by Criterion</label>
                              <div className="space-y-2">
                                {formCriteria.map((c, idx) => (
                                  <div key={idx} className="flex justify-between items-center">
                                    <span className="text-sm text-surface-200">{c.name || `Criterion ${idx+1}`} <span className="text-xs text-surface-400">({c.weight})</span></span>
                                    <input
                                      type="number"
                                      value={anchor.human_scores[c.name] ?? ""}
                                      onChange={e => updateAnchorScore(i, c.name, e.target.value)}
                                      className="w-20 bg-surface-800 border border-surface-500 rounded px-2 py-1 text-sm text-white text-right"
                                      placeholder="0-10"
                                      max={c.max_score}
                                      min={0}
                                    />
                                  </div>
                                ))}
                                <div className="flex justify-between items-center pt-2 border-t border-surface-600 mt-2">
                                  <span className="text-sm font-medium text-surface-200">Computed Final Score</span>
                                  <input
                                    type="text"
                                    value={anchor.final_score.toFixed(2)}
                                    disabled
                                    className="w-20 bg-surface-800 border border-surface-600 rounded px-2 py-1 text-sm text-surface-400 text-right cursor-not-allowed"
                                  />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-surface-300 mb-1">Notes (Optional)</label>
                              <input
                                type="text"
                                value={anchor.notes || ""}
                                onChange={e => {
                                  const newAnchors = [...formAnchors]
                                  newAnchors[i].notes = e.target.value
                                  setFormAnchors(newAnchors)
                                }}
                                className="w-full bg-surface-700 border border-surface-500 rounded px-2 py-1.5 text-sm text-white"
                              />
                            </div>

                            <div className="flex justify-end">
                              <button
                                onClick={() => {
                                  setFormAnchors(formAnchors.filter((_, idx) => idx !== i))
                                  if (expandedAnchorIndex === i) setExpandedAnchorIndex(-1)
                                }}
                                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 py-1"
                              >
                                <Trash2 size={14} /> Remove Anchor
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <button
                      onClick={() => {
                        setFormAnchors([...formAnchors, { id: "", content: "", human_scores: {}, final_score: 0, difficulty: "proficient", notes: "" }])
                        setExpandedAnchorIndex(formAnchors.length)
                      }}
                      className="w-full py-2 border border-dashed border-surface-500 text-surface-300 hover:text-white hover:border-surface-400 hover:bg-surface-700/50 rounded-lg flex justify-center items-center gap-2 text-sm transition-colors"
                    >
                      <Plus size={16} /> Add Anchor
                    </button>
                  </div>
                </div>
              </div>

              {apiError && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{apiError}</p>
                </div>
              )}

              <button
                onClick={handleFormSubmit}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-brand-400 hover:bg-brand-500 text-surface-900 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Creating..." : "Create Anchor Set"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
