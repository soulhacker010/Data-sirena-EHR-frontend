import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../components/layout'
import { EmptyState, PageSkeleton } from '../components/ui'
import { dashboardApi, notificationsApi, getApiErrorMessage } from '../api'
import type { Notification, DashboardStats } from '../types'
import {
    BellRinging,
    Check,
    CheckCircle,
    Trash,
    Info,
    CalendarCheck,
    CurrencyDollar,
    FileText,
    ClipboardText,
    Clock,
    ArrowRight
} from '@phosphor-icons/react'

type EventCategory = 'authorization' | 'billing' | 'appointment' | 'notes' | 'general' | 'activity'

interface ImportantEvent {
    id: string
    title: string
    message: string
    category: EventCategory
    priority: Notification['priority']
    is_read: boolean
    action_url?: string
    created_at: string
    source: 'notification' | 'summary' | 'activity'
}

interface DashboardActivityEvent {
    id: string
    user_name: string
    action: string
    target: string
    timestamp: string
}

interface DashboardStatsWithActivity extends DashboardStats {
    recent_activity: DashboardActivityEvent[]
}

export default function NotificationsPage() {
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [dashboardStats, setDashboardStats] = useState<DashboardStatsWithActivity | null>(null)
    const [filterType, setFilterType] = useState<string>('all')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadEvents()
    }, [])

    const loadEvents = async () => {
        setIsLoading(true)
        const [notificationsResult, statsResult] = await Promise.allSettled([
            notificationsApi.getAll(),
            dashboardApi.getStats(),
        ])

        if (notificationsResult.status === 'fulfilled') {
            setNotifications(notificationsResult.value)
        } else {
            toast.error(getApiErrorMessage(notificationsResult.reason, 'Failed to load notifications'))
        }

        if (statsResult.status === 'fulfilled') {
            setDashboardStats(statsResult.value as DashboardStatsWithActivity)
        } else {
            toast.error(getApiErrorMessage(statsResult.reason, 'Failed to load important activity'))
        }

        setIsLoading(false)
    }

    const markAsRead = async (id: string) => {
        try {
            await notificationsApi.markAsRead(id)
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ))
        } catch {
            toast.error('Failed to mark as read')
        }
    }

    const markAllAsRead = async () => {
        try {
            await notificationsApi.markAllRead()
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            toast.success('All notifications marked as read')
        } catch {
            toast.error('Failed to mark all as read')
        }
    }

    const deleteNotification = async (id: string) => {
        try {
            await notificationsApi.delete(id)
            setNotifications(prev => prev.filter(n => n.id !== id))
        } catch {
            toast.error('Failed to delete notification')
        }
    }

    const clearAll = async () => {
        try {
            await Promise.all(notifications.map(n => notificationsApi.delete(n.id)))
            setNotifications([])
            toast.success('All notification items cleared')
        } catch {
            toast.error('Failed to clear notifications')
        }
    }

    const toEventCategory = (notificationType: Notification['type']): EventCategory => {
        switch (notificationType) {
            case 'auth_expiring':
                return 'authorization'
            case 'claim_denied':
                return 'billing'
            case 'appointment_reminder':
                return 'appointment'
            case 'missing_note':
                return 'notes'
            default:
                return 'general'
        }
    }

    const getIcon = (category: EventCategory) => {
        switch (category) {
            case 'authorization': return <ClipboardText size={20} weight="duotone" className="icon-warning" />
            case 'billing': return <CurrencyDollar size={20} weight="duotone" className="icon-error" />
            case 'appointment': return <CalendarCheck size={20} weight="duotone" className="icon-primary" />
            case 'notes': return <FileText size={20} weight="duotone" className="icon-warning" />
            case 'activity': return <Clock size={20} weight="duotone" className="icon-primary" />
            case 'general': return <Info size={20} weight="duotone" className="icon-muted" />
        }
    }

    const getPriorityLabel = (priority: Notification['priority']) => {
        switch (priority) {
            case 'urgent':
                return 'Urgent'
            case 'high':
                return 'High'
            case 'medium':
                return 'Medium'
            default:
                return 'Low'
        }
    }

    const shouldShowPriority = (priority: Notification['priority']) => priority !== 'low'

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const days = Math.floor(hours / 24)

        if (hours < 1) return 'Just now'
        if (hours < 24) return `${hours}h ago`
        if (days < 7) return `${days}d ago`
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const events = useMemo<ImportantEvent[]>(() => {
        const notificationEvents: ImportantEvent[] = notifications.map((notification) => ({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            category: toEventCategory(notification.type),
            priority: notification.priority,
            is_read: notification.is_read,
            action_url: notification.action_url,
            created_at: notification.created_at,
            source: 'notification',
        }))

        const summaryEvents: ImportantEvent[] = []
        if (dashboardStats) {
            if (dashboardStats.pending_notes > 0) {
                summaryEvents.push({
                    id: 'summary-pending-notes',
                    title: 'Pending session notes need attention',
                    message: `${dashboardStats.pending_notes} note${dashboardStats.pending_notes === 1 ? '' : 's'} still need to be completed, signed, or co-signed.`,
                    category: 'notes',
                    priority: dashboardStats.pending_notes >= 5 ? 'high' : 'medium',
                    is_read: false,
                    action_url: '/notes',
                    created_at: new Date().toISOString(),
                    source: 'summary',
                })
            }

            if (dashboardStats.billing_overview.claims_denied > 0) {
                summaryEvents.push({
                    id: 'summary-claims-denied',
                    title: 'Denied claims need review',
                    message: `${dashboardStats.billing_overview.claims_denied} denied claim${dashboardStats.billing_overview.claims_denied === 1 ? '' : 's'} need follow-up from billing.`,
                    category: 'billing',
                    priority: 'high',
                    is_read: false,
                    action_url: '/billing?tab=claims',
                    created_at: new Date().toISOString(),
                    source: 'summary',
                })
            }

            if (dashboardStats.billing_overview.invoices_pending > 0) {
                summaryEvents.push({
                    id: 'summary-invoices-pending',
                    title: 'Pending invoices need attention',
                    message: `${dashboardStats.billing_overview.invoices_pending} invoice${dashboardStats.billing_overview.invoices_pending === 1 ? '' : 's'} are still pending payment.`,
                    category: 'billing',
                    priority: 'medium',
                    is_read: false,
                    action_url: '/billing',
                    created_at: new Date().toISOString(),
                    source: 'summary',
                })
            }
        }

        const activityEvents: ImportantEvent[] = (dashboardStats?.recent_activity || []).map((activity) => ({
            id: `activity-${activity.id}`,
            title: `${activity.action} ${activity.target}`,
            message: `${activity.user_name || 'System'} ${activity.action.toLowerCase()} ${activity.target.toLowerCase()}.`,
            category: 'activity',
            priority: 'low',
            is_read: true,
            created_at: activity.timestamp,
            source: 'activity',
        }))

        return [...notificationEvents, ...summaryEvents, ...activityEvents]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [dashboardStats, notifications])

    const unreadCount = notifications.filter(n => !n.is_read).length
    const actionableCount = events.filter(event => event.priority === 'high' || event.priority === 'urgent').length
    const filtered = filterType === 'all'
        ? events
        : filterType === 'unread'
            ? events.filter(event => !event.is_read)
            : events.filter(event => event.category === filterType)

    if (isLoading) {
        return (
            <DashboardLayout>
                <PageSkeleton />
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="page-header important-events-header">
                <div className="page-header-left">
                    <h1 className="page-title">
                        <BellRinging size={28} weight="duotone" />
                        Important Events
                    </h1>
                    <p className="page-subtitle">
                        {events.length} events · {unreadCount} unread notifications
                    </p>
                </div>
                <div className="page-header-actions">
                    <button className="btn-secondary" onClick={markAllAsRead} disabled={unreadCount === 0}>
                        <CheckCircle size={18} weight="bold" />
                        Mark All Read
                    </button>
                    <button className="btn-secondary danger" onClick={clearAll} disabled={notifications.length === 0}>
                        <Trash size={18} weight="bold" />
                        Clear Notifications
                    </button>
                </div>
            </div>

            <div className="important-events-overview">
                <div className="important-events-overview-item">
                    <span className="important-events-overview-value">{actionableCount}</span>
                    <span className="important-events-overview-label">need attention</span>
                </div>
                <div className="important-events-overview-divider"></div>
                <div className="important-events-overview-item">
                    <span className="important-events-overview-value">{(dashboardStats?.recent_activity || []).length}</span>
                    <span className="important-events-overview-label">recent activity items</span>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="notification-filters">
                {[
                    { value: 'all', label: 'All' },
                    { value: 'unread', label: 'Unread' },
                    { value: 'authorization', label: 'Authorization' },
                    { value: 'billing', label: 'Billing' },
                    { value: 'appointment', label: 'Appointment' },
                    { value: 'notes', label: 'Notes' },
                    { value: 'activity', label: 'Activity' },
                    { value: 'general', label: 'General' },
                ].map(tab => (
                    <button
                        key={tab.value}
                        className={`notification-filter-tab ${filterType === tab.value ? 'active' : ''}`}
                        onClick={() => setFilterType(tab.value)}
                    >
                        {tab.label}
                        {tab.value === 'unread' && unreadCount > 0 && (
                            <span className="notification-count">{unreadCount}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Notification list */}
            <div className="notification-list">
                {filtered.length > 0 ? filtered.map(n => (
                    <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''} priority-${n.priority}`}>
                        <div className={`notification-icon category-${n.category}`}>
                            {getIcon(n.category)}
                        </div>
                        <div className="notification-content">
                            <div className="notification-eyebrow">
                                <span className="notification-category">{n.category === 'activity' ? 'Recent Activity' : n.category}</span>
                                <span className="notification-time">{formatTime(n.created_at)}</span>
                            </div>
                            <div className="notification-title-row">
                                <h3 className="notification-title">{n.title}</h3>
                                {shouldShowPriority(n.priority) && (
                                    <span className={`notification-priority priority-${n.priority}`}>
                                        {getPriorityLabel(n.priority)}
                                    </span>
                                )}
                            </div>
                            <p className="notification-message">{n.message}</p>
                            <div className="notification-meta">
                                <span className="notification-source">
                                    {n.source === 'notification' ? 'Notification' : n.source === 'summary' ? 'Summary' : 'Activity'}
                                </span>
                                {n.action_url && (
                                    <button className="notification-link-btn" onClick={() => navigate(n.action_url || '/notifications')}>
                                        Open
                                        <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="notification-actions">
                            {n.source === 'notification' && !n.is_read && (
                                <button className="btn-icon-sm" title="Mark as read" onClick={() => markAsRead(n.id)}>
                                    <Check size={16} />
                                </button>
                            )}
                            {n.source === 'notification' && (
                                <button className="btn-icon-sm danger" title="Delete" onClick={() => deleteNotification(n.id)}>
                                    <Trash size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                )) : (
                    <EmptyState
                        variant="no-data"
                        title="No important events"
                        description={filterType === 'unread' ? 'All notification items are read.' : 'No important events match this filter right now.'}
                    />
                )}
            </div>
        </DashboardLayout>
    )
}
