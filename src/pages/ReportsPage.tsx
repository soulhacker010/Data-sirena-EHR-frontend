import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import { reportsApi } from '../api'
import type { SessionSummaryReport, AuthorizationReport, BillingSummaryReport, MissingNotesReport } from '../api/reports'
import {
    ChartBar,
    FileText,
    ClipboardText,
    Warning,
    Money,
    ArrowRight,
    Users,
    Clock,
    CalendarCheck,
    CreditCard,
    TrendUp
} from '@phosphor-icons/react'

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

export default function ReportsPage() {
    const [sessionData, setSessionData] = useState<SessionSummaryReport | null>(null)
    const [authData, setAuthData] = useState<AuthorizationReport | null>(null)
    const [billingData, setBillingData] = useState<BillingSummaryReport | null>(null)
    const [missingNotes, setMissingNotes] = useState<MissingNotesReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const [sessions, auths, billing, notes] = await Promise.allSettled([
                    reportsApi.getSessionSummary(),
                    reportsApi.getAuthorizationReport(),
                    reportsApi.getBillingSummary(),
                    reportsApi.getMissingNotes(),
                ])
                if (sessions.status === 'fulfilled') setSessionData(sessions.value)
                if (auths.status === 'fulfilled') setAuthData(auths.value)
                if (billing.status === 'fulfilled') setBillingData(billing.value)
                if (notes.status === 'fulfilled') setMissingNotes(notes.value)
            } catch (err: any) {
                toast.error(err?.response?.data?.detail || 'Failed to load reports')
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    if (isLoading) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    const criticalAuths = authData
        ? authData.authorizations.filter(a => a.utilization_percent >= 80).length
        : 0
    const totalMissing = missingNotes ? missingNotes.missing_notes.length : 0

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-left">
                    <h1 className="page-title">
                        <ChartBar size={28} weight="duotone" />
                        Reports
                    </h1>
                    <p className="page-subtitle">Practice analytics and compliance reports</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="report-stats-grid">
                <div className="report-stat-card">
                    <CalendarCheck size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{sessionData?.total_sessions ?? '—'}</p>
                    <p className="stat-label">Total Sessions</p>
                </div>
                <div className="report-stat-card">
                    <Users size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{sessionData?.unique_clients ?? '—'}</p>
                    <p className="stat-label">Active Clients</p>
                </div>
                <div className="report-stat-card success">
                    <CreditCard size={24} weight="duotone" className="icon-success" />
                    <p className="stat-value">{billingData ? formatCurrency(billingData.total_collected) : '—'}</p>
                    <p className="stat-label">Total Collected</p>
                </div>
                <div className="report-stat-card warning">
                    <Warning size={24} weight="duotone" className="icon-warning" />
                    <p className="stat-value">{criticalAuths + totalMissing}</p>
                    <p className="stat-label">Action Items</p>
                </div>
            </div>

            {/* Report Cards */}
            <div className="reports-grid">
                <Link to="/reports/analytics" className="report-card">
                    <div className="report-card-icon primary">
                        <TrendUp size={32} weight="duotone" />
                    </div>
                    <div className="report-card-content">
                        <h3>Practice Analytics</h3>
                        <p>Length of care, dropout patterns, revenue KPIs, ABA utilization, referral ROI</p>
                    </div>
                    <ArrowRight size={20} />
                </Link>

                <Link to="/reports/session-summary" className="report-card">
                    <div className="report-card-icon primary">
                        <ChartBar size={32} weight="duotone" />
                    </div>
                    <div className="report-card-content">
                        <h3>Session Summary</h3>
                        <p>View session counts, hours, units, and provider breakdowns</p>
                        {sessionData && (
                            <div className="report-card-stats">
                                <span>{sessionData.total_sessions} sessions</span>
                                <span>{sessionData.total_hours} hours</span>
                                <span>{sessionData.total_units} units</span>
                            </div>
                        )}
                    </div>
                    <ArrowRight size={20} />
                </Link>

                <Link to="/reports/authorizations" className="report-card">
                    <div className="report-card-icon warning">
                        <ClipboardText size={32} weight="duotone" />
                    </div>
                    <div className="report-card-content">
                        <h3>Authorization Report</h3>
                        <p>Track authorization usage, expiration, and utilization rates</p>
                        {authData && (
                            <div className="report-card-stats">
                                <span>{authData.authorizations.length} authorizations</span>
                                {criticalAuths > 0 && (
                                    <span className="text-warning">{criticalAuths} critical</span>
                                )}
                            </div>
                        )}
                    </div>
                    <ArrowRight size={20} />
                </Link>

                <Link to="/reports/billing-summary" className="report-card">
                    <div className="report-card-icon success">
                        <Money size={32} weight="duotone" />
                    </div>
                    <div className="report-card-content">
                        <h3>Billing Summary</h3>
                        <p>Revenue, collections, outstanding balances, and payer breakdown</p>
                        {billingData && (
                            <div className="report-card-stats">
                                <span>{formatCurrency(billingData.total_billed)} billed</span>
                                <span>{billingData.collections_rate.toFixed(1)}% collected</span>
                            </div>
                        )}
                    </div>
                    <ArrowRight size={20} />
                </Link>

                <Link to="/reports/missing-notes" className="report-card">
                    <div className="report-card-icon danger">
                        <Warning size={32} weight="duotone" />
                    </div>
                    <div className="report-card-content">
                        <h3>Missing Notes</h3>
                        <p>Sessions missing progress notes that need completion</p>
                        {missingNotes && (
                            <div className="report-card-stats">
                                <span className={totalMissing > 0 ? 'text-warning' : ''}>
                                    {totalMissing} missing
                                </span>
                            </div>
                        )}
                    </div>
                    <ArrowRight size={20} />
                </Link>
            </div>
        </DashboardLayout>
    )
}
