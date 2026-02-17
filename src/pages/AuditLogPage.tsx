import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout'
import EmptyState from '../components/ui/EmptyState'
import { PageSkeleton } from '../components/ui'
import {
    ClockCounterClockwise,
    MagnifyingGlass,
    DownloadSimple,
    User,
    PencilSimple,
    Trash,
    Plus,
    Eye,
    SignIn,
    SignOut,
    Key,
    CalendarBlank
} from '@phosphor-icons/react'

interface AuditEntry {
    id: number
    timestamp: string
    userId: number
    userName: string
    action: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'password_change'
    target: string
    details: string
    ipAddress: string
}

const mockAuditLog: AuditEntry[] = [
    { id: 1, timestamp: '2026-02-09T15:30:00', userId: 1, userName: 'Amanda Wilson', action: 'update', target: 'Client #3', details: 'Updated insurance information', ipAddress: '192.168.1.100' },
    { id: 2, timestamp: '2026-02-09T15:15:00', userId: 2, userName: 'Jessica Martinez', action: 'create', target: 'Session Note', details: 'Created note for Sarah Johnson', ipAddress: '192.168.1.105' },
    { id: 3, timestamp: '2026-02-09T14:45:00', userId: 1, userName: 'Amanda Wilson', action: 'view', target: 'Billing Report', details: 'Viewed February revenue report', ipAddress: '192.168.1.100' },
    { id: 4, timestamp: '2026-02-09T14:30:00', userId: 3, userName: 'Robert Kim', action: 'login', target: 'System', details: 'Logged in successfully', ipAddress: '192.168.1.110' },
    { id: 5, timestamp: '2026-02-09T14:00:00', userId: 5, userName: 'David Chen', action: 'update', target: 'Claim #CLM-2024-0089', details: 'Resubmitted denied claim', ipAddress: '192.168.1.115' },
    { id: 6, timestamp: '2026-02-09T13:30:00', userId: 4, userName: 'Maria Santos', action: 'create', target: 'Appointment', details: 'Scheduled appointment for Michael Chen on Feb 15', ipAddress: '192.168.1.108' },
    { id: 7, timestamp: '2026-02-09T12:00:00', userId: 2, userName: 'Jessica Martinez', action: 'logout', target: 'System', details: 'Logged out', ipAddress: '192.168.1.105' },
    { id: 8, timestamp: '2026-02-09T11:30:00', userId: 1, userName: 'Amanda Wilson', action: 'password_change', target: 'User #6', details: 'Reset password for Sarah Thompson', ipAddress: '192.168.1.100' },
    { id: 9, timestamp: '2026-02-09T11:00:00', userId: 5, userName: 'David Chen', action: 'create', target: 'Invoice #INV-2024-0161', details: 'Generated invoice for Emily Rodriguez', ipAddress: '192.168.1.115' },
    { id: 10, timestamp: '2026-02-09T10:30:00', userId: 4, userName: 'Maria Santos', action: 'update', target: 'Client #5', details: 'Updated authorization units', ipAddress: '192.168.1.108' },
    { id: 11, timestamp: '2026-02-08T17:00:00', userId: 1, userName: 'Amanda Wilson', action: 'delete', target: 'Document', details: 'Deleted outdated consent form for David Brown', ipAddress: '192.168.1.100' },
    { id: 12, timestamp: '2026-02-08T16:30:00', userId: 3, userName: 'Robert Kim', action: 'view', target: 'Client #2', details: 'Viewed Michael Chen profile', ipAddress: '192.168.1.110' },
]

const actionLabels: Record<string, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    view: 'Viewed',
    login: 'Login',
    logout: 'Logout',
    password_change: 'Password Reset'
}

const actionIcons: Record<string, React.ReactNode> = {
    create: <Plus size={14} weight="bold" />,
    update: <PencilSimple size={14} weight="bold" />,
    delete: <Trash size={14} weight="bold" />,
    view: <Eye size={14} weight="bold" />,
    login: <SignIn size={14} weight="bold" />,
    logout: <SignOut size={14} weight="bold" />,
    password_change: <Key size={14} weight="bold" />
}

