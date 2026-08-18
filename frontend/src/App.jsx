import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './admin/Login'
import Register from './admin/Register'
import ForgotPassword from './admin/ForgotPassword'
import ChangePassword from './admin/ChangePassword'
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
import ClientDetails from './admin/transactions/ClientDetails'
import RawDataRegister from './admin/reports/RawDataRegister'
import TelecalligRegister from './admin/reports/TelecalligRegister'
import QuotationRegister from './admin/reports/QuotationRegister'
import OrderReceived from './admin/reports/OrderReceived'
import Settings from './admin/utilities/Settings'
import Notifications from './admin/utilities/Notifications'

const guard = (el, opts) => <ProtectedRoute {...opts}>{el}</ProtectedRoute>

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public auth pages */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected app routes */}
        <Route path="/change-password" element={guard(<ChangePassword />)} />
        <Route path="/dashboard" element={guard(<Dashboard />)} />
        <Route path="/categories" element={guard(<Categories />)} />
        <Route path="/sources" element={guard(<Sources />)} />
        <Route path="/branches" element={guard(<Branch />)} />
        <Route path="/staff" element={guard(<Staff />, { adminOnly: true })} />
        <Route path="/raw-leads" element={guard(<RawData />)} />
        <Route path="/tele-calling" element={guard(<Telecall />)} />
        <Route path="/quotations" element={guard(<Managequotation />)} />
        <Route path="/quotations/preview/:id" element={guard(<ProposalPreview />)} />
        <Route path="/orders" element={guard(<ManageOrder />)} />
        <Route path="/orders/preview/:id" element={guard(<OrderPreview />)} />
        <Route path="/client-details" element={guard(<ClientDetails />)} />
        <Route path="/raw-data-register" element={guard(<RawDataRegister />)} />
        <Route path="/telecalling-register" element={guard(<TelecalligRegister />)} />
        <Route path="/quotation-submitted-register" element={guard(<QuotationRegister />)} />
        <Route path="/order-received-register" element={guard(<OrderReceived />)} />
        <Route path="/order-received" element={guard(<OrderReceived />)} />
        <Route path="/settings" element={guard(<Settings />)} />
        <Route path="/notifications" element={guard(<Notifications />)} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
