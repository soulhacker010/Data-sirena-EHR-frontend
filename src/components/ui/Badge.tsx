import type { ReactNode } from 'react'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface BadgeProps {
    children: ReactNode
    variant?: BadgeVariant
    className?: string
}

export default function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
    const variants = {
        success: 'badge-success',
        warning: 'badge-warning',
        error: 'badge-error',
        info: 'badge-info',
        neutral: 'badge-neutral',
    }

    return (
        <span className={`badge ${variants[variant]} ${className}`}>
            {children}
        </span>
    )
}
