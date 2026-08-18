import type { ContentType } from "../../types"

interface SubmissionViewerProps {
  content: string
  contentType: ContentType | string
  metadata?: Record<string, unknown>
}

export const SubmissionViewer = ({ content, contentType, metadata }: SubmissionViewerProps) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-surface-600 bg-surface-700 shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-white">Original Submission</h3>
          <p className="text-xs text-surface-400 mt-1 capitalize">
            Type: {contentType}
          </p>
        </div>
        {metadata && Object.keys(metadata).length > 0 && (
          <div className="text-right">
            {metadata.word_count && (
              <p className="text-xs text-surface-300">Words: {String(metadata.word_count)}</p>
            )}
            {metadata.submitted_at && (
              <p className="text-xs text-surface-400">
                {new Date(String(metadata.submitted_at)).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-surface-800">
        {contentType === "code" ? (
          <pre className="text-sm font-mono text-surface-200 bg-surface-900 p-4 rounded-lg overflow-x-auto whitespace-pre">
            <code>{content}</code>
          </pre>
        ) : (
          <div className="text-surface-200 leading-relaxed whitespace-pre-wrap font-serif text-[15px]">
            {content}
          </div>
        )}
      </div>
    </div>
  )
}
