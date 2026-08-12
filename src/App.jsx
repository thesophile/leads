import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './admin/Login'
import Dashboard from './admin/Dashboard'
import Categories from './admin/master/Categories'
import Sources from './admin/master/Sources'
import Branch from './admin/master/Branch'
import Staff from './admin/master/Staff'
import RawData from './admin/transactions/RawData'
import Telecall from './admin/transactions/Telecall'

function App() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Main Dashboard Route */}
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Master Data Routes */}
      <Route path="/categories" element={<Categories />} />
      <Route path="/sources" element={<Sources />} />
      <Route path="/branches" element={<Branch />} />
      <Route path="/staff" element={<Staff />} />

      {/* Sales / Transactions Routes */}
      <Route path="/raw-leads" element={<RawData />} />
      <Route path="/tele-calling" element={<Telecall />} />

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
