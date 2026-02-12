import Modal from './Modal'
import { Warning } from '@phosphor-icons/react'

interface ConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'warning' | 'default'
    isLoading?: boolean
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    isLoading = false
}: ConfirmDialogProps) {

    const variantClasses = {
        danger: 'btn-danger',
        warning: 'btn-warning',
        default: 'btn-primary'
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="confirm-dialog">
                {variant === 'danger' && (
                    <div className="confirm-icon danger">
                        <Warning size={32} weight="fill" />
                    </div>
                )}

                <p className="confirm-message">{message}</p>

                <div className="confirm-actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={isLoading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={variantClasses[variant]}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
