import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout'
import { PageSkeleton } from '../components/ui'
import {
    ChartBar,
    FileText,
    ClipboardText,
    Warning,
    DownloadSimple,
    MagnifyingGlass,
    CaretDown,
    CaretUp
} from '@phosphor-icons/react'

// Mock authorization data
const mockAuthorizations = [
    { id: 1, clientName: 'Sarah Johnson', clientId: 1, service: 'ABA Therapy', payer: 'Blue Cross', totalUnits: 120, usedUnits: 108, startDate: '2024-01-01', endDate: '2024-06-30', status: 'active' },
    { id: 2, clientName: 'Michael Chen', clientId: 2, service: 'Speech Therapy', payer: 'Aetna', totalUnits: 48, usedUnits: 24, startDate: '2024-02-01', endDate: '2024-07-31', status: 'active' },
    { id: 3, clientName: 'Emily Rodriguez', clientId: 3, service: 'ABA Therapy', payer: 'United Healthcare', totalUnits: 200, usedUnits: 195, startDate: '2024-01-15', endDate: '2024-07-15', status: 'active' },
    { id: 4, clientName: 'David Brown', clientId: 4, service: 'Occupational Therapy', payer: 'Cigna', totalUnits: 60, usedUnits: 30, startDate: '2024-03-01', endDate: '2024-08-31', status: 'active' },
    { id: 5, clientName: 'Sophie Williams', clientId: 5, service: 'ABA Therapy', payer: 'Medicaid', totalUnits: 160, usedUnits: 140, startDate: '2024-01-01', endDate: '2024-06-30', status: 'active' },
    { id: 6, clientName: 'James Taylor', clientId: 6, service: 'Speech Therapy', payer: 'Blue Cross', totalUnits: 36, usedUnits: 12, startDate: '2024-04-01', endDate: '2024-09-30', status: 'active' },
]

// Mock missing notes data
const mockMissingNotes = [
    { id: 1, clientName: 'Sarah Johnson', sessionDate: '2024-02-07', service: 'ABA Session', provider: 'Dr. Amanda Wilson', daysOverdue: 2 },
    { id: 2, clientName: 'Michael Chen', sessionDate: '2024-02-06', service: 'Speech Session', provider: 'Jessica Martinez', daysOverdue: 3 },
    { id: 3, clientName: 'Emily Rodriguez', sessionDate: '2024-02-08', service: 'ABA Session', provider: 'Dr. Amanda Wilson', daysOverdue: 1 },
    { id: 4, clientName: 'David Brown', sessionDate: '2024-02-05', service: 'OT Session', provider: 'Robert Kim', daysOverdue: 4 },
    { id: 5, clientName: 'Sophie Williams', sessionDate: '2024-02-04', service: 'ABA Session', provider: 'Maria Santos', daysOverdue: 5 },
]

type ReportView = 'overview' | 'authorizations' | 'missing-notes'

