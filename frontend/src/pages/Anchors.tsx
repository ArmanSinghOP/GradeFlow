import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Anchor } from "lucide-react"
import { SkeletonCard, ErrorState } from "../components"
import { listAnchors, deleteAnchor } from "../api/anchors"
import { useToast } from "../hooks/useToast"
import { AnchorSetCard } from "../components/anchors/AnchorSetCard"
import { CreateAnchorModal } from "../components/anchors/CreateAnchorModal"
import { CalibrationPreviewPanel } from "../components/anchors/CalibrationPreviewPanel"
import { ValidationReportPanel } from "../components/anchors/ValidationReportPanel"

export default function Anchors() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  
  const [activePanelType, setActivePanelType] = useState<"preview" | "validate" | null>(null)
  const [activePanelAnchorId, setActivePanelAnchorId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["anchors"],
    queryFn: listAnchors,
    staleTime: 30_000,
  })

  const deleteAnchorMutation = useMutation({
    mutationFn: (id: string) => deleteAnchor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anchors"] })
      toast.success("Anchor set deleted")
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete anchor set")
    }
  })

  const handlePreview = (id: string) => {
    if (activePanelType === "preview" && activePanelAnchorId === id) {
      setActivePanelType(null)
      setActivePanelAnchorId(null)
    } else {
      setActivePanelType("preview")
      setActivePanelAnchorId(id)
    }
  }

  const handleValidate = (id: string) => {
    if (activePanelType === "validate" && activePanelAnchorId === id) {
      setActivePanelType(null)
      setActivePanelAnchorId(null)
    } else {
      setActivePanelType("validate")
      setActivePanelAnchorId(id)
    }
  }

  const handleClosePanel = () => {
    setActivePanelType(null)
    setActivePanelAnchorId(null)
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} lines={4} showHeader={true} className="h-[240px]" />
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <ErrorState
          title="Failed to load anchor sets"
          message="There was an error communicating with the server. Please try again later."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ["anchors"] })}
        />
      )
    }

    if (!data?.anchor_sets || data.anchor_sets.length === 0) {
      return (
        <div className="bg-surface-800 rounded-xl border border-surface-600 p-12 flex flex-col items-center justify-center text-center h-64">
          <Anchor size={48} className="text-surface-500 opacity-20 mb-4" />
          <h3 className="text-lg font-medium text-white">No anchor sets yet</h3>
          <p className="text-sm text-surface-400 mt-1 max-w-md">
            Create your first anchor set to enable score calibration.
          </p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="mt-6 flex items-center gap-2 bg-brand-400 hover:bg-brand-500 text-surface-900 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Create Anchor Set
          </button>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.anchor_sets.map((anchor) => (
          <AnchorSetCard
            key={anchor.anchor_set_id}
            anchor={anchor}
            isSelected={activePanelAnchorId === anchor.anchor_set_id}
            onSelect={() => handlePreview(anchor.anchor_set_id)}
            onValidate={() => handleValidate(anchor.anchor_set_id)}
            onDelete={() => setDeleteConfirmId(anchor.anchor_set_id)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Anchor Manager</h1>
          <p className="text-sm text-surface-400 mt-1">Manage reference sets for score calibration</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-brand-400 hover:bg-brand-600 text-surface-900 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Create Anchor Set
        </button>
      </div>

      {deleteConfirmId && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 flex justify-between items-center flex-wrap gap-4">
          <div className="text-sm text-red-200">
            Delete <span className="font-mono font-medium">'{deleteConfirmId}'</span>? This cannot be undone.
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setDeleteConfirmId(null)}
              className="px-3 py-1.5 text-xs text-surface-200 hover:text-white bg-surface-700 hover:bg-surface-600 border border-surface-500 rounded transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                deleteAnchorMutation.mutate(deleteConfirmId)
                setDeleteConfirmId(null)
              }}
              className="px-3 py-1.5 text-xs text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {renderContent()}

      {activePanelType === "preview" && activePanelAnchorId && (
        <CalibrationPreviewPanel
          anchorSetId={activePanelAnchorId}
          onClose={handleClosePanel}
        />
      )}

      {activePanelType === "validate" && activePanelAnchorId && (
        <ValidationReportPanel
          anchorSetId={activePanelAnchorId}
          onClose={handleClosePanel}
        />
      )}

      {showCreateModal && (
        <CreateAnchorModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["anchors"] })
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}
