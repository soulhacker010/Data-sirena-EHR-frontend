import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '../utils/errors'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import { reportsApi } from '../api'
import type { SessionSummaryReport, AuthorizationReport, BillingSummaryReport, MissingNotesReport, PaymentsReport } from '../api/reports'
import {
    ChartBar,
    ClipboardText,
    Warning,
    Money,
    ArrowRight,
    Users,
    CalendarCheck,
    CreditCard,
    TrendUp
} from '@phosphor-icons/react'

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

const getSettledValue = <T,>(result: PromiseSettledResult<T>): T | null =>
    result.status === 'fulfilled' ? result.value : null

export default function ReportsPage() {
    const [sessionData, setSessionData] = useState<SessionSummaryReport | null>(null)
    const [authData, setAuthData] = useState<AuthorizationReport | null>(null)
    const [billingData, setBillingData] = useState<BillingSummaryReport | null>(null)
    const [paymentsData, setPaymentsData] = useState<PaymentsReport | null>(null)
    const [missingNotes, setMissingNotes] = useState<MissingNotesReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)
            try {
                const [sessions, auths, billing, payments, notes] = await Promise.allSettled([
                    reportsApi.getSessionSummary(),
                    reportsApi.getAuthorizationReport(),
                    reportsApi.getBillingSummary(),
                    reportsApi.getPaymentsReport(),
                    reportsApi.getMissingNotes(),
                ])
                setSessionData(getSettledValue(sessions))
                setAuthData(getSettledValue(auths))
                setBillingData(getSettledValue(billing))
                setPaymentsData(getSettledValue(payments))
                setMissingNotes(getSettledValue(notes))
            } catch (err: unknown) {
                toast.error(getApiErrorMessage(err, 'Failed to load reports'))
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
                    <div className="report-stat-icon blue">
                        <CalendarCheck size={20} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <p className="stat-value">{sessionData?.total_sessions ?? '—'}</p>
                        <p className="stat-label">Total Sessions</p>
                    </div>
                </div>
                <div className="report-stat-card">
                    <div className="report-stat-icon purple">
                        <Users size={20} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <p className="stat-value">{sessionData?.unique_clients ?? '—'}</p>
                        <p className="stat-label">Active Clients</p>
                    </div>
                </div>
                <div className="report-stat-card success">
                    <div className="report-stat-icon green">
                        <CreditCard size={20} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <p className="stat-value">{billingData ? formatCurrency(billingData.total_collected) : '—'}</p>
                        <p className="stat-label">Total Collected</p>
                    </div>
                </div>
                <div className="report-stat-card warning">
                    <div className="report-stat-icon orange">
                        <Warning size={20} weight="duotone" />
                    </div>
                    <div className="report-stat-content">
                        <p className="stat-value">{criticalAuths + totalMissing}</p>
                        <p className="stat-label">Action Items</p>
                    </div>
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
                    <ArrowRight size={18} className="report-card-arrow" />
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
                                <span className="stat">{sessionData.total_sessions} sessions</span>
                                <span className="stat">{sessionData.total_hours} hours</span>
                                <span className="stat">{sessionData.total_units} units</span>
                            </div>
                        )}
                    </div>
                    <ArrowRight size={18} className="report-card-arrow" />
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
                                <span className="stat">{authData.authorizations.length} authorizations</span>
                                {criticalAuths > 0 && (
                                    <span className="stat warning">{criticalAuths} critical</span>
                                )}
                            </div>
                        )}
                    </div>
                    <ArrowRight size={18} className="report-card-arrow" />
                </Link>

                <Link to="/reports/billing-summary" className="report-card">
                    <div className="report-card-icon success">
                        <Money size={32} weight="duotone" />
                    </div>
                    <div className="report-card-content">
                        <h3>Billing Summary</h3>
                        <p>Revenue, collections, outstanding balances, and client breakdown</p>
                        {billingData && (
                            <div className="report-card-stats">
                                <span className="stat">{formatCurrency(billingData.total_billed)} billed</span>
                                <span className="stat">{billingData.collections_rate.toFixed(1)}% collected</span>
                            </div>
                        )}
                    </div>
                    <ArrowRight size={18} className="report-card-arrow" />
                </Link>

                <Link to="/reports/payments" className="report-card">
                    <div className="report-card-icon success">
                        <CreditCard size={32} weight="duotone" />
                    </div>
                    <div className="report-card-content">
                        <h3>Payments Report</h3>
                        <p>Transaction totals, refunds, payment methods, and recent payment activity</p>
                        {paymentsData && (
                            <div className="report-card-stats">
                                <span className="stat">{formatCurrency(paymentsData.net_collected)} net</span>
                                <span className="stat">{paymentsData.total_transactions} transactions</span>
                            </div>
                        )}
                    </div>
                    <ArrowRight size={18} className="report-card-arrow" />
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
                                <span className={`stat ${totalMissing > 0 ? 'warning' : ''}`}>
                                    {totalMissing} missing
                                </span>
                            </div>
                        )}
                    </div>
                    <ArrowRight size={18} className="report-card-arrow" />
                </Link>
            </div>
        </DashboardLayout>
    )
}
