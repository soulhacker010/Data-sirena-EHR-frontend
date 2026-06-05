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
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
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
import PaymentsReportPage from './pages/PaymentsReportPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import NotificationsPage from './pages/NotificationsPage'
import UsersPage from './pages/UsersPage'
import AuditLogPage from './pages/AuditLogPage'
import IntakeListPage from './pages/IntakeListPage'
import IntakeEditorPage from './pages/IntakeEditorPage'
import TreatmentPlanListPage from './pages/TreatmentPlanListPage'
import TreatmentPlanEditorPage from './pages/TreatmentPlanEditorPage'
import BLSControlPage from './pages/BLSControlPage'
import BLSClientPage from './pages/BLSClientPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Auth — public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* BLS Client view — PUBLIC, token-gated at the component level.
                Patients open this on their phone/laptop via the invite link.
                Must remain outside ProtectedRoute — no Sirena login required.
                The component itself validates the token format (mock) or via
                the server's verify endpoint (Phase 1). */}
            <Route path="/bls/c/:token" element={<BLSClientPage />} />

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

            {/* Intakes — IsClinicalStaff (admin, supervisor, clinician) */}
            <Route path="/intakes" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><IntakeListPage /></ProtectedRoute>} />
            <Route path="/intakes/new" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><IntakeEditorPage /></ProtectedRoute>} />
            <Route path="/intakes/:id/edit" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><IntakeEditorPage /></ProtectedRoute>} />

            {/* Treatment Plans — IsClinicalStaff (admin, supervisor, clinician) */}
            <Route path="/treatment-plans" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><TreatmentPlanListPage /></ProtectedRoute>} />
            <Route path="/treatment-plans/new" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><TreatmentPlanEditorPage /></ProtectedRoute>} />
            <Route path="/treatment-plans/:id/edit" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><TreatmentPlanEditorPage /></ProtectedRoute>} />

            {/* Billing — IsBiller (admin, biller) */}
            <Route path="/billing" element={<ProtectedRoute allowedRoles={BILLING_ROLES}><BillingPage /></ProtectedRoute>} />
            <Route path="/billing/invoices/:id" element={<ProtectedRoute allowedRoles={BILLING_ROLES}><InvoiceDetailPage /></ProtectedRoute>} />

            {/* Reports — IsSupervisorOrAbove (admin, supervisor) */}
            <Route path="/reports" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><ReportsPage /></ProtectedRoute>} />
            <Route path="/reports/authorizations" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><AuthorizationReportPage /></ProtectedRoute>} />
            <Route path="/reports/missing-notes" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><MissingNotesReportPage /></ProtectedRoute>} />
            <Route path="/reports/session-summary" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><SessionSummaryReportPage /></ProtectedRoute>} />
            <Route path="/reports/billing-summary" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><BillingSummaryReportPage /></ProtectedRoute>} />
            <Route path="/reports/payments" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><PaymentsReportPage /></ProtectedRoute>} />
            <Route path="/reports/analytics" element={<ProtectedRoute allowedRoles={SUPERVISOR_ROLES}><AnalyticsPage /></ProtectedRoute>} />

            {/* Bilateral Stimulation (BLS) — IsClinicalStaff (admin, supervisor, clinician).
                Hidden from sidebar nav for now (no Sidebar link). Accessible by URL
                only until the backend lands and the feature ships. */}
            <Route path="/bls/control" element={<ProtectedRoute allowedRoles={CLINICAL_ROLES}><BLSControlPage /></ProtectedRoute>} />

            {/* Settings — all authenticated users */}
            <Route path="/settings" element={<ProtectedRoute allowedRoles={ALL_ROLES}><SettingsPage /></ProtectedRoute>} />

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
