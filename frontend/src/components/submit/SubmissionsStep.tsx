import { useState, useRef, ReactNode } from "react"
import { Upload, X, Plus } from "lucide-react"
import type { SubmissionItem, ContentType } from "../../types"

interface SubmissionsStepProps {
  submissions: SubmissionItem[]
  contentType: ContentType
  onChange: (submissions: SubmissionItem[]) => void
  onContentTypeChange: (type: ContentType) => void
}

type TabType = "upload" | "manual"

export function SubmissionsStep({
  submissions,
  contentType,
  onChange,
  onContentTypeChange,
}: SubmissionsStepProps) {
  const [activeTab, setActiveTab] = useState<TabType>("upload")
  const [isDragging, setIsDragging] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const contentTypes: { value: ContentType; label: string }[] = [
    { value: "essay", label: "Essay" },
    { value: "code", label: "Code" },
    { value: "report", label: "Report" },
    { value: "interview", label: "Interview" },
  ]

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const parseFile = (file: File) => {
    if (!file.name.endsWith(".json")) {
      setErrorMsg("Only .json files are accepted.")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const data = JSON.parse(text)
        
        if (!Array.isArray(data)) {
          setErrorMsg("JSON must be an array of submission objects.")
          return
        }

        const valid = data.every(item => item.id && item.content)
        if (!valid) {
          setErrorMsg("Each object must have 'id' and 'content' fields.")
          return
        }

        const uniqueIds = new Set(data.map(item => String(item.id)))
        if (uniqueIds.size !== data.length) {
          setErrorMsg("Duplicate IDs found in JSON.")
          return
        }

        // Add them to submissions, casting content_type dynamically since it comes from the toggle
        const newSubs = data.map((item: any) => ({
          id: String(item.id),
          content: String(item.content),
          content_type: contentType,
          metadata: item.metadata || {}
        }))

        onChange(newSubs)
        setErrorMsg(null)
      } catch (e) {
        setErrorMsg("Failed to parse JSON file.")
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      parseFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      parseFile(e.target.files[0])
    }
    // reset input so same file can be selected again
    e.target.value = ""
  }

  const handleAddManual = () => {
    const randomId = Math.random().toString(36).substring(2, 7)
    onChange([
      ...submissions,
      { id: `sub-${submissions.length + 1}-${randomId}`, content: "", content_type: contentType }
    ])
  }

  const handleUpdateManual = (index: number, field: "id" | "content", value: string) => {
    const updated = [...submissions]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const handleRemoveManual = (index: number) => {
    const updated = [...submissions]
    updated.splice(index, 1)
    onChange(updated)
  }

  // Calculate validation for current submissions
  let validationError: ReactNode = null
  if (submissions.length > 0) {
    const emptyFields = submissions.some(s => !s.id.trim() || !s.content.trim())
    if (emptyFields) {
      validationError = "All submissions must have an ID and content."
    } else {
      const ids = submissions.map(s => s.id)
      const uniqueIds = new Set(ids)
      if (uniqueIds.size !== ids.length) {
        validationError = "Duplicate submission IDs are not allowed."
      }
    }
  } else {
    validationError = "At least 1 submission is required."
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Content Type Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-surface-200">Content Type</label>
        <div className="flex gap-2">
          {contentTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => {
                onContentTypeChange(type.value)
                if (submissions.length > 0) {
                  onChange(submissions.map(s => ({ ...s, content_type: type.value })))
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                contentType === type.value
                  ? "bg-brand-400 text-white"
                  : "bg-surface-600 text-surface-300 hover:text-white"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-600">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "upload" ? "border-brand-400 text-brand-400" : "border-transparent text-surface-400 hover:text-surface-200"
          }`}
          onClick={() => setActiveTab("upload")}
        >
          File Upload
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "manual" ? "border-brand-400 text-brand-400" : "border-transparent text-surface-400 hover:text-surface-200"
          }`}
          onClick={() => setActiveTab("manual")}
        >
          Manual Entry
        </button>
      </div>

      <div className="min-h-[250px]">
        {activeTab === "upload" && (
          <div className="flex flex-col gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 transition-colors cursor-pointer ${
                isDragging ? "border-brand-400 bg-brand-400/10" : "border-surface-400 bg-surface-700/50 hover:bg-surface-600"
              }`}
            >
              <Upload size={40} className="text-surface-400 mb-4" />
              <p className="text-white font-medium mb-1">Drop your JSON file here</p>
              <p className="text-sm text-surface-400 hover:text-brand-400 transition-colors">
                or click to browse
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </p>
            </div>
            
            <details className="text-sm text-surface-400">
              <summary className="cursor-pointer font-medium hover:text-surface-200 mb-2">Format help</summary>
              <pre className="bg-surface-800 p-3 rounded-lg text-xs overflow-x-auto border border-surface-600">
{`[
  {
    "id": "unique-string",
    "content": "text content here",
    "metadata": {} // Optional
  }
]`}
              </pre>
            </details>
            
            {errorMsg && (
              <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        {activeTab === "manual" && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <button
                onClick={handleAddManual}
                className="flex items-center gap-1 text-sm bg-surface-600 hover:bg-surface-500 text-white px-3 py-1.5 rounded-lg transition-colors border border-surface-500"
              >
                <Plus size={16} />
                Add Submission
              </button>
            </div>
            
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
              {submissions.length === 0 ? (
                <div className="text-center text-surface-400 py-8 border border-dashed border-surface-600 rounded-lg">
                  No submissions added yet. Click "Add Submission" to start.
                </div>
              ) : (
                submissions.map((sub, index) => (
                  <div key={index} className="flex flex-col gap-2 bg-surface-800 p-4 rounded-lg relative group border border-surface-600">
                    <button
                      onClick={() => handleRemoveManual(index)}
                      className="absolute top-3 right-3 text-surface-400 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                    
                    <div className="flex flex-col gap-1 w-2/3 pr-6">
                      <label className="text-xs text-surface-400">ID</label>
                      <input
                        type="text"
                        value={sub.id}
                        onChange={(e) => handleUpdateManual(index, "id", e.target.value)}
                        placeholder="submission-001"
                        className="bg-surface-700 border border-surface-500 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-400 transition-colors"
                        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-surface-400">Content</label>
                      <textarea
                        value={sub.content}
                        onChange={(e) => handleUpdateManual(index, "content", e.target.value)}
                        placeholder="Paste content here"
                        rows={4}
                        className="bg-surface-700 border border-surface-500 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-400 transition-colors resize-y"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-4 border-t border-surface-600 mt-2">
        <div className="flex justify-between items-center">
          <span className={`text-sm font-medium ${submissions.length > 0 ? "text-brand-400" : "text-surface-400"}`}>
            {submissions.length} submission{submissions.length === 1 ? "" : "s"} ready
          </span>
        </div>
        {(validationError && submissions.length > 0) && (
          <span className="text-xs text-red-400">{validationError}</span>
        )}
      </div>
    </div>
  )
}
