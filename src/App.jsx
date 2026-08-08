import { Navigate, Route, Routes } from 'react-router-dom'
import ChatPage from './components/ChatPage'
import GoalsPage from './components/GoalsPage'
import SopExecutionCard from './components/SopExecutionCard'
import SopWizardModal from './components/SopWizardModal'
import StatusBar from './components/StatusBar'
import TodayPanel from './components/TodayPanel'
import TopNav from './components/TopNav'

export default function App() {
  return (
    <div className="h-dvh overflow-hidden bg-[#dfe8e4] text-slate-800">
      <div className="mx-auto h-full max-w-5xl px-0 sm:px-4 sm:py-4">
        <main className="mx-auto flex h-full max-w-4xl flex-col overflow-hidden bg-[#e9efec] pb-16 shadow-2xl sm:rounded-[1.5rem] md:pb-0">
          <StatusBar />
          <TopNav />

          <div className="flex min-h-0 flex-1 flex-col">
            <Routes>
              <Route path="/" element={<Navigate to="/chat" replace />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/today" element={<TodayPanel />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </div>
        </main>
        <SopWizardModal />
        <SopExecutionCard />
      </div>
    </div>
  )
}
