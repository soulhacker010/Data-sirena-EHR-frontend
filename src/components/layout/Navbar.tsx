import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import {
    House,
    Users,
    CalendarBlank,
    Notebook,
    CurrencyDollar,
    MagnifyingGlass,
    Bell,
    Butterfly,
    Gear,
    SignOut,
    UserCircle
} from '@phosphor-icons/react'

interface NavItem {
    id: number
    name: string
    href: string
    icon: React.ElementType
}

const navigation: NavItem[] = [
    { id: 1, name: 'Home', href: '/dashboard', icon: House },
    { id: 2, name: 'Clients', href: '/clients', icon: Users },
    { id: 3, name: 'Calendar', href: '/calendar', icon: CalendarBlank },
    { id: 4, name: 'Notes', href: '/notes', icon: Notebook },
    { id: 5, name: 'Billing', href: '/billing', icon: CurrencyDollar },
]

export default function Navbar() {
    const location = useLocation()
    const navigate = useNavigate()
    const isActive = (path: string) => location.pathname.startsWith(path)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSignOut = () => {
        localStorage.removeItem('sirena_auth')
        setShowUserMenu(false)
        navigate('/login')
    }

    return (
        <nav className="navbar bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50 px-8 h-20 flex items-center justify-between">
            {/* Logo & Search */}
            <div className="flex items-center gap-10">
                <div className="navbar-logo flex items-center gap-3">
                    <Butterfly size={32} weight="duotone" className="text-[var(--color-primary)]" />
                    <span className="font-bold text-xl tracking-tight text-[var(--color-primary-dark)]">SIRENA</span>
                </div>

                <div className="navbar-search hidden lg:flex items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 w-80 focus-within:bg-white focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/10 transition-all">
                    <MagnifyingGlass size={18} weight="bold" className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search clients, notes..."
                        className="bg-transparent border-none outline-none text-sm text-gray-700 ml-3 w-full placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Centered Navigation - Premium Style */}
            <div className="hidden md:flex items-center gap-8">
                {navigation.map((item) => (
                    <NavLink
                        key={item.id}
                        to={item.href}
                        className={`text-sm font-bold tracking-wide relative py-1 transition-colors ${isActive(item.href)
                            ? 'text-[var(--color-primary)]'
                            : 'text-gray-500 hover:text-[var(--color-primary)]'
                            }`}
                    >
                        {item.name}
                        {isActive(item.href) && (
                            <span className="absolute -bottom-7 left-0 w-full h-1 bg-[var(--color-primary)] rounded-t-sm"></span>
                        )}
                    </NavLink>
                ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6">
                {/* Notification Bell - Links to /notifications */}
                <Link to="/notifications" className="text-gray-400 hover:text-[var(--color-primary)] transition-colors relative">
                    <Bell size={24} weight="regular" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </Link>

                {/* User Avatar with Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-cyan)] flex items-center justify-center text-white font-bold text-sm cursor-pointer shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5"
                    >
                        JS
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                        <div className="navbar-dropdown">
                            <div className="navbar-dropdown-header">
                                <p className="navbar-dropdown-name">Dr. John Smith</p>
                                <p className="navbar-dropdown-role">Administrator</p>
                            </div>
                            <div className="navbar-dropdown-divider"></div>
                            <Link to="/settings" className="navbar-dropdown-item" onClick={() => setShowUserMenu(false)}>
                                <UserCircle size={18} />
                                <span>My Profile</span>
                            </Link>
                            <Link to="/settings" className="navbar-dropdown-item" onClick={() => setShowUserMenu(false)}>
                                <Gear size={18} />
                                <span>Settings</span>
                            </Link>
                            <div className="navbar-dropdown-divider"></div>
                            <button className="navbar-dropdown-item danger" onClick={handleSignOut}>
                                <SignOut size={18} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    )
}
