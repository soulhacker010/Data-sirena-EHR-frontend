import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context'
import { canAccess } from '../../utils/permissions'
import {
    House,
    Users,
    CalendarBlank,
    Notebook,
    CurrencyDollar,
    ChartBar,
    Bell,
    Gear,
    SignOut,
    UsersThree,
    ClockCounterClockwise
} from '@phosphor-icons/react'
import type { UserRole } from '../../types'

interface NavItem {
    id: number
    name: string
    href: string
    icon: React.ElementType
    badge?: number
}

const mainMenu: NavItem[] = [
    { id: 1, name: 'Dashboard', href: '/dashboard', icon: House },
    { id: 2, name: 'Clients', href: '/clients', icon: Users },
    { id: 3, name: 'Calendar', href: '/calendar', icon: CalendarBlank },
    { id: 4, name: 'Session Notes', href: '/notes', icon: Notebook },
    { id: 5, name: 'Billing', href: '/billing', icon: CurrencyDollar },
    { id: 6, name: 'Reports', href: '/reports', icon: ChartBar },
]

const otherMenu: NavItem[] = [
    { id: 7, name: 'Notifications', href: '/notifications', icon: Bell },
    { id: 8, name: 'Settings', href: '/settings', icon: Gear },
]

const adminMenu: NavItem[] = [
    { id: 9, name: 'User Management', href: '/admin/users', icon: UsersThree },
    { id: 10, name: 'Audit Log', href: '/admin/audit', icon: ClockCounterClockwise },
]

const roleLabels: Record<UserRole, string> = {
    admin: 'Administrator',
    supervisor: 'Supervisor',
    clinician: 'Clinician',
    biller: 'Biller',
    front_desk: 'Front Desk',
}

export default function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const role = user?.role || 'clinician'

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

    // Filter nav items by the current user's role
    const visibleMain = mainMenu.filter(item => canAccess(role, item.href))
    const visibleOther = otherMenu.filter(item => canAccess(role, item.href))
    const visibleAdmin = adminMenu.filter(item => canAccess(role, item.href))

    // User initials & display name from auth context
    const initials = user
        ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
        : '??'
    const displayName = user
        ? `${user.first_name} ${user.last_name}`
        : 'Unknown User'

    const handleSignOut = async () => {
        try {
            await logout()
        } catch {
            // Even if logout API fails, clear local state
        }
        navigate('/login')
    }

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <img src="/images/EHRlogo.png" alt="Sirena Health" className="sidebar-logo-img" />
            </div>

            {/* Main Menu */}
            <div className="sidebar-section">
                <p className="sidebar-section-label">Main Menu</p>
                <nav className="sidebar-nav">
                    {visibleMain.map((item) => (
                        <NavLink
                            key={item.id}
                            to={item.href}
                            className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
                        >
                            <item.icon size={20} weight={isActive(item.href) ? 'fill' : 'regular'} />
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Admin Menu — only shown if user has access to any admin items */}
            {visibleAdmin.length > 0 && (
                <div className="sidebar-section">
                    <p className="sidebar-section-label">Administration</p>
                    <nav className="sidebar-nav">
                        {visibleAdmin.map((item) => (
                            <NavLink
                                key={item.id}
                                to={item.href}
                                className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
                            >
                                <item.icon size={20} weight={isActive(item.href) ? 'fill' : 'regular'} />
                                <span>{item.name}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>
            )}

            {/* Other Menu */}
            <div className="sidebar-section">
                <p className="sidebar-section-label">Other</p>
                <nav className="sidebar-nav">
                    {visibleOther.map((item) => (
                        <NavLink
                            key={item.id}
                            to={item.href}
                            className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
                        >
                            <item.icon size={20} weight={isActive(item.href) ? 'fill' : 'regular'} />
                            <span>{item.name}</span>
                            {item.badge && (
                                <span className="sidebar-badge">{item.badge}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* User Profile — real data from auth context */}
            <div className="sidebar-user">
                <div className="sidebar-user-avatar">{initials}</div>
                <div className="sidebar-user-info">
                    <p className="sidebar-user-name">{displayName}</p>
                    <p className="sidebar-user-role">{roleLabels[role]}</p>
                </div>
                <button className="sidebar-user-menu" title="Sign out" onClick={handleSignOut}>
                    <SignOut size={18} weight="regular" />
                </button>
            </div>
        </aside>
    )
}