const actionColors: Record<string, string> = {
    create: 'action-create',
    update: 'action-update',
    delete: 'action-delete',
    view: 'action-view',
    login: 'action-login',
    logout: 'action-logout',
    password_change: 'action-password'
}

export default function AuditLogPage() {
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    const [searchQuery, setSearchQuery] = useState('')
    const [actionFilter, setActionFilter] = useState('all')
    const [userFilter, setUserFilter] = useState('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    // Get unique users for filter
    const uniqueUsers = [...new Set(mockAuditLog.map(e => e.userName))]

    const filteredLog = mockAuditLog.filter(entry => {
        const matchesSearch = entry.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.userName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesAction = actionFilter === 'all' || entry.action === actionFilter
        const matchesUser = userFilter === 'all' || entry.userName === userFilter

        // Date filtering
        if (dateFrom && new Date(entry.timestamp) < new Date(dateFrom)) return false
        if (dateTo && new Date(entry.timestamp) > new Date(dateTo + 'T23:59:59')) return false

        return matchesSearch && matchesAction && matchesUser
    })

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const exportToCSV = () => {
        const headers = 'Timestamp,User,Action,Target,Details,IP Address\n'
        const rows = filteredLog.map((e: typeof mockAuditLog[0]) =>
            `"${e.timestamp}","${e.userName}","${e.action}","${e.target}","${e.details}","${e.ipAddress}"`
        ).join('\n')
        const csv = headers + rows
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'audit_log.csv'
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Audit log exported successfully')
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
                    <h1 className="page-title">
                        <ClockCounterClockwise size={28} weight="duotone" className="page-title-icon" />
                        Audit Log
                    </h1>
                    <p className="page-subtitle">Track all system activity for compliance</p>
                </div>
                <button className="btn-secondary" onClick={exportToCSV}>
                    <DownloadSimple size={18} weight="bold" />
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="filters-bar filters-bar-extended">
                <div className="search-input">
                    <MagnifyingGlass size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search activity..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="filter-select"
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                >
                    <option value="all">All Actions</option>
                    <option value="create">Created</option>
                    <option value="update">Updated</option>
                    <option value="delete">Deleted</option>
                    <option value="view">Viewed</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                    <option value="password_change">Password Reset</option>
                </select>
                <select
                    className="filter-select"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                >
                    <option value="all">All Users</option>
                    {uniqueUsers.map(user => (
                        <option key={user} value={user}>{user}</option>
                    ))}
                </select>
                <div className="date-range">
                    <CalendarBlank
                        size={18}
                        weight="regular"
                        onClick={() => {
                            const input = document.querySelector('.date-range input[type="date"]') as HTMLInputElement;
                            if (input) input.showPicker?.();
                        }}
                    />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        placeholder="From"
                    />
                    <span>to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        placeholder="To"
                    />
                </div>
            </div>

            {/* Results Count */}
            <div className="results-info">
                Showing {filteredLog.length} of {mockAuditLog.length} entries
            </div>

            {/* Audit Log Table */}
            <div className="card">
                <div className="card-body p-0">
                    <table className="data-table audit-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Target</th>
                                <th>Details</th>
                                <th>IP Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLog.map(entry => (
                                <tr key={entry.id}>
                                    <td className="text-muted timestamp-cell">
                                        {formatTimestamp(entry.timestamp)}
                                    </td>
                                    <td>
                                        <div className="user-cell-compact">
                                            <User size={16} />
                                            {entry.userName}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`action-badge ${actionColors[entry.action]}`}>
                                            {actionIcons[entry.action]}
                                            {actionLabels[entry.action]}
                                        </span>
                                    </td>
                                    <td className="font-semibold">{entry.target}</td>
                                    <td className="details-cell">{entry.details}</td>
                                    <td className="text-muted ip-cell">{entry.ipAddress}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredLog.length === 0 && (
                <EmptyState
                    variant="no-results"
                    title="No audit entries found"
                    description="Try adjusting your filters to see more results"
                />
            )}
        </DashboardLayout>
    )
}
