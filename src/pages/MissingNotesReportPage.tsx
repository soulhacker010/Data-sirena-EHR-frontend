import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, Link } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton, EmptyState } from '../components/ui'
import { reportsApi } from '../api'
import type { MissingNotesReport } from '../api/reports'
import {
    ArrowLeft,
    Download,
    Warning,
    Clock,
    PencilSimple,
    CalendarBlank,
    User
} from '@phosphor-icons/react'

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function MissingNotesReportPage() {
    const navigate = useNavigate()
    const [data, setData] = useState<MissingNotesReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    const loadReport = async () => {
        try {
            setIsLoading(true)
            const report = await reportsApi.getMissingNotes()
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
        const headers = ['Client', 'Provider', 'Session Date', 'Service Code', 'Days Overdue']
        const rows = data.missing_notes.map(n => [
            n.client_name, n.provider_name, n.session_date, n.service_code, n.days_overdue
        ])
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `missing-notes-${new Date().toISOString().split('T')[0]}.csv`
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

    const notes = data.missing_notes
    const filtered = notes.filter(n =>
        `${n.client_name} ${n.provider_name} ${n.service_code}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    )

    const totalMissing = notes.length
    const critical = notes.filter(n => n.days_overdue >= 5).length
    const avgDaysOverdue = notes.length > 0
        ? Math.round(notes.reduce((sum, n) => sum + n.days_overdue, 0) / notes.length)
        : 0

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-left">
                    <button className="btn-ghost" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={20} /> Back to Reports
                    </button>
                    <h1 className="page-title">
                        <Warning size={28} weight="duotone" />
                        Missing Notes Report
                    </h1>
                </div>
                <button className="btn-secondary" onClick={handleExportCSV}>
                    <Download size={18} weight="bold" /> Export CSV
                </button>
            </div>

            {/* Summary Stats */}
            <div className="report-stats-grid">
                <div className="report-stat-card warning">
                    <PencilSimple size={24} weight="duotone" className="icon-warning" />
                    <p className="stat-value">{totalMissing}</p>
                    <p className="stat-label">Missing Notes</p>
                </div>
                <div className="report-stat-card danger">
                    <Warning size={24} weight="fill" className="icon-error" />
                    <p className="stat-value">{critical}</p>
                    <p className="stat-label">Critical (5+ days)</p>
                </div>
                <div className="report-stat-card">
                    <Clock size={24} weight="duotone" className="icon-primary" />
                    <p className="stat-value">{avgDaysOverdue}</p>
                    <p className="stat-label">Avg Days Overdue</p>
                </div>
            </div>

            {/* Search */}
            <div className="filter-bar">
                <div className="search-input-wrapper">
                    <User size={18} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by client or provider..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card">
                <div className="card-body p-0">
                    {filtered.length > 0 ? (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>Provider</th>
                                    <th>Session Date</th>
                                    <th>Service Code</th>
                                    <th>Days Overdue</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(n => (
                                    <tr key={n.id}>
                                        <td className="font-medium">{n.client_name}</td>
                                        <td>{n.provider_name}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <CalendarBlank size={14} />
                                                {formatDate(n.session_date)}
                                            </div>
                                        </td>
                                        <td><span className="cpt-code">{n.service_code}</span></td>
                                        <td>
                                            <span className={`badge ${n.days_overdue >= 5 ? 'badge-error' : n.days_overdue >= 3 ? 'badge-warning' : 'badge-pending'}`}>
                                                <Clock size={12} /> {n.days_overdue} days
                                            </span>
                                        </td>
                                        <td>
                                            <Link to={`/notes/new?client=${n.client_id}`} className="btn-sm btn-primary">
                                                <PencilSimple size={14} /> Write Note
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState
                            variant="no-data"
                            title={notes.length === 0 ? 'All notes completed!' : 'No results'}
                            description={notes.length === 0 ? 'Great job! All session notes are up to date.' : 'No missing notes match your search.'}
                        />
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
