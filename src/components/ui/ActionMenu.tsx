import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { DotsThree } from '@phosphor-icons/react'

interface ActionMenuItem {
    label: string
    icon?: ReactNode
    onClick: () => void
    variant?: 'default' | 'danger'
}

interface ActionMenuProps {
    items: ActionMenuItem[]
}

export default function ActionMenu({ items }: ActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    return (
        <div className="action-menu" ref={menuRef}>
            <button
                className="btn-icon"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Actions"
            >
                <DotsThree size={20} weight="bold" />
            </button>

            {isOpen && (
                <div className="action-menu-dropdown">
                    {items.map((item, index) => (
                        <button
                            key={index}
                            className={`action-menu-item ${item.variant === 'danger' ? 'danger' : ''}`}
                            onClick={() => {
                                item.onClick()
                                setIsOpen(false)
                            }}
                        >
                            {item.icon && <span className="action-menu-icon">{item.icon}</span>}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
