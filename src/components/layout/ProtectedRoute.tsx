import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context'
import { LoadingSpinner } from '../ui'
import { DashboardLayout } from './'
import { ShieldWarning, ArrowLeft } from '@phosphor-icons/react'

interface ProtectedRouteProps {
    children: React.ReactNode
    allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, user } = useAuth()
    const navigate = useNavigate()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return (
            <DashboardLayout>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    minHeight: '60vh',
                }}>
                    <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: '#FEF2F2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                    }}>
                        <ShieldWarning size={40} weight="duotone" style={{ color: '#DC2626' }} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                        Access Denied
                    </h1>
                    <p style={{ fontSize: '1rem', color: '#64748B', maxWidth: 420, lineHeight: 1.6, marginBottom: '1.5rem' }}>
                        You don't have permission to view this page. If you believe this is a mistake, contact your administrator.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '0.625rem 1.25rem',
                            borderRadius: 10,
                            background: '#0D9488',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <ArrowLeft size={16} weight="bold" />
                        Back to Dashboard
                    </button>
                </div>
            </DashboardLayout>
        )
    }

    return <>{children}</>
}
