import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TopBar } from "./TopBar"

export const AppLayout = () => {
  const location = useLocation()
  
  // Mapping paths to titles as requested
  let pageTitle = ""
  if (location.pathname === "/") pageTitle = "Dashboard"
  else if (location.pathname.startsWith("/submit")) pageTitle = "Submit Batch"
  else if (location.pathname.startsWith("/jobs/")) pageTitle = "Job Monitor"
  else if (location.pathname.startsWith("/results/")) pageTitle = "Results Explorer"
  else if (location.pathname.startsWith("/anchors")) pageTitle = "Anchor Manager"

  return (
    <div className="flex h-screen bg-surface-900 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title={pageTitle} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
