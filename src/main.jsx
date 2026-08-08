import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './context/AppContext'
import { ChatProvider } from './context/ChatContext'
import { GameProvider } from './context/GameContext'
import { GoalProvider } from './context/GoalContext'
import { RecordProvider } from './context/RecordContext'
import { ReminderProvider } from './context/ReminderContext'
import { SopProvider } from './context/SopContext'
import { TodoProvider } from './context/TodoContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <GameProvider>
          <ReminderProvider>
            <TodoProvider>
              <RecordProvider>
                <SopProvider>
                  <GoalProvider>
                    <ChatProvider>
                      <App />
                    </ChatProvider>
                  </GoalProvider>
                </SopProvider>
              </RecordProvider>
            </TodoProvider>
          </ReminderProvider>
        </GameProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed', error)
    })
  })
}
