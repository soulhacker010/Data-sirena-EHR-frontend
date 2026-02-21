import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { authApi } from '../api'
import type { AuthUser, LoginRequest } from '../types'

// FIX ST-1: HIPAA requires auto-logout after 15 minutes of inactivity
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

interface AuthContextType {
    user: AuthUser | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (credentials: LoginRequest) => Promise<void>
    logout: () => Promise<void>
    checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const isAuthenticated = !!user

    const checkAuth = useCallback(async () => {
        const token = localStorage.getItem('sirena_access_token')
        if (!token) {
            setUser(null)
            setIsLoading(false)
            return
        }

        try {
            const userData = await authApi.getMe()
            setUser(userData)
        } catch {
            setUser(null)
            localStorage.removeItem('sirena_access_token')
            localStorage.removeItem('sirena_refresh_token')
            localStorage.removeItem('sirena_auth')
        } finally {
            setIsLoading(false)
        }
    }, [])

    const login = useCallback(async (credentials: LoginRequest) => {
        const response = await authApi.login(credentials)
        setUser(response.user)
    }, [])

    const logout = useCallback(async () => {
        await authApi.logout()
        setUser(null)
    }, [])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    // FIX ST-1: Inactivity auto-logout (HIPAA requirement)
    // Tracks mousemove, keydown, click, scroll, touchstart as "activity".
    // Resets the 15-minute timer on every activity event.
    // Only active when user is authenticated.
    useEffect(() => {
        if (!isAuthenticated) return

        const resetTimer = () => {
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current)
            }
            inactivityTimer.current = setTimeout(() => {
                // Auto-logout on inactivity
                logout()
                window.location.href = '/login'
            }, INACTIVITY_TIMEOUT_MS)
        }

        const activityEvents: (keyof WindowEventMap)[] = [
            'mousemove', 'keydown', 'click', 'scroll', 'touchstart',
        ]

        activityEvents.forEach((event) => window.addEventListener(event, resetTimer))
        resetTimer() // Start the initial timer

        return () => {
            activityEvents.forEach((event) => window.removeEventListener(event, resetTimer))
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current)
            }
        }
    }, [isAuthenticated, logout])

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
