import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ui/ErrorBoundary'

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
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* Dashboard — DEFAULT LANDING */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Clients */}
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />

          {/* Calendar */}
          <Route path="/calendar" element={<CalendarPage />} />

          {/* Session Notes */}
          <Route path="/notes" element={<SessionNotesPage />} />
          <Route path="/notes/new" element={<NoteEditorPage />} />
          <Route path="/notes/:id/edit" element={<NoteEditorPage />} />

          {/* Billing */}
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />

          {/* Reports */}
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/authorizations" element={<AuthorizationReportPage />} />
          <Route path="/reports/missing-notes" element={<MissingNotesReportPage />} />
          <Route path="/reports/session-summary" element={<SessionSummaryReportPage />} />
          <Route path="/reports/billing-summary" element={<BillingSummaryReportPage />} />

          {/* Settings & Notifications */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Admin */}
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/audit" element={<AuditLogPage />} />

          {/* Default redirect to dashboard (for client demo) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
