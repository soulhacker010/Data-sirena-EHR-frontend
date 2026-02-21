import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton, EmptyState } from '../components/ui'
import { reportsApi } from '../api'
import type { SessionSummaryReport } from '../api/reports'
import {
    ArrowLeft,
    Download,
    ChartBar,
    Clock,
    Users,
    CalendarCheck,
    CalendarBlank
} from '@phosphor-icons/react'

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

export default function SessionSummaryReportPage() {
    const navigate = useNavigate()
    const [data, setData] = useState<SessionSummaryReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [filterProvider, setFilterProvider] = useState('')

    const loadReport = async () => {
        try {
            setIsLoading(true)
            const report = await reportsApi.getSessionSummary({
                start_date: dateFrom || undefined,
                end_date: dateTo || undefined,
                provider_id: filterProvider || undefined,
            })
            setData(report)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to load report')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadReport()
    }, [])

    const handleExportCSV = () => {
        if (!data) return
        const headers = ['Provider', 'Sessions', 'Hours', 'Units']
        const rows = data.provider_breakdown.map(p => [
            p.provider_name, p.sessions, p.hours, p.units
        ])
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `session-summary-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Report exported')
    }

    if (isLoading || !data) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-left">
                    <button className="btn-ghost" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={20} /> Back to Reports
                    </button>
                    <h1 className="page-title">
                        <ChartBar size={28} weight="duotone" />
                        Session Summary Report
                    </h1>
                </div>
                <button className="btn-secondary" onClick={handleExportCSV}>
                    <Download size={18} weight="bold" /> Export CSV
                </button>
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

            {/* Summary Stats */}
            <div className="report-stats-grid">
                <div className="report-stat-card">
                    <CalendarCheck size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{data.total_sessions}</p>
                    <p className="stat-label">Total Sessions</p>
                </div>
                <div className="report-stat-card">
                    <Clock size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{data.total_hours}</p>
                    <p className="stat-label">Total Hours</p>
                </div>
                <div className="report-stat-card">
                    <ChartBar size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{data.total_units}</p>
                    <p className="stat-label">Total Units</p>
                </div>
                <div className="report-stat-card">
                    <Users size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{data.unique_clients}</p>
                    <p className="stat-label">Unique Clients</p>
                </div>
            </div>

            {/* Provider Breakdown */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">Provider Breakdown</h2>
                </div>
                <div className="card-body p-0">
                    {data.provider_breakdown.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Provider</th>
                                    <th>Sessions</th>
                                    <th>Hours</th>
                                    <th>Units</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.provider_breakdown.map((p, i) => (
                                    <tr key={i}>
                                        <td className="font-medium">{p.provider_name}</td>
                                        <td>{p.sessions}</td>
                                        <td>{p.hours}</td>
                                        <td>{p.units}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState variant="no-data" title="No provider data" description="No provider breakdown available for the selected period." />
                    )}
                </div>
            </div>

            {/* Service Breakdown */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">Service Code Breakdown</h2>
                </div>
                <div className="card-body p-0">
                    {data.service_breakdown.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Service Code</th>
                                    <th>Description</th>
                                    <th>Sessions</th>
                                    <th>Units</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.service_breakdown.map((s, i) => (
                                    <tr key={i}>
                                        <td><span className="cpt-code">{s.service_code}</span></td>
                                        <td>{s.description}</td>
                                        <td>{s.sessions}</td>
                                        <td>{s.units}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState variant="no-data" title="No service data" description="No service breakdown available for the selected period." />
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
