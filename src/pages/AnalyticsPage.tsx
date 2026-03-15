import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton, EmptyState } from '../components/ui'
import { reportsApi } from '../api'
import type { AnalyticsReport } from '../api/reports'
import {
    ArrowLeft,
    ChartBar,
    Users,
    Clock,
    Money,
    MapPin,
    TrendUp,
    Warning,
    CalendarBlank,
    Heartbeat,
    CreditCard,
    UsersFour
} from '@phosphor-icons/react'

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

export default function AnalyticsPage() {
    const navigate = useNavigate()
    const [data, setData] = useState<AnalyticsReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const loadReport = async () => {
        try {
            setIsLoading(true)
            const report = await reportsApi.getAnalytics({
                start_date: dateFrom || undefined,
                end_date: dateTo || undefined,
            })
            setData(report)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to load analytics')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadReport()
    }, [])

    if (isLoading || !data) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    const dp = data.dropout_patterns

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-left">
                    <button className="btn-ghost" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={20} /> Back to Reports
                    </button>
                    <h1 className="page-title">
                        <TrendUp size={28} weight="duotone" />
                        Practice Analytics
                    </h1>
                    <p className="page-subtitle">Key performance indicators and practice insights</p>
                </div>
            </div>

            {/* Date Filters */}
            <div className="filter-bar">
                <div className="date-filter">
                    <CalendarBlank size={16} />
                    <input type="date" className="date-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <span>to</span>
                    <input type="date" className="date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <button className="btn-secondary btn-sm" onClick={loadReport}>Apply Filters</button>
            </div>

            {/* ── KPI Cards Row ──────────────────────────────────────────── */}
            <div className="report-stats-grid">
                <div className="report-stat-card">
                    <Users size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{data.active_patients}</p>
                    <p className="stat-label">Active Patients</p>
                </div>
                <div className="report-stat-card">
                    <Clock size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{data.avg_length_of_care_days}</p>
                    <p className="stat-label">Avg Length of Care (days)</p>
                </div>
                <div className="report-stat-card success">
                    <Money size={24} weight="duotone" className="icon-success" />
                    <p className="stat-value">{formatCurrency(data.revenue_per_clinical_hour)}</p>
                    <p className="stat-label">Revenue per Clinical Hour</p>
                </div>
                <div className="report-stat-card">
                    <Heartbeat size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{data.aba_utilization.utilization_percent}%</p>
                    <p className="stat-label">ABA Utilization Rate</p>
                </div>
            </div>

            {/* ── Dropout Patterns ───────────────────────────────────────── */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">
                        <Warning size={20} weight="duotone" /> Dropout Patterns
                    </h2>
                </div>
                <div className="card-body">
                    <div className="report-stats-grid">
                        <div className="report-stat-card warning">
                            <p className="stat-value">{dp.no_visit_30_days}</p>
                            <p className="stat-label">No Visit in 30 Days</p>
                        </div>
                        <div className="report-stat-card warning">
                            <p className="stat-value">{dp.no_visit_60_days}</p>
                            <p className="stat-label">No Visit in 60 Days</p>
                        </div>
                        <div className="report-stat-card danger" style={dp.no_visit_90_days > 0 ? { borderColor: 'var(--color-danger)' } : {}}>
                            <p className="stat-value">{dp.no_visit_90_days}</p>
                            <p className="stat-label">No Visit in 90 Days</p>
                        </div>
                        <div className="report-stat-card">
                            <p className="stat-value">{dp.total_active_clients}</p>
                            <p className="stat-label">Total Active Clients</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Payment Summary ────────────────────────────────────────── */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">
                        <CreditCard size={20} weight="duotone" /> Payment Summary
                    </h2>
                </div>
                <div className="card-body">
                    <div className="report-stats-grid">
                        <div className="report-stat-card success">
                            <p className="stat-value">{formatCurrency(data.payment_summary.current_month)}</p>
                            <p className="stat-label">This Month</p>
                        </div>
                        <div className="report-stat-card">
                            <p className="stat-value">{formatCurrency(data.payment_summary.previous_month)}</p>
                            <p className="stat-label">Last Month</p>
                        </div>
                        <div className="report-stat-card success">
                            <p className="stat-value">{formatCurrency(data.payment_summary.year_to_date)}</p>
                            <p className="stat-label">Year to Date</p>
                        </div>
                    </div>

                    {data.payment_summary.monthly_trend.length > 0 && (
                        <table className="data-table" style={{ marginTop: '1rem' }}>
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th>Total Payments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.payment_summary.monthly_trend.map((t, i) => (
                                    <tr key={i}>
                                        <td className="font-medium">{t.month}</td>
                                        <td>{formatCurrency(t.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Revenue Per Location ───────────────────────────────────── */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">
                        <MapPin size={20} weight="duotone" /> Revenue per Location
                    </h2>
                </div>
                <div className="card-body p-0">
                    {data.revenue_per_location.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Location</th>
                                    <th>Type</th>
                                    <th>Sessions</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.revenue_per_location.map((loc, i) => (
                                    <tr key={i}>
                                        <td className="font-medium">{loc.location_name}</td>
                                        <td>
                                            <span className={`badge ${loc.is_telehealth ? 'badge-info' : 'badge-default'}`}>
                                                {loc.is_telehealth ? 'Telehealth' : 'In-Person'}
                                            </span>
                                        </td>
                                        <td>{loc.sessions}</td>
                                        <td>{formatCurrency(loc.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState variant="no-data" title="No location data" description="No revenue data by location available yet." />
                    )}
                </div>
            </div>

            {/* ── ABA Utilization by Client ──────────────────────────────── */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">
                        <ChartBar size={20} weight="duotone" /> ABA Utilization by Client
                    </h2>
                    <div className="card-header-stats">
                        <span className="text-muted">
                            {data.aba_utilization.total_used}/{data.aba_utilization.total_approved} units
                            ({data.aba_utilization.utilization_percent}%)
                        </span>
                    </div>
                </div>
                <div className="card-body p-0">
                    {data.aba_utilization.by_client.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>Auth #</th>
                                    <th>Approved</th>
                                    <th>Used</th>
                                    <th>Utilization</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.aba_utilization.by_client.map((c, i) => (
                                    <tr key={i}>
                                        <td className="font-medium">{c.client_name}</td>
                                        <td>{c.authorization_number || '—'}</td>
                                        <td>{c.approved}</td>
                                        <td>{c.used}</td>
                                        <td>
                                            <span className={`badge ${c.percent >= 80 ? 'badge-warning' : c.percent >= 50 ? 'badge-success' : 'badge-default'}`}>
                                                {c.percent}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState variant="no-data" title="No utilization data" description="No active authorizations to display." />
                    )}
                </div>
            </div>

            {/* ── Referral Source ROI ────────────────────────────────────── */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">
                        <UsersFour size={20} weight="duotone" /> Referral Source ROI
                    </h2>
                </div>
                <div className="card-body p-0">
                    {data.referral_source_roi.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Referral Source</th>
                                    <th>Clients</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.referral_source_roi.map((r, i) => (
                                    <tr key={i}>
                                        <td className="font-medium">{r.source}</td>
                                        <td>{r.clients}</td>
                                        <td>{formatCurrency(r.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState variant="no-data" title="No referral data" description="Add referral sources to clients to see ROI data." />
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
