import { Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppLayout, Toast, ErrorBoundary } from "./components"
import { useToast } from "./hooks/useToast"
import Dashboard from "./pages/Dashboard"
import Submit from "./pages/Submit"
import Jobs from "./pages/Jobs"
import JobMonitor from "./pages/JobMonitor"
import Results from "./pages/Results"
import Anchors from "./pages/Anchors"
import NotFound from "./pages/NotFound"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    }
  }
})

function App() {
  const { toasts, dismiss } = useToast()

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/submit" element={<Submit />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobMonitor />} />
            <Route path="/results/:id" element={<Results />} />
            <Route path="/anchors" element={<Anchors />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ErrorBoundary>
      <Toast toasts={toasts} onDismiss={dismiss} />
    </QueryClientProvider>
  )
}

export default App
