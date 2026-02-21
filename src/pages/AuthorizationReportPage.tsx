import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton, EmptyState } from '../components/ui'
import { reportsApi } from '../api'
import type { AuthorizationReport } from '../api/reports'
import {
    ArrowLeft,
    Download,
    MagnifyingGlass,
    Warning,
    CheckCircle,
    Clock,
    ArrowsClockwise
} from '@phosphor-icons/react'

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function AuthorizationReportPage() {
    const navigate = useNavigate()
    const [data, setData] = useState<AuthorizationReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [payerFilter, setPayerFilter] = useState('')

    const loadReport = async () => {
        try {
            setIsLoading(true)
            const report = await reportsApi.getAuthorizationReport({
                status: statusFilter || undefined,
                payer: payerFilter || undefined,
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
        const headers = ['Client', 'Insurance', 'Auth #', 'Service', 'Approved', 'Used', 'Remaining', 'Utilization', 'Start', 'End', 'Expired']
        const rows = data.authorizations.map(a => [
            a.client_name, a.insurance_name, a.authorization_number, a.service_code,
            a.units_approved, a.units_used, a.units_remaining,
            `${a.utilization_percent}%`, a.start_date, a.end_date, a.is_expired ? 'Yes' : 'No'
        ])
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `authorization-report-${new Date().toISOString().split('T')[0]}.csv`
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

    // Compute summary stats
    const allAuths = data.authorizations
    const total = allAuths.length
    const critical = allAuths.filter(a => a.utilization_percent >= 80 && !a.is_expired).length
    const expiring = allAuths.filter(a => {
        const daysLeft = (new Date(a.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        return daysLeft < 30 && daysLeft > 0
    }).length
    const expired = allAuths.filter(a => a.is_expired).length

    // Filter
    const filtered = allAuths.filter(a => {
        const matchesSearch = `${a.client_name} ${a.insurance_name} ${a.authorization_number}`
            .toLowerCase().includes(searchQuery.toLowerCase())
        return matchesSearch
    })

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-left">
                    <button className="btn-ghost" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={20} /> Back to Reports
                    </button>
                    <h1 className="page-title">
                        <ArrowsClockwise size={28} weight="duotone" />
                        Authorization Report
                    </h1>
                </div>
                <button className="btn-secondary" onClick={handleExportCSV}>
                    <Download size={18} weight="bold" /> Export CSV
                </button>
            </div>

            {/* Summary Stats */}
            <div className="report-stats-grid">
                <div className="report-stat-card">
                    <CheckCircle size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{total}</p>
                    <p className="stat-label">Total Authorizations</p>
                </div>
                <div className="report-stat-card warning">
                    <Warning size={24} weight="duotone" className="icon-warning" />
                    <p className="stat-value">{critical}</p>
                    <p className="stat-label">Critical (≥80%)</p>
                </div>
                <div className="report-stat-card">
                    <Clock size={24} weight="duotone" className="icon-warning" />
                    <p className="stat-value">{expiring}</p>
                    <p className="stat-label">Expiring Soon</p>
                </div>
                <div className="report-stat-card danger">
                    <Warning size={24} weight="fill" className="icon-error" />
                    <p className="stat-value">{expired}</p>
                    <p className="stat-label">Expired</p>
                </div>
            </div>

            {/* Search / Filter */}
            <div className="filter-bar">
                <div className="search-input-wrapper">
                    <MagnifyingGlass size={18} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by client, payer, or auth #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="btn-secondary btn-sm" onClick={loadReport}>
                    <ArrowsClockwise size={16} /> Refresh
                </button>
            </div>

            {/* Authorization Table */}
            <div className="card">
                <div className="card-body p-0">
                    {filtered.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>Payer</th>
                                    <th>Auth #</th>
                                    <th>Service</th>
                                    <th>Used / Approved</th>
                                    <th>Utilization</th>
                                    <th>Period</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(a => {
                                    const percent = a.utilization_percent
                                    return (
                                        <tr key={a.id}>
                                            <td className="font-medium">{a.client_name}</td>
                                            <td>{a.insurance_name}</td>
                                            <td>{a.authorization_number}</td>
                                            <td><span className="cpt-code">{a.service_code}</span></td>
                                            <td>{a.units_used} / {a.units_approved}</td>
                                            <td>
                                                <div className="auth-progress-inline">
                                                    <div className="auth-progress-bar-sm">
                                                        <div
                                                            className={`auth-progress-fill ${percent >= 80 ? 'critical' : ''}`}
                                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className={percent >= 80 ? 'text-red-500' : ''}>{percent}%</span>
                                                </div>
                                            </td>
                                            <td className="text-muted">
                                                {formatDate(a.start_date)} — {formatDate(a.end_date)}
                                            </td>
                                            <td>
                                                {a.is_expired ? (
                                                    <span className="badge badge-error">Expired</span>
                                                ) : percent >= 80 ? (
                                                    <span className="badge badge-warning">Critical</span>
                                                ) : (
                                                    <span className="badge badge-active">Active</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState variant="no-data" title="No authorizations found" description="No authorizations match the current filters." />
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
