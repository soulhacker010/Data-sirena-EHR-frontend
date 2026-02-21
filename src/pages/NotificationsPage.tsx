import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout'
import { EmptyState, PageSkeleton } from '../components/ui'
import { notificationsApi } from '../api'
import type { Notification } from '../types'
import {
    BellRinging,
    Check,
    CheckCircle,
    Trash,
    Info,
    CalendarCheck,
    CurrencyDollar,
    FileText,
    ClipboardText
} from '@phosphor-icons/react'

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [filterType, setFilterType] = useState<string>('all')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadNotifications()
    }, [])

    const loadNotifications = async () => {
        try {
            setIsLoading(true)
            const data = await notificationsApi.getAll()
            setNotifications(data)
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to load notifications')
        } finally {
            setIsLoading(false)
        }
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
            toast.success('All notifications cleared')
        } catch {
            toast.error('Failed to clear notifications')
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'auth_expiring': return <ClipboardText size={20} weight="duotone" className="icon-warning" />
            case 'claim_denied': return <CurrencyDollar size={20} weight="duotone" className="icon-error" />
            case 'appointment_reminder': return <CalendarCheck size={20} weight="duotone" className="icon-primary" />
            case 'missing_note': return <FileText size={20} weight="duotone" className="icon-warning" />
            case 'general': return <Info size={20} weight="duotone" className="icon-muted" />
            default: return <BellRinging size={20} weight="duotone" className="icon-muted" />
        }
    }

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

    const unreadCount = notifications.filter(n => !n.is_read).length
    const filtered = filterType === 'all'
        ? notifications
        : filterType === 'unread'
            ? notifications.filter(n => !n.is_read)
            : notifications.filter(n => n.type === filterType)

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
                        <BellRinging size={28} weight="duotone" />
                        Notifications
                    </h1>
                    <p className="page-subtitle">
                        {unreadCount} unread · {notifications.length} total
                    </p>
                </div>
                <div className="page-header-actions">
                    <button className="btn-secondary" onClick={markAllAsRead} disabled={unreadCount === 0}>
                        <CheckCircle size={18} weight="bold" />
                        Mark All Read
                    </button>
                    <button className="btn-secondary danger" onClick={clearAll} disabled={notifications.length === 0}>
                        <Trash size={18} weight="bold" />
                        Clear All
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="notification-filters">
                {[
                    { value: 'all', label: 'All' },
                    { value: 'unread', label: 'Unread' },
                    { value: 'auth_expiring', label: 'Authorization' },
                    { value: 'claim_denied', label: 'Billing' },
                    { value: 'appointment_reminder', label: 'Appointment' },
                    { value: 'missing_note', label: 'Notes' },
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
                        <div className="notification-icon">
                            {getIcon(n.type)}
                        </div>
                        <div className="notification-content">
                            <h3 className="notification-title">{n.title}</h3>
                            <p className="notification-message">{n.message}</p>
                            <span className="notification-time">{formatTime(n.created_at)}</span>
                        </div>
                        <div className="notification-actions">
                            {!n.is_read && (
                                <button className="btn-icon-sm" title="Mark as read" onClick={() => markAsRead(n.id)}>
                                    <Check size={16} />
                                </button>
                            )}
                            <button className="btn-icon-sm danger" title="Delete" onClick={() => deleteNotification(n.id)}>
                                <Trash size={16} />
                            </button>
                        </div>
                    </div>
                )) : (
                    <EmptyState
                        variant="no-data"
                        title="No notifications"
                        description={filterType === 'unread' ? 'All caught up!' : 'No notifications to show.'}
                    />
                )}
            </div>
        </DashboardLayout>
    )
}
