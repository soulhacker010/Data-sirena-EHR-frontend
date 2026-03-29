import { useState, useEffect } from 'react'
import { CaretDown, User, SpinnerGap } from '@phosphor-icons/react'
import { lookupsApi } from '../../api'
import type { ProviderOption } from '../../api/lookups'

interface Provider {
    id: string
    name: string
    credentials?: string
}

interface ProviderSelectProps {
    value: string | number
    onChange: (providerId: string, provider?: Provider) => void
    includeAll?: boolean
    allLabel?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    showNPI?: boolean
}

export default function ProviderSelect({
    value,
    onChange,
    includeAll = true,
    allLabel = 'All Providers',
    placeholder = 'Select provider',
    disabled = false,
    required = false,
    showNPI: _showNPI = false
}: ProviderSelectProps) {
    void _showNPI
    const [isOpen, setIsOpen] = useState(false)
    const [providers, setProviders] = useState<ProviderOption[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const fetchProviders = async () => {
            try {
                const data = await lookupsApi.getProviders()
                if (!cancelled) {
                    setProviders(data)
                }
            } catch {
                if (!cancelled) {
                    setProviders([])
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }
        fetchProviders()
        return () => { cancelled = true }
    }, [])

    const selectedProvider = providers.find(p => p.id === String(value))

    const handleSelect = (provider: ProviderOption | null) => {
        if (provider) {
            onChange(provider.id, provider)
        } else {
            onChange('', undefined)
        }
        setIsOpen(false)
    }

    return (
        <div className="provider-select-wrapper">
            <div
                className={`provider-select-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {loading ? (
                    <span className="provider-select-placeholder">
                        <SpinnerGap size={16} className="animate-spin" />
                        Loading providers...
                    </span>
                ) : selectedProvider ? (
                    <div className="provider-select-value">
                        <div className="provider-select-avatar">
                            <User size={16} weight="fill" />
                        </div>
                        <div className="provider-select-info">
                            <span className="provider-select-name">
                                {selectedProvider.name}
                                {selectedProvider.credentials && (
                                    <span className="provider-credentials">, {selectedProvider.credentials}</span>
                                )}
                            </span>
                        </div>
                    </div>
                ) : !value && includeAll ? (
                    <span className="provider-select-placeholder">{allLabel}</span>
                ) : (
                    <span className="provider-select-placeholder">{placeholder}</span>
                )}
                <CaretDown size={16} className="provider-select-icon" />
            </div>

            {isOpen && !loading && (
                <div className="provider-select-dropdown">
                    {includeAll && (
                        <div
                            className={`provider-select-option ${!value ? 'selected' : ''}`}
                            onClick={() => handleSelect(null)}
                        >
                            <span>{allLabel}</span>
                        </div>
                    )}
                    {providers.map(provider => (
                        <div
                            key={provider.id}
                            className={`provider-select-option ${String(value) === provider.id ? 'selected' : ''}`}
                            onClick={() => handleSelect(provider)}
                        >
                            <div className="provider-select-option-avatar">
                                <User size={14} weight="fill" />
                            </div>
                            <div className="provider-select-option-info">
                                <span className="provider-select-option-name">
                                    {provider.name}
                                    {provider.credentials && (
                                        <span className="provider-credentials">, {provider.credentials}</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    ))}
                    {providers.length === 0 && (
                        <div className="provider-select-option" style={{ opacity: 0.5 }}>
                            <User size={14} />
                            <span>No providers found</span>
                        </div>
                    )}
                </div>
            )}

            {/* Hidden input for form validation */}
            {required && (
                <input
                    type="hidden"
                    value={value || ''}
                    required={required}
                />
            )}
        </div>
    )
}
