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
import ClientQuotation from './admin/transactions/ClientQuotation'
import ManageOrder from './admin/transactions/ManageOrder'
import OrderPreview from './admin/transactions/OrderPreview'
import ClientDetails from './admin/transactions/ClientDetails'
import RawDataRegister from './admin/reports/RawDataRegister'
import TelecalligRegister from './admin/reports/TelecalligRegister'
import QuotationRegister from './admin/reports/QuotationRegister'
import OrderReceived from './admin/reports/OrderReceived'
import Settings from './admin/utilities/Settings'
import Notifications from './admin/utilities/Notifications'
import Admins from './admin/superadmin/Admins'

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

        {/* Public client-facing pages (no authentication) */}
        <Route path="/quotation/:token" element={<ClientQuotation />} />

        {/* Protected app routes */}
        <Route path="/change-password" element={guard(<ChangePassword />)} />
        <Route path="/dashboard" element={guard(<Dashboard />)} />
        <Route path="/categories" element={guard(<Categories />, { perm: 'category.view' })} />
        <Route path="/sources" element={guard(<Sources />, { perm: 'source.view' })} />
        <Route path="/branches" element={guard(<Branch />, { perm: 'branch.view' })} />
        <Route path="/staff" element={guard(<Staff />, { perm: 'staff.manage' })} />
        <Route path="/raw-leads" element={guard(<RawData />, { perm: 'leads.view' })} />
        <Route path="/tele-calling" element={guard(<Telecall />, { perm: 'telecall.view' })} />
        <Route path="/quotations" element={guard(<Managequotation />, { perm: 'quotation.view' })} />
        <Route path="/quotations/preview/:id" element={guard(<ProposalPreview />, { perm: 'quotation.view' })} />
        <Route path="/orders" element={guard(<ManageOrder />, { perm: 'order.view' })} />
        <Route path="/orders/preview/:id" element={guard(<OrderPreview />, { perm: 'order.view' })} />
        <Route path="/client-details" element={guard(<ClientDetails />, { perm: 'client.view' })} />
        <Route path="/raw-data-register" element={guard(<RawDataRegister />, { perm: 'reports.view' })} />
        <Route path="/telecalling-register" element={guard(<TelecalligRegister />, { perm: 'reports.view' })} />
        <Route path="/quotation-submitted-register" element={guard(<QuotationRegister />, { perm: 'reports.view' })} />
        <Route path="/order-received-register" element={guard(<OrderReceived />, { perm: 'reports.view' })} />
        <Route path="/order-received" element={guard(<OrderReceived />, { perm: 'reports.view' })} />
        <Route path="/settings" element={guard(<Settings />)} />
        <Route path="/notifications" element={guard(<Notifications />)} />
        <Route path="/admins" element={guard(<Admins />, { superAdminOnly: true })} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
