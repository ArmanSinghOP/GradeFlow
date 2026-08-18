import { useNavigate } from "react-router-dom"

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-12 text-center bg-surface-900">
      <h1 className="text-8xl font-bold text-surface-600 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-white mb-2">Page not found</h2>
      <p className="text-surface-400 mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/")}
          className="bg-brand-400 hover:bg-brand-500 text-surface-900 px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => navigate("/submit")}
          className="bg-surface-700 hover:bg-surface-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Submit Batch
        </button>
      </div>
    </div>
  )
}
