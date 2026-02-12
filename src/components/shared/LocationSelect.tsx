import { useState } from 'react'
import { CaretDown, MapPin } from '@phosphor-icons/react'

interface Location {
    id: number
    name: string
    address?: string
    city?: string
    state?: string
    type?: 'clinic' | 'home' | 'telehealth'
}

interface LocationSelectProps {
    value: number | string
    onChange: (locationId: number, location?: Location) => void
    includeAll?: boolean
    allLabel?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    showAddress?: boolean
}

// Mock locations - in real app, this would come from API
const mockLocations: Location[] = [
    { id: 1, name: 'Main Office', address: '123 Healthcare Dr', city: 'Austin', state: 'TX', type: 'clinic' },
    { id: 2, name: 'North Clinic', address: '456 Wellness Ave', city: 'Round Rock', state: 'TX', type: 'clinic' },
    { id: 3, name: 'South Branch', address: '789 Therapy Ln', city: 'San Marcos', state: 'TX', type: 'clinic' },
    { id: 4, name: 'In-Home Services', type: 'home' },
    { id: 5, name: 'Telehealth', type: 'telehealth' },
]

const getLocationIcon = (type?: string) => {
    switch (type) {
        case 'home': return '🏠'
        case 'telehealth': return '💻'
        default: return '🏥'
    }
}

export default function LocationSelect({
    value,
    onChange,
    includeAll = true,
    allLabel = 'All Locations',
    placeholder = 'Select location',
    disabled = false,
    required = false,
    showAddress = false
}: LocationSelectProps) {
    const [isOpen, setIsOpen] = useState(false)

    const selectedLocation = mockLocations.find(l => l.id === Number(value))

    const handleSelect = (location: Location | null) => {
        if (location) {
            onChange(location.id, location)
        } else {
            onChange(0, undefined)
        }
        setIsOpen(false)
    }

    return (
        <div className="location-select-wrapper">
            <div
                className={`location-select-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {selectedLocation ? (
                    <div className="location-select-value">
                        <span className="location-select-icon-emoji">
                            {getLocationIcon(selectedLocation.type)}
                        </span>
                        <div className="location-select-info">
                            <span className="location-select-name">{selectedLocation.name}</span>
                            {showAddress && selectedLocation.address && (
                                <span className="location-select-address">
                                    {selectedLocation.address}, {selectedLocation.city}
                                </span>
                            )}
                        </div>
                    </div>
                ) : value === 0 && includeAll ? (
                    <span className="location-select-placeholder">
                        <MapPin size={16} />
                        {allLabel}
                    </span>
                ) : (
                    <span className="location-select-placeholder">
                        <MapPin size={16} />
                        {placeholder}
                    </span>
                )}
                <CaretDown size={16} className="location-select-caret" />
            </div>

            {isOpen && (
                <div className="location-select-dropdown">
                    {includeAll && (
                        <div
                            className={`location-select-option ${value === 0 ? 'selected' : ''}`}
                            onClick={() => handleSelect(null)}
                        >
                            <MapPin size={16} />
                            <span>{allLabel}</span>
                        </div>
                    )}
                    {mockLocations.map(location => (
                        <div
                            key={location.id}
                            className={`location-select-option ${Number(value) === location.id ? 'selected' : ''}`}
                            onClick={() => handleSelect(location)}
                        >
                            <span className="location-option-icon">
                                {getLocationIcon(location.type)}
                            </span>
                            <div className="location-select-option-info">
                                <span className="location-select-option-name">{location.name}</span>
                                {showAddress && location.address && (
                                    <span className="location-select-option-address">
                                        {location.address}, {location.city}, {location.state}
                                    </span>
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
