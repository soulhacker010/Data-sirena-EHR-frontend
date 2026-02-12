import { NavLink, useLocation, useNavigate } from 'react-router-dom'
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
    Butterfly,
    UsersThree,
    ClockCounterClockwise
} from '@phosphor-icons/react'

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
    { id: 7, name: 'Notifications', href: '/notifications', icon: Bell, badge: 3 },
    { id: 8, name: 'Settings', href: '/settings', icon: Gear },
]

const adminMenu: NavItem[] = [
    { id: 9, name: 'User Management', href: '/admin/users', icon: UsersThree },
    { id: 10, name: 'Audit Log', href: '/admin/audit', icon: ClockCounterClockwise },
]

export default function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <Butterfly size={28} weight="duotone" className="text-teal-500" />
                <span className="sidebar-logo-text">Sirena Health</span>
            </div>

            {/* Main Menu */}
            <div className="sidebar-section">
                <p className="sidebar-section-label">Main Menu</p>
                <nav className="sidebar-nav">
                    {mainMenu.map((item) => (
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

            {/* Admin Menu */}
            <div className="sidebar-section">
                <p className="sidebar-section-label">Administration</p>
                <nav className="sidebar-nav">
                    {adminMenu.map((item) => (
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

            {/* Other Menu */}
            <div className="sidebar-section">
                <p className="sidebar-section-label">Other</p>
                <nav className="sidebar-nav">
                    {otherMenu.map((item) => (
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

            {/* User Profile */}
            <div className="sidebar-user">
                <div className="sidebar-user-avatar">JS</div>
                <div className="sidebar-user-info">
                    <p className="sidebar-user-name">Dr. John Smith</p>
                    <p className="sidebar-user-role">Administrator</p>
                </div>
                <button className="sidebar-user-menu" title="Sign out" onClick={() => {
                    localStorage.removeItem('sirena_auth')
                    navigate('/login')
                }}>
                    <SignOut size={18} weight="regular" />
                </button>
            </div>
        </aside>
    )
}

