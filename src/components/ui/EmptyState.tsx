import type { ReactNode } from 'react'
import {
    MagnifyingGlass,
    FolderOpen,
    WarningCircle
} from '@phosphor-icons/react'

interface EmptyStateProps {
    icon?: ReactNode
    title: string
    description?: string
    actionLabel?: string
    onAction?: () => void
    variant?: 'no-data' | 'no-results' | 'error'
    compact?: boolean
}

export default function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    variant = 'no-data',
    compact = false
}: EmptyStateProps) {

    const defaultIcons = {
        'no-data': <FolderOpen size={compact ? 40 : 56} weight="duotone" />,
        'no-results': <MagnifyingGlass size={compact ? 40 : 56} weight="duotone" />,
        'error': <WarningCircle size={compact ? 40 : 56} weight="duotone" />
    }

    return (
        <div className={`empty-state ${compact ? 'empty-state-compact' : ''} empty-state-${variant}`}>
            <div className="empty-state-icon">
                {icon || defaultIcons[variant]}
            </div>
            <h3 className="empty-state-title">{title}</h3>
            {description && (
                <p className="empty-state-description">{description}</p>
            )}
            {actionLabel && onAction && (
                <button className="btn-primary empty-state-action" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    )
}
