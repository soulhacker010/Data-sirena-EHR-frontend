import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { getApiErrorMessage } from '../utils/errors'
import { DashboardLayout } from '../components/layout'
import { EmptyState, PageSkeleton } from '../components/ui'
import { auditApi } from '../api'
import type { AuditLog } from '../types'
import {
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
    CalendarBlank,
    PenNib,
    FileArrowDown,
    Warning,
    FileCsv,
    ShieldCheck,
    Lock,
    Play,
} from '@phosphor-icons/react'

const actionLabels: Record<string, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    view: 'Viewed',
    login: 'Login',
    logout: 'Logout',
    password_change: 'Password Changed',
    failed_login: 'Failed Login',
    sign: 'Note Signed',
    co_sign: 'Note Co-signed',
    session_start: 'Session Started',
    phi_access: 'PHI Accessed',
    document_access: 'Document Viewed',
    document_download: 'Document Downloaded',
    export: 'Data Exported',
}

const actionIcons: Record<string, React.ReactNode> = {
    create: <Plus size={13} weight="bold" />,
    update: <PencilSimple size={13} weight="bold" />,
    delete: <Trash size={13} weight="bold" />,
    view: <Eye size={13} weight="bold" />,
    login: <SignIn size={13} weight="bold" />,
    logout: <SignOut size={13} weight="bold" />,
    password_change: <Key size={13} weight="bold" />,
    failed_login: <Warning size={13} weight="bold" />,
    sign: <PenNib size={13} weight="bold" />,
    co_sign: <PenNib size={13} weight="bold" />,
    session_start: <Play size={13} weight="bold" />,
    phi_access: <ShieldCheck size={13} weight="bold" />,
    document_access: <Eye size={13} weight="bold" />,
    document_download: <FileArrowDown size={13} weight="bold" />,
    export: <FileCsv size={13} weight="bold" />,
}

const actionColors: Record<string, string> = {
    create: 'action-create',
    update: 'action-update',
    delete: 'action-delete',
    view: 'action-view',
    login: 'action-login',
    logout: 'action-logout',
    password_change: 'action-password',
    failed_login: 'action-danger',
    sign: 'action-sign',
    co_sign: 'action-sign',
    session_start: 'action-session',
    phi_access: 'action-phi',
    document_access: 'action-view',
    document_download: 'action-download',
    export: 'action-export',
}

const tableLabels: Record<string, string> = {
    clients: 'Client',
    notes: 'Note',
    appointments: 'Appointment',
    invoices: 'Invoice',
    payments: 'Payment',
    claims: 'Claim',
    users: 'User',
    intakes: 'Intake',
    treatment_plans: 'Treatment Plan',
    documents: 'Document',
    authorizations: 'Authorization',
    auth: 'Auth',
    reports: 'Report',
    billing: 'Billing',
}

const ACTION_GROUPS = [
    { label: 'Data Changes', options: [
        { value: 'create', label: 'Created' },
        { value: 'update', label: 'Updated' },
        { value: 'delete', label: 'Deleted' },
    ]},
    { label: 'Clinical', options: [
        { value: 'session_start', label: 'Session Started' },
        { value: 'sign', label: 'Note Signed' },
        { value: 'co_sign', label: 'Note Co-signed' },
        { value: 'phi_access', label: 'PHI Accessed' },
    ]},
    { label: 'Documents', options: [
        { value: 'document_access', label: 'Document Viewed' },
        { value: 'document_download', label: 'Document Downloaded' },
        { value: 'export', label: 'Data Exported' },
    ]},
    { label: 'Authentication', options: [
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' },
        { value: 'failed_login', label: 'Failed Login' },
        { value: 'password_change', label: 'Password Changed' },
    ]},
]

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
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to load audit logs'))
        } finally {
            setIsLoading(false)
        }
    }

    const handleSearch = () => loadAuditLogs()

    const handleExportCSV = () => {
        const csvContent = [
            'Timestamp,User,Action,Resource,Record ID,IP Address',
            ...logs.map(log =>
                `"${log.timestamp}","${log.user_name || ''}","${actionLabels[log.action] || log.action}","${tableLabels[log.table_name || ''] || log.table_name || ''}","${log.record_id || ''}","${log.ip_address || ''}"`
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

    const formatTimestamp = (timestamp: string) =>
        new Date(timestamp).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })

    const getDetails = (log: AuditLog): string => {
        if (!log.changes || typeof log.changes !== 'object') return '—'
        const c = log.changes as Record<string, unknown>
        if (c.client_name) return String(c.client_name)
        if (c.file_name) return String(c.file_name)
        if (c.report) return `Report: ${c.report}`
        if (c.email) return String(c.email)
        return '—'
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
                        <Lock size={26} weight="duotone" />
                        Audit Log
                    </h1>
                    <p className="page-subtitle">{logs.length} entries — HIPAA activity trail</p>
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
                        placeholder="Search by user, resource..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <select
                    className="filter-select"
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                >
                    <option value="all">All Actions</option>
                    {ACTION_GROUPS.map(group => (
                        <optgroup key={group.label} label={group.label}>
                            {group.options.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                <div className="date-filter">
                    <CalendarBlank size={16} />
                    <input type="date" className="date-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <span>to</span>
                    <input type="date" className="date-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
                                    <th>Resource</th>
                                    <th>Details</th>
                                    <th>IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className={log.action === 'failed_login' ? 'row-danger' : ''}>
                                        <td className="text-muted text-sm">{formatTimestamp(log.timestamp)}</td>
                                        <td>
                                            <div className="user-cell">
                                                <User size={15} />
                                                <span>{log.user_name || log.user_id || 'Anonymous'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`action-badge ${actionColors[log.action] || 'action-view'}`}>
                                                {actionIcons[log.action] || <Eye size={13} weight="bold" />}
                                                {actionLabels[log.action] || log.action}
                                            </span>
                                        </td>
                                        <td className="text-sm font-medium">
                                            {tableLabels[log.table_name || ''] || log.table_name || '—'}
                                        </td>
                                        <td className="audit-details text-muted text-sm">
                                            {getDetails(log)}
                                        </td>
                                        <td className="text-muted font-mono text-xs">{log.ip_address || '—'}</td>
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
