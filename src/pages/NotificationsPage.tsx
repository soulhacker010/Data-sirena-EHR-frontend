import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DashboardLayout } from '../components/layout'
import EmptyState from '../components/ui/EmptyState'
import { PageSkeleton } from '../components/ui'
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

interface Notification {
    id: number
    type: 'auth' | 'billing' | 'appointment' | 'note' | 'system'
    title: string
    message: string
    timestamp: string
    isRead: boolean
    priority: 'low' | 'medium' | 'high'
}

const mockNotifications: Notification[] = [
    {
        id: 1,
        type: 'auth',
        title: 'Authorization Near Limit',
        message: 'Sarah Johnson\'s ABA Therapy authorization is at 90% usage (108/120 units)',
        timestamp: '2026-02-09T14:30:00',
        isRead: false,
        priority: 'high'
    },
    {
        id: 2,
        type: 'billing',
        title: 'Claim Denied',
        message: 'Claim #CLM-2024-0089 for Emily Rodriguez was denied. Reason: Invalid modifier',
        timestamp: '2026-02-09T12:15:00',
        isRead: false,
        priority: 'high'
    },
    {
        id: 3,
        type: 'note',
        title: 'Progress Note Overdue',
        message: 'Session note for David Brown (Feb 5) is 4 days overdue',
        timestamp: '2026-02-09T09:00:00',
        isRead: false,
        priority: 'medium'
    },
    {
        id: 4,
        type: 'appointment',
        title: 'Appointment Tomorrow',
        message: 'Reminder: Michael Chen has an appointment tomorrow at 10:00 AM',
        timestamp: '2026-02-08T17:00:00',
        isRead: true,
        priority: 'low'
    },
    {
        id: 5,
        type: 'auth',
        title: 'Authorization Expiring Soon',
        message: 'Sophie Williams\'s authorization expires in 14 days (June 30, 2024)',
        timestamp: '2026-02-08T10:00:00',
        isRead: true,
        priority: 'medium'
    },
    {
        id: 6,
        type: 'system',
        title: 'System Maintenance',
        message: 'Scheduled maintenance on Sunday, Feb 11 from 2:00 AM - 4:00 AM EST',
        timestamp: '2026-02-07T09:00:00',
        isRead: true,
        priority: 'low'
    },
    {
        id: 7,
        type: 'billing',
        title: 'Payment Received',
        message: 'Payment of $250.00 received from Blue Cross for Invoice #INV-2024-0156',
        timestamp: '2026-02-06T15:30:00',
        isRead: true,
        priority: 'low'
    },
]

export default function NotificationsPage() {
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800)
        return () => clearTimeout(timer)
    }, [])

    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
    const [filter, setFilter] = useState<'all' | 'unread' | 'auth' | 'billing' | 'appointment' | 'note'>('all')

    const unreadCount = notifications.filter(n => !n.isRead).length

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return true
        if (filter === 'unread') return !n.isRead
        return n.type === filter
    })

    const markAsRead = (id: number) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, isRead: true } : n
        ))
    }

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        toast.success('All notifications marked as read')
    }

    const deleteNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const clearAll = () => {
        setNotifications([])
        toast.success('All notifications cleared')
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'auth': return <ClipboardText size={20} weight="duotone" />
            case 'billing': return <CurrencyDollar size={20} weight="duotone" />
            case 'appointment': return <CalendarCheck size={20} weight="duotone" />
            case 'note': return <FileText size={20} weight="duotone" />
            default: return <Info size={20} weight="duotone" />
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
        if (days === 1) return 'Yesterday'
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
                        <BellRinging size={28} weight="duotone" className="page-title-icon" />
                        Notifications
                        {unreadCount > 0 && (
                            <span className="notification-badge-large">{unreadCount}</span>
                        )}
                    </h1>
                    <p className="page-subtitle">Stay updated on important events</p>
                </div>
                <div className="header-actions">
                    {unreadCount > 0 && (
                        <button className="btn-secondary" onClick={markAllAsRead}>
                            <Check size={18} weight="bold" />
                            Mark all as read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button className="btn-ghost" onClick={clearAll}>
                            <Trash size={18} weight="regular" />
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="notification-filters">
                <button
                    className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button
                    className={`filter-chip ${filter === 'unread' ? 'active' : ''}`}
                    onClick={() => setFilter('unread')}
                >
                    Unread ({unreadCount})
                </button>
                <button
                    className={`filter-chip ${filter === 'auth' ? 'active' : ''}`}
                    onClick={() => setFilter('auth')}
                >
                    <ClipboardText size={16} />
                    Authorizations
                </button>
                <button
                    className={`filter-chip ${filter === 'billing' ? 'active' : ''}`}
                    onClick={() => setFilter('billing')}
                >
                    <CurrencyDollar size={16} />
                    Billing
                </button>
                <button
                    className={`filter-chip ${filter === 'appointment' ? 'active' : ''}`}
                    onClick={() => setFilter('appointment')}
                >
                    <CalendarCheck size={16} />
                    Appointments
                </button>
                <button
                    className={`filter-chip ${filter === 'note' ? 'active' : ''}`}
                    onClick={() => setFilter('note')}
                >
                    <FileText size={16} />
                    Notes
                </button>
            </div>

            {/* Notification List */}
            <div className="notification-list">
                {filteredNotifications.length === 0 ? (
                    <EmptyState
                        variant={filter !== 'all' ? 'no-results' : 'no-data'}
                        title={filter !== 'all' ? 'No matching notifications' : 'All caught up!'}
                        description={filter !== 'all' ? 'Try a different filter category' : 'You have no notifications. Check back later for updates.'}
                    />
                ) : (
                    filteredNotifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`notification-item ${!notification.isRead ? 'unread' : ''} priority-${notification.priority}`}
                            onClick={() => markAsRead(notification.id)}
                        >
                            <div className={`notification-icon ${notification.type}`}>
                                {getIcon(notification.type)}
                            </div>
                            <div className="notification-content">
                                <div className="notification-header">
                                    <h4>{notification.title}</h4>
                                    <span className="notification-time">{formatTime(notification.timestamp)}</span>
                                </div>
                                <p>{notification.message}</p>
                            </div>
                            <div className="notification-actions">
                                {!notification.isRead && (
                                    <button
                                        className="btn-icon"
                                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                                        title="Mark as read"
                                    >
                                        <CheckCircle size={18} />
                                    </button>
                                )}
                                <button
                                    className="btn-icon"
                                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                    title="Delete"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </DashboardLayout>
    )
}
