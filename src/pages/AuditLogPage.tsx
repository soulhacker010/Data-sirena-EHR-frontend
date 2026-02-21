import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout'
import { EmptyState, PageSkeleton } from '../components/ui'
import { auditApi } from '../api'
import type { AuditLog } from '../types'
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
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [actionFilter, setActionFilter] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadAuditLogs()
    }, [])

    // Auto-refetch when filters change
    useEffect(() => {
        loadAuditLogs()
    }, [actionFilter, startDate, endDate])

    const loadAuditLogs = async () => {
        try {
            setIsLoading(true)
            const res = await auditApi.getAll({
                search: searchQuery || undefined,
                action: actionFilter !== 'all' ? actionFilter : undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                page_size: 100,
            })
            setLogs(res.results)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to load audit logs')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSearch = () => {
        loadAuditLogs()
    }

    const handleExportCSV = () => {
        const csvContent = [
            'Timestamp,User,Action,Target,Details,IP Address',
            ...logs.map(log =>
                `"${log.timestamp}","${log.user_name || ''}","${log.action}","${log.table_name || ''}","${log.record_id || ''}","${log.ip_address || ''}"`
            )
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Audit log exported')
    }

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
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
                <div className="page-header-left">
                    <h1 className="page-title">
                        <ClockCounterClockwise size={28} weight="duotone" />
                        Audit Log
                    </h1>
                    <p className="page-subtitle">{logs.length} entries</p>
                </div>
                <button className="btn-secondary" onClick={handleExportCSV} disabled={logs.length === 0}>
                    <DownloadSimple size={18} weight="bold" />
                    Export CSV
                </button>
            </div>

            <div className="filter-bar">
                <div className="search-input-wrapper">
                    <MagnifyingGlass size={18} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search audit log..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <select
                    className="filter-select"
                    value={actionFilter}
                    onChange={(e) => { setActionFilter(e.target.value) }}
                >
                    <option value="all">All Actions</option>
                    <option value="create">Created</option>
                    <option value="update">Updated</option>
                    <option value="delete">Deleted</option>
                    <option value="view">Viewed</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                </select>
                <div className="date-filter">
                    <CalendarBlank size={16} />
                    <input
                        type="date"
                        className="date-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span>to</span>
                    <input
                        type="date"
                        className="date-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <button className="btn-secondary btn-sm" onClick={handleSearch}>
                    <MagnifyingGlass size={16} /> Search
                </button>
            </div>

            <div className="card">
                <div className="card-body p-0">
                    {logs.length > 0 ? (
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
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td className="text-muted">{formatTimestamp(log.timestamp)}</td>
                                        <td>
                                            <div className="user-cell">
                                                <User size={16} />
                                                <span>{log.user_name || log.user_id}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`action-badge ${actionColors[log.action] || ''}`}>
                                                {actionIcons[log.action]}
                                                {actionLabels[log.action] || log.action}
                                            </span>
                                        </td>
                                        <td>{log.table_name || '—'}</td>
                                        <td className="audit-details">{log.record_id || '—'}</td>
                                        <td className="text-muted font-mono">{log.ip_address || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState
                            variant="no-data"
                            title="No audit entries"
                            description="Audit entries will appear here as users perform actions."
                        />
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}
