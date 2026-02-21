import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { AuthProvider } from './context'
import ProtectedRoute from './components/layout/ProtectedRoute'
import {
  ALL_ROLES,
  CLINICAL_ROLES,
  BILLING_ROLES,
  SUPERVISOR_ROLES,
  SCHEDULING_ROLES,
  ADMIN_ONLY
} from './utils/permissions'

// Pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import CalendarPage from './pages/CalendarPage'
import SessionNotesPage from './pages/SessionNotesPage'
import NoteEditorPage from './pages/NoteEditorPage'
import BillingPage from './pages/BillingPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import ReportsPage from './pages/ReportsPage'
import AuthorizationReportPage from './pages/AuthorizationReportPage'
import MissingNotesReportPage from './pages/MissingNotesReportPage'
import SessionSummaryReportPage from './pages/SessionSummaryReportPage'
import BillingSummaryReportPage from './pages/BillingSummaryReportPage'
import SettingsPage from './pages/SettingsPage'
import NotificationsPage from './pages/NotificationsPage'
import UsersPage from './pages/UsersPage'
import AuditLogPage from './pages/AuditLogPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Auth — public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Dashboard — everyone (IsAnyAuthenticated) */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={ALL_ROLES}><DashboardPage /></ProtectedRoute>} />

            {/* Clients — IsFrontDesk (admin, supervisor, clinician, front_desk) */}
            <Route path="/clients" element={<ProtectedRoute allowedRoles={SCHEDULING_ROLES}><ClientsPage /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute allowedRoles={SCHEDULING_ROLES}><ClientDetailPage /></ProtectedRoute>} />

            {/* Calendar — IsFrontDesk (admin, supervisor, clinician, front_desk) */}
            <Route path="/calendar" element={<ProtectedRoute allowedRoles={SCHEDULING_ROLES}><CalendarPage /></ProtectedRoute>} />

            {/* Session Notes — IsClinicalStaff (admin, supervisor, clinician) */}
            <Route path="/notes" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><SessionNotesPage /></ProtectedRoute>} />
            <Route path="/notes/new" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><NoteEditorPage /></ProtectedRoute>} />
            <Route path="/notes/:id/edit" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><NoteEditorPage /></ProtectedRoute>} />

            {/* Billing — IsBiller (admin, biller) */}
            <Route path="/billing" element={<ProtectedRoute allowedRoles={BILLING_ROLES}><BillingPage /></ProtectedRoute>} />
            <Route path="/billing/invoices/:id" element={<ProtectedRoute allowedRoles={BILLING_ROLES}><InvoiceDetailPage /></ProtectedRoute>} />

            {/* Reports — IsSupervisorOrAbove (admin, supervisor) */}
            <Route path="/reports" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><ReportsPage /></ProtectedRoute>} />
            <Route path="/reports/authorizations" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><AuthorizationReportPage /></ProtectedRoute>} />
            <Route path="/reports/missing-notes" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><MissingNotesReportPage /></ProtectedRoute>} />
            <Route path="/reports/session-summary" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><SessionSummaryReportPage /></ProtectedRoute>} />
            <Route path="/reports/billing-summary" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><BillingSummaryReportPage /></ProtectedRoute>} />

            {/* Settings — IsAdmin */}
            <Route path="/settings" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><SettingsPage /></ProtectedRoute>} />

            {/* Notifications — everyone */}
            <Route path="/notifications" element={<ProtectedRoute allowedRoles={ALL_ROLES}><NotificationsPage /></ProtectedRoute>} />

            {/* Admin — IsAdmin */}
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><AuditLogPage /></ProtectedRoute>} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
