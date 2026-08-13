import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './admin/Login'
import Dashboard from './admin/Dashboard'
import Categories from './admin/master/Categories'
import Sources from './admin/master/Sources'
import Branch from './admin/master/Branch'
import Staff from './admin/master/Staff'
import RawData from './admin/transactions/RawData'
import Telecall from './admin/transactions/Telecall'
import Managequotation from './admin/transactions/Managequotation'
import ProposalPreview from './admin/transactions/ProposalPreview'
import ManageOrder from './admin/transactions/ManageOrder'
import OrderPreview from './admin/transactions/OrderPreview'
import RawDataRegister from './admin/reports/RawDataRegister'
import TelecalligRegister from './admin/reports/TelecalligRegister'
import QuotationRegister from './admin/reports/QuotationRegister'
import OrderReceived from './admin/reports/OrderReceived'
import OrderProgress from './admin/reports/OrderProgress'
import Settings from './admin/utilities/Settings'

function App() {
  return (
    <Routes>
      {/* Public Login Route as Root */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      {/* Main Dashboard Route */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Master Data Routes */}
      <Route path="/categories" element={<Categories />} />
      <Route path="/sources" element={<Sources />} />
      <Route path="/branches" element={<Branch />} />
      <Route path="/staff" element={<Staff />} />

      {/* Sales / Transactions Routes */}
      <Route path="/raw-leads" element={<RawData />} />
      <Route path="/tele-calling" element={<Telecall />} />
      <Route path="/quotations" element={<Managequotation />} />
      <Route path="/quotations/preview/:id" element={<ProposalPreview />} />
      <Route path="/orders" element={<ManageOrder />} />
      <Route path="/orders/preview/:id" element={<OrderPreview />} />

      {/* Reports Routes */}
      <Route path="/raw-data-register" element={<RawDataRegister />} />
      <Route path="/telecalling-register" element={<TelecalligRegister />} />
      <Route path="/quotation-submitted-register" element={<QuotationRegister />} />
      <Route path="/order-received-register" element={<OrderReceived />} />
      <Route path="/order-received" element={<OrderReceived />} />
      <Route path="/order-progress-register" element={<OrderProgress />} />

      {/* Utilities Routes */}
      <Route path="/settings" element={<Settings />} />

      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
