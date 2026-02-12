import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import {
    ArrowLeft,
    Download,
    FunnelSimple,
    MagnifyingGlass,
    Warning,
    Clock,
    PencilSimple,
    CalendarBlank,
    User
} from '@phosphor-icons/react'

// Mock missing notes data
const mockMissingNotes = [
    {
        id: 1,
        clientId: '1',
        clientName: 'Sarah Johnson',
        sessionDate: '2026-02-07',
        serviceCode: '97153',
        serviceName: 'Adaptive Behavior Treatment',
        provider: 'Dr. Amanda Wilson',
        daysOverdue: 2,
        appointmentId: 'apt-001'
    },
    {
        id: 2,
        clientId: '2',
        clientName: 'Michael Chen',
        sessionDate: '2026-02-06',
        serviceCode: '97153',
        serviceName: 'Adaptive Behavior Treatment',
        provider: 'Dr. Amanda Wilson',
        daysOverdue: 3,
        appointmentId: 'apt-002'
    },
    {
        id: 3,
        clientId: '3',
        clientName: 'Emma Davis',
        sessionDate: '2026-02-05',
        serviceCode: '97155',
        serviceName: 'Behavior Modification',
        provider: 'Jessica Martinez',
        daysOverdue: 4,
        appointmentId: 'apt-003'
    },
    {
        id: 4,
        clientId: '4',
        clientName: 'James Wilson',
        sessionDate: '2026-02-03',
        serviceCode: '97153',
        serviceName: 'Adaptive Behavior Treatment',
        provider: 'Jessica Martinez',
        daysOverdue: 6,
        appointmentId: 'apt-004'
    },
    {
        id: 5,
        clientId: '5',
        clientName: 'Olivia Martinez',
        sessionDate: '2026-02-01',
        serviceCode: '97156',
        serviceName: 'Family Training',
        provider: 'Dr. Amanda Wilson',
        daysOverdue: 8,
        appointmentId: 'apt-005'
    },
    {
        id: 6,
        clientId: '6',
        clientName: 'Liam Brown',
        sessionDate: '2026-02-08',
        serviceCode: '97153',
        serviceName: 'Adaptive Behavior Treatment',
        provider: 'Dr. Amanda Wilson',
        daysOverdue: 1,
        appointmentId: 'apt-006'
    }
]

const providers = ['Dr. Amanda Wilson', 'Jessica Martinez']
const services = ['97153', '97155', '97156']

