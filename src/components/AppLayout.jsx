import { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import TopNav from './TopNav.jsx'

export default function AppLayout({
  selectedCycleId,
  onSelectCycle,
  cycleOptions,
  activeCycleId,
  onImportClick,
  onExport,
  userEmail,
  onSignOut,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#0A0E15]">
      <Sidebar
        selectedCycleId={selectedCycleId}
        onSelectCycle={onSelectCycle}
        cycleOptions={cycleOptions}
        activeCycleId={activeCycleId}
        onImportClick={onImportClick}
        onExport={onExport}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col lg:pl-64">
        <TopNav
          userEmail={userEmail}
          onSignOut={onSignOut}
          onToggleSidebar={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0A0E15]">
          {children}
        </main>
      </div>
    </div>
  )
}
