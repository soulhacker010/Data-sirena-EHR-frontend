import { useState } from 'react'
import { CaretDown, User } from '@phosphor-icons/react'

interface Provider {
    id: number
    name: string
    credentials?: string
    npi?: string
    specialty?: string
}

interface ProviderSelectProps {
    value: number | string
    onChange: (providerId: number, provider?: Provider) => void
    includeAll?: boolean
    allLabel?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    showNPI?: boolean
}

// Mock providers - in real app, this would come from API
const mockProviders: Provider[] = [
    { id: 1, name: 'Dr. Amanda Wilson', credentials: 'BCBA-D', npi: '1234567890', specialty: 'Behavior Analysis' },
    { id: 2, name: 'Jessica Martinez', credentials: 'BCBA', npi: '2345678901', specialty: 'Autism Services' },
    { id: 3, name: 'Dr. Robert Kim', credentials: 'BCBA-D', npi: '3456789012', specialty: 'Early Intervention' },
    { id: 4, name: 'Maria Santos', credentials: 'RBT', npi: '4567890123', specialty: 'Direct Therapy' },
    { id: 5, name: 'Dr. Sarah Mitchell', credentials: 'BCBA-D', npi: '5678901234', specialty: 'Program Development' },
]

export default function ProviderSelect({
    value,
    onChange,
    includeAll = true,
    allLabel = 'All Providers',
    placeholder = 'Select provider',
    disabled = false,
    required = false,
    showNPI = false
}: ProviderSelectProps) {
    const [isOpen, setIsOpen] = useState(false)

    const selectedProvider = mockProviders.find(p => p.id === Number(value))

    const handleSelect = (provider: Provider | null) => {
        if (provider) {
            onChange(provider.id, provider)
        } else {
            onChange(0, undefined)
        }
        setIsOpen(false)
    }

    return (
        <div className="provider-select-wrapper">
            <div
                className={`provider-select-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {selectedProvider ? (
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
                            {showNPI && selectedProvider.npi && (
                                <span className="provider-select-npi">NPI: {selectedProvider.npi}</span>
                            )}
                        </div>
                    </div>
                ) : value === 0 && includeAll ? (
                    <span className="provider-select-placeholder">{allLabel}</span>
                ) : (
                    <span className="provider-select-placeholder">{placeholder}</span>
                )}
                <CaretDown size={16} className="provider-select-icon" />
            </div>

            {isOpen && (
                <div className="provider-select-dropdown">
                    {includeAll && (
                        <div
                            className={`provider-select-option ${value === 0 ? 'selected' : ''}`}
                            onClick={() => handleSelect(null)}
                        >
                            <span>{allLabel}</span>
                        </div>
                    )}
                    {mockProviders.map(provider => (
                        <div
                            key={provider.id}
                            className={`provider-select-option ${Number(value) === provider.id ? 'selected' : ''}`}
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
                                {showNPI && provider.npi && (
                                    <span className="provider-select-option-npi">NPI: {provider.npi}</span>
                                )}
                            </div>
                        </div>
                    ))}
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