export default function MissingNotesReportPage() {
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')
    const [filterProvider, setFilterProvider] = useState('all')
    const [filterService, setFilterService] = useState('all')
    const [filterOverdue, setFilterOverdue] = useState('all')

    // Filter notes
    const filteredNotes = mockMissingNotes.filter(note => {
        const matchesSearch = note.clientName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesProvider = filterProvider === 'all' || note.provider === filterProvider
        const matchesService = filterService === 'all' || note.serviceCode === filterService
        const matchesOverdue = filterOverdue === 'all' ||
            (filterOverdue === 'critical' && note.daysOverdue >= 7) ||
            (filterOverdue === 'warning' && note.daysOverdue >= 3 && note.daysOverdue < 7) ||
            (filterOverdue === 'recent' && note.daysOverdue < 3)

        return matchesSearch && matchesProvider && matchesService && matchesOverdue
    })

    // Sort by days overdue (most overdue first)
    const sortedNotes = [...filteredNotes].sort((a, b) => b.daysOverdue - a.daysOverdue)

    const getOverdueClass = (days: number) => {
        if (days >= 7) return 'overdue-critical'
        if (days >= 3) return 'overdue-warning'
        return 'overdue-recent'
    }

    const getOverdueBadge = (days: number) => {
        if (days >= 7) {
            return <span className="status-badge status-cancelled">{days} days overdue</span>
        }
        if (days >= 3) {
            return <span className="status-badge status-pending">{days} days overdue</span>
        }
        return <span className="status-badge status-draft">{days} day{days > 1 ? 's' : ''} ago</span>
    }

    const handleExportCSV = () => {
        const headers = ['Client', 'Session Date', 'Service Code', 'Service Name', 'Provider', 'Days Overdue']
        const rows = sortedNotes.map(note => [
            note.clientName,
            note.sessionDate,
            note.serviceCode,
            note.serviceName,
            note.provider,
            note.daysOverdue
        ])

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `missing_notes_report_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    const handleCreateNote = (appointmentId: string) => {
        navigate(`/notes/${appointmentId}/edit`)
    }

    // Summary stats
    const totalMissing = sortedNotes.length
    const criticalCount = sortedNotes.filter(n => n.daysOverdue >= 7).length
    const warningCount = sortedNotes.filter(n => n.daysOverdue >= 3 && n.daysOverdue < 7).length

    return (
        <DashboardLayout>
            <div className="page-header">
                <div className="page-header-content">
                    <button className="btn-ghost" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={20} />
                        Back to Reports
                    </button>
                    <h1 className="page-title">Missing Progress Notes</h1>
                    <p className="page-subtitle">Sessions that require documentation to be completed</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn-secondary" onClick={handleExportCSV}>
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="report-summary-cards">
                <div className="report-summary-card">
                    <span className="summary-label">Total Missing Notes</span>
                    <span className="summary-value">{totalMissing}</span>
                </div>
                <div className="report-summary-card warning">
                    <span className="summary-label">
                        <Clock size={16} weight="fill" />
                        3-6 Days Overdue
                    </span>
                    <span className="summary-value">{warningCount}</span>
                </div>
                <div className="report-summary-card critical">
                    <span className="summary-label">
                        <Warning size={16} weight="fill" />
                        7+ Days Overdue
                    </span>
                    <span className="summary-value">{criticalCount}</span>
                </div>
            </div>

            {/* Alert Banner */}
            {criticalCount > 0 && (
                <div className="alert-banner alert-error">
                    <Warning size={20} weight="fill" />
                    <span>
                        <strong>{criticalCount} session{criticalCount > 1 ? 's' : ''}</strong> have notes overdue by 7+ days.
                        Complete these immediately to remain compliant.
                    </span>
                </div>
            )}

            {/* Filters */}
            <div className="report-filters">
                <div className="search-box">
                    <MagnifyingGlass size={18} />
                    <input
                        type="text"
                        placeholder="Search by client name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <FunnelSimple size={18} />
                    <select value={filterProvider} onChange={(e) => setFilterProvider(e.target.value)}>
                        <option value="all">All Providers</option>
                        {providers.map(provider => (
                            <option key={provider} value={provider}>{provider}</option>
                        ))}
                    </select>

                    <select value={filterService} onChange={(e) => setFilterService(e.target.value)}>
                        <option value="all">All Services</option>
                        {services.map(service => (
                            <option key={service} value={service}>{service}</option>
                        ))}
                    </select>

                    <select value={filterOverdue} onChange={(e) => setFilterOverdue(e.target.value)}>
                        <option value="all">All Overdue</option>
                        <option value="critical">7+ Days (Critical)</option>
                        <option value="warning">3-6 Days (Warning)</option>
                        <option value="recent">1-2 Days (Recent)</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="card">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Client</th>
                            <th>Session Date</th>
                            <th>Service</th>
                            <th>Provider</th>
                            <th>Overdue</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedNotes.map(note => (
                            <tr key={note.id} className={getOverdueClass(note.daysOverdue)}>
                                <td>
                                    <div className="client-cell">
                                        <div className="avatar-sm">
                                            {note.clientName.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <a
                                            href={`/clients/${note.clientId}`}
                                            className="link-primary"
                                        >
                                            {note.clientName}
                                        </a>
                                    </div>
                                </td>
                                <td>
                                    <div className="date-cell">
                                        <CalendarBlank size={16} />
                                        {new Date(note.sessionDate).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </td>
                                <td>
                                    <div>
                                        <strong>{note.serviceCode}</strong>
                                        <span className="text-muted block">{note.serviceName}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="provider-cell">
                                        <User size={16} />
                                        {note.provider}
                                    </div>
                                </td>
                                <td>{getOverdueBadge(note.daysOverdue)}</td>
                                <td>
                                    <button
                                        className="btn-sm btn-primary"
                                        onClick={() => handleCreateNote(note.appointmentId)}
                                    >
                                        <PencilSimple size={14} />
                                        Write Note
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {sortedNotes.length === 0 && (
                    <div className="empty-state">
                        <p>🎉 All session notes are complete!</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