export default function ReportsPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [activeView, setActiveView] = useState<ReportView>('overview')

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])
    const [authFilter, setAuthFilter] = useState({ service: '', payer: '', status: 'all' })
    const [notesFilter, setNotesFilter] = useState({ provider: '', dateFrom: '', dateTo: '' })
    const [sortField, setSortField] = useState<string>('usedPercent')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

    // Calculate usage percentage for authorizations
    const authsWithPercent = mockAuthorizations.map(auth => ({
        ...auth,
        usedPercent: Math.round((auth.usedUnits / auth.totalUnits) * 100),
        remaining: auth.totalUnits - auth.usedUnits
    }))

    // Filter and sort authorizations
    const filteredAuths = authsWithPercent
        .filter(auth => {
            if (authFilter.service && !auth.service.toLowerCase().includes(authFilter.service.toLowerCase())) return false
            if (authFilter.payer && !auth.payer.toLowerCase().includes(authFilter.payer.toLowerCase())) return false
            if (authFilter.status === 'expiring' && auth.usedPercent < 80) return false
            if (authFilter.status === 'critical' && auth.usedPercent < 95) return false
            return true
        })
        .sort((a, b) => {
            const aVal = a[sortField as keyof typeof a]
            const bVal = b[sortField as keyof typeof b]
            if (sortDir === 'asc') return aVal > bVal ? 1 : -1
            return aVal < bVal ? 1 : -1
        })

    // Filter missing notes
    const filteredNotes = mockMissingNotes.filter(note => {
        if (notesFilter.provider && !note.provider.toLowerCase().includes(notesFilter.provider.toLowerCase())) return false
        return true
    })

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDir('desc')
        }
    }

    const getUsageClass = (percent: number) => {
        if (percent >= 95) return 'critical'
        if (percent >= 80) return 'warning'
        return ''
    }

    const exportToCSV = (type: 'auth' | 'notes') => {
        const filename = type === 'auth' ? 'authorization_report.csv' : 'missing_notes_report.csv'
        let csv = ''
        if (type === 'auth') {
            csv = 'Client,Service,Payer,Used,Total,Remaining,% Used\n'
            csv += filteredAuths.map(a =>
                `"${a.clientName}","${a.service}","${a.payer}",${a.usedUnits},${a.totalUnits},${a.remaining},${a.usedPercent}%`
            ).join('\n')
        } else {
            csv = 'Client,Session Date,Provider,Days Overdue\n'
            csv += filteredNotes.map(n =>
                `"${n.clientName}","${n.sessionDate}","${n.provider}",${n.daysOverdue}`
            ).join('\n')
        }
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Report exported successfully')
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-content">
                    <h1 className="page-title">Reports</h1>
                    <p className="page-subtitle">Analytics and compliance reports</p>
                </div>
            </div>

            {/* Report Navigation */}
            <div className="report-tabs">
                <button
                    className={`report-tab ${activeView === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveView('overview')}
                >
                    <ChartBar size={18} weight="duotone" />
                    Overview
                </button>
                <button
                    className={`report-tab ${activeView === 'authorizations' ? 'active' : ''}`}
                    onClick={() => setActiveView('authorizations')}
                >
                    <ClipboardText size={18} weight="duotone" />
                    Authorization Usage
                </button>
                <button
                    className={`report-tab ${activeView === 'missing-notes' ? 'active' : ''}`}
                    onClick={() => setActiveView('missing-notes')}
                >
                    <FileText size={18} weight="duotone" />
                    Missing Notes
                </button>
            </div>

            {/* Overview */}
            {activeView === 'overview' && (
                <div className="reports-grid">
                    <div className="report-card" onClick={() => setActiveView('authorizations')}>
                        <div className="report-card-icon auth">
                            <ClipboardText size={32} weight="duotone" />
                        </div>
                        <div className="report-card-content">
                            <h3>Authorization Usage</h3>
                            <p>Track unit usage across all client authorizations</p>
                            <div className="report-card-stats">
                                <span className="stat warning">{authsWithPercent.filter(a => a.usedPercent >= 80 && a.usedPercent < 95).length} Near Limit</span>
                                <span className="stat critical">{authsWithPercent.filter(a => a.usedPercent >= 95).length} Critical</span>
                            </div>
                        </div>
                    </div>

                    <div className="report-card" onClick={() => setActiveView('missing-notes')}>
                        <div className="report-card-icon notes">
                            <FileText size={32} weight="duotone" />
                        </div>
                        <div className="report-card-content">
                            <h3>Missing Progress Notes</h3>
                            <p>Sessions without completed documentation</p>
                            <div className="report-card-stats">
                                <span className="stat critical">{mockMissingNotes.length} Notes Missing</span>
                                <span className="stat warning">{mockMissingNotes.filter(n => n.daysOverdue > 3).length} Overdue &gt;3 days</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Authorization Usage Report */}
            {activeView === 'authorizations' && (
                <div className="report-container">
                    <div className="report-header">
                        <h2>Authorization Usage Report</h2>
                        <button className="btn-secondary" onClick={() => exportToCSV('auth')}>
                            <DownloadSimple size={18} weight="bold" />
                            Export CSV
                        </button>
                    </div>

                    <div className="report-filters">
                        <div className="filter-group">
                            <MagnifyingGlass size={18} className="filter-icon" />
                            <input
                                type="text"
                                placeholder="Filter by service..."
                                className="filter-input"
                                value={authFilter.service}
                                onChange={(e) => setAuthFilter({ ...authFilter, service: e.target.value })}
                            />
                        </div>
                        <div className="filter-group">
                            <input
                                type="text"
                                placeholder="Filter by payer..."
                                className="filter-input"
                                value={authFilter.payer}
                                onChange={(e) => setAuthFilter({ ...authFilter, payer: e.target.value })}
                            />
                        </div>
                        <div className="filter-group">
                            <select
                                className="filter-select"
                                value={authFilter.status}
                                onChange={(e) => setAuthFilter({ ...authFilter, status: e.target.value })}
                            >
                                <option value="all">All Statuses</option>
                                <option value="expiring">Near Limit (≥80%)</option>
                                <option value="critical">Critical (≥95%)</option>
                            </select>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-body p-0">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="th-sortable" onClick={() => handleSort('clientName')}>
                                            Client
                                            {sortField === 'clientName' && (sortDir === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />)}
                                        </th>
                                        <th>Service</th>
                                        <th>Payer</th>
                                        <th className="th-sortable text-right" onClick={() => handleSort('totalUnits')}>
                                            Total Units
                                            {sortField === 'totalUnits' && (sortDir === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />)}
                                        </th>
                                        <th className="th-sortable text-right" onClick={() => handleSort('usedUnits')}>
                                            Used
                                            {sortField === 'usedUnits' && (sortDir === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />)}
                                        </th>
                                        <th className="text-right">Remaining</th>
                                        <th className="th-sortable text-right" onClick={() => handleSort('usedPercent')}>
                                            % Used
                                            {sortField === 'usedPercent' && (sortDir === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />)}
                                        </th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAuths.map(auth => (
                                        <tr key={auth.id} className={getUsageClass(auth.usedPercent)}>
                                            <td className="font-semibold">{auth.clientName}</td>
                                            <td>{auth.service}</td>
                                            <td>{auth.payer}</td>
                                            <td className="text-right">{auth.totalUnits}</td>
                                            <td className="text-right">{auth.usedUnits}</td>
                                            <td className="text-right">{auth.remaining}</td>
                                            <td className="text-right">
                                                <span className={`usage-badge ${getUsageClass(auth.usedPercent)}`}>
                                                    {auth.usedPercent}%
                                                </span>
                                            </td>
                                            <td>
                                                {auth.usedPercent >= 95 ? (
                                                    <span className="badge badge-error">Critical</span>
                                                ) : auth.usedPercent >= 80 ? (
                                                    <span className="badge badge-warning">Near Limit</span>
                                                ) : (
                                                    <span className="badge badge-active">Active</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="report-summary">
                        <div className="summary-card">
                            <p className="summary-label">Total Authorizations</p>
                            <p className="summary-value">{filteredAuths.length}</p>
                        </div>
                        <div className="summary-card warning">
                            <p className="summary-label">Near Limit (≥80%)</p>
                            <p className="summary-value">{filteredAuths.filter(a => a.usedPercent >= 80 && a.usedPercent < 95).length}</p>
                        </div>
                        <div className="summary-card critical">
                            <p className="summary-label">Critical (≥95%)</p>
                            <p className="summary-value">{filteredAuths.filter(a => a.usedPercent >= 95).length}</p>
                        </div>
                        <div className="summary-card">
                            <p className="summary-label">Total Units Available</p>
                            <p className="summary-value">{filteredAuths.reduce((sum, a) => sum + a.remaining, 0)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Missing Progress Notes Report */}
            {activeView === 'missing-notes' && (
                <div className="report-container">
                    <div className="report-header">
                        <h2>Missing Progress Notes</h2>
                        <button className="btn-secondary" onClick={() => exportToCSV('notes')}>
                            <DownloadSimple size={18} weight="bold" />
                            Export CSV
                        </button>
                    </div>

                    <div className="report-filters">
                        <div className="filter-group">
                            <MagnifyingGlass size={18} className="filter-icon" />
                            <input
                                type="text"
                                placeholder="Filter by provider..."
                                className="filter-input"
                                value={notesFilter.provider}
                                onChange={(e) => setNotesFilter({ ...notesFilter, provider: e.target.value })}
                            />
                        </div>
                        <div className="filter-group">
                            <input
                                type="date"
                                className="filter-input"
                                value={notesFilter.dateFrom}
                                onChange={(e) => setNotesFilter({ ...notesFilter, dateFrom: e.target.value })}
                            />
                        </div>
                        <div className="filter-group">
                            <input
                                type="date"
                                className="filter-input"
                                value={notesFilter.dateTo}
                                onChange={(e) => setNotesFilter({ ...notesFilter, dateTo: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-body p-0">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Client</th>
                                        <th>Session Date</th>
                                        <th>Service</th>
                                        <th>Provider</th>
                                        <th>Days Overdue</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredNotes.map(note => (
                                        <tr key={note.id} className={note.daysOverdue > 3 ? 'critical' : note.daysOverdue > 1 ? 'warning' : ''}>
                                            <td className="font-semibold">{note.clientName}</td>
                                            <td>{note.sessionDate}</td>
                                            <td>{note.service}</td>
                                            <td>{note.provider}</td>
                                            <td>
                                                <span className={`days-overdue ${note.daysOverdue > 3 ? 'critical' : note.daysOverdue > 1 ? 'warning' : ''}`}>
                                                    {note.daysOverdue} day{note.daysOverdue !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-primary btn-sm"
                                                    onClick={() => window.location.href = `/notes/new?client=${note.clientName}`}
                                                >
                                                    Complete Note
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Alert for overdue notes */}
                    {filteredNotes.some(n => n.daysOverdue > 3) && (
                        <div className="report-alert warning">
                            <Warning size={20} weight="fill" />
                            <span>
                                <strong>{filteredNotes.filter(n => n.daysOverdue > 3).length} notes</strong> are overdue by more than 3 days.
                                Please complete these as soon as possible for compliance.
                            </span>
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    )
}
