import { BrowserRouter, Routes, Route } from 'react-router-dom'
import InboxPage from './pages/InboxPage'
import EmailDetailPage from './pages/EmailDetailPage'
import AddEmailPage from './pages/AddEmailPage'
import GraphPage from './pages/GraphPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<InboxPage />} />
          <Route path="/emails/:id" element={<EmailDetailPage />} />
          <Route path="/add" element={<AddEmailPage />} />
          <Route path="/graph" element={<GraphPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
