import { useState, useRef, useEffect, useCallback } from 'react'
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context'
import { canAccess } from '../../utils/permissions'
import { clientsApi } from '../../api'
import type { UserRole } from '../../types'
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
    UserCircle,
    SpinnerGap,
    User
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

const roleLabels: Record<UserRole, string> = {
    admin: 'Administrator',
    supervisor: 'Supervisor',
    clinician: 'Clinician',
    biller: 'Biller',
    front_desk: 'Front Desk',
}

interface SearchResult {
    id: string
    name: string
    dob?: string
    insurance?: string
}

export default function Navbar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const role = user?.role || 'clinician'
    const isActive = (path: string) => location.pathname.startsWith(path)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const menuRef = useRef<HTMLDivElement>(null)

    // BUILD 7.2: Global search state
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [showSearchDropdown, setShowSearchDropdown] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(0)
    const searchRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const visibleNav = navigation.filter(item => canAccess(role, item.href))

    const initials = user
        ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
        : '??'
    const displayName = user
        ? `${user.first_name} ${user.last_name}`
        : 'Unknown User'

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false)
            }
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearchDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // BUILD 7.2: Debounced live search
    const searchClients = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([])
            setShowSearchDropdown(false)
            return
        }
        setSearchLoading(true)
        try {
            const response = await clientsApi.getAll({ search: query, page_size: 8 })
            const results = (response.results || []).map(c => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`,
                dob: c.date_of_birth || undefined,
                insurance: c.insurance_primary_name || undefined,
            }))
            setSearchResults(results)
            setShowSearchDropdown(true)
            setHighlightIndex(0)
        } catch {
            setSearchResults([])
        } finally {
            setSearchLoading(false)
        }
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (searchQuery.length >= 2) {
            debounceRef.current = setTimeout(() => searchClients(searchQuery), 300)
        } else {
            setSearchResults([])
            setShowSearchDropdown(false)
        }
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [searchQuery, searchClients])

    // Close search dropdown on navigation
    useEffect(() => {
        setShowSearchDropdown(false)
        setSearchQuery('')
    }, [location.pathname])

    const handleSearchSelect = (client: SearchResult) => {
        setShowSearchDropdown(false)
        setSearchQuery('')
        navigate(`/clients/${client.id}`)
    }

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (!showSearchDropdown || searchResults.length === 0) {
            if (e.key === 'Enter' && searchQuery.trim()) {
                navigate(`/clients?search=${encodeURIComponent(searchQuery.trim())}`)
                setSearchQuery('')
                setShowSearchDropdown(false)
            }
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIndex(prev => Math.min(prev + 1, searchResults.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (searchResults[highlightIndex]) {
                handleSearchSelect(searchResults[highlightIndex])
            }
        } else if (e.key === 'Escape') {
            setShowSearchDropdown(false)
        }
    }

    const formatDob = (iso?: string): string => {
        if (!iso) return ''
        const d = new Date(iso)
        if (isNaN(d.getTime())) return iso
        return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    }

    const handleSignOut = async () => {
        setShowUserMenu(false)
        try {
            await logout()
        } catch {
            // Even if logout API fails, clear local state
        }
        navigate('/login')
    }

    return (
        <nav className="navbar bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50 px-8 h-20 flex items-center justify-between">
            {/* Logo & Search */}
            <div className="flex items-center gap-10">
                <div className="navbar-logo flex items-center gap-3">
                    <Butterfly size={32} weight="duotone" className="text-primary" />
                    <span className="font-bold text-xl tracking-tight text-primary-dark">SIRENA</span>
                </div>

                {/* BUILD 7.2: Global search with live dropdown */}
                <div className="navbar-search hidden lg:flex relative" ref={searchRef}>
                    <div className={`flex items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 w-80 transition-all ${showSearchDropdown ? 'bg-white border-primary ring-2 ring-primary/10 rounded-b-none rounded-t-2xl' : 'focus-within:bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10'}`}>
                        {searchLoading ? (
                            <SpinnerGap size={18} weight="bold" className="text-primary animate-spin" />
                        ) : (
                            <MagnifyingGlass size={18} weight="bold" className="text-gray-400" />
                        )}
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true) }}
                            className="bg-transparent border-none outline-none text-sm text-gray-700 ml-3 w-full placeholder:text-gray-400"
                        />
                    </div>

                    {/* Search results dropdown */}
                    {showSearchDropdown && (
                        <div className="absolute top-full left-0 w-80 bg-white border border-t-0 border-gray-200 rounded-b-2xl shadow-lg z-50 max-h-80 overflow-y-auto">
                            {searchResults.length > 0 ? (
                                searchResults.map((client, index) => (
                                    <div
                                        key={client.id}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${index === highlightIndex ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                                        onClick={() => handleSearchSelect(client)}
                                        onMouseEnter={() => setHighlightIndex(index)}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                            {client.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium text-gray-900 truncate">{client.name}</span>
                                            <span className="text-xs text-gray-500 truncate">
                                                {client.dob && <>DOB: {formatDob(client.dob)}</>}
                                                {client.dob && client.insurance && ' · '}
                                                {client.insurance}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center gap-2 py-6 text-gray-400">
                                    <User size={24} />
                                    <span className="text-sm">No clients found</span>
                                </div>
                            )}
                            {searchResults.length > 0 && (
                                <div
                                    className="px-4 py-2.5 text-xs text-center text-primary font-medium cursor-pointer hover:bg-primary/5 border-t border-gray-100 rounded-b-2xl"
                                    onClick={() => {
                                        navigate(`/clients?search=${encodeURIComponent(searchQuery.trim())}`)
                                        setSearchQuery('')
                                        setShowSearchDropdown(false)
                                    }}
                                >
                                    View all results →
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Centered Navigation - Premium Style — filtered by role */}
            <div className="hidden md:flex items-center gap-8">
                {visibleNav.map((item) => (
                    <NavLink
                        key={item.id}
                        to={item.href}
                        className={`text-sm font-bold tracking-wide relative py-1 transition-colors ${isActive(item.href)
                            ? 'text-primary'
                            : 'text-gray-500 hover:text-primary'
                            }`}
                    >
                        {item.name}
                        {isActive(item.href) && (
                            <span className="absolute -bottom-7 left-0 w-full h-1 bg-primary rounded-t-sm"></span>
                        )}
                    </NavLink>
                ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6">
                {/* Notification Bell - Links to /notifications */}
                <Link to="/notifications" className="text-gray-400 hover:text-primary transition-colors relative">
                    <Bell size={24} weight="regular" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </Link>

                {/* User Avatar with Dropdown — real data from auth context */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-cyan flex items-center justify-center text-white font-bold text-sm cursor-pointer shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5"
                    >
                        {initials}
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                        <div className="navbar-dropdown">
                            <div className="navbar-dropdown-header">
                                <p className="navbar-dropdown-name">{displayName}</p>
                                <p className="navbar-dropdown-role">{roleLabels[role]}</p>
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
