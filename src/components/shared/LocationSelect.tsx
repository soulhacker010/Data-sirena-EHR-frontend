import { useState, useEffect } from 'react'
import { CaretDown, MapPin, SpinnerGap, VideoCamera, Buildings } from '@phosphor-icons/react'
import { lookupsApi } from '../../api'
import type { LocationOption } from '../../api/lookups'

interface Location {
    id: string
    name: string
    address?: string
    city?: string
    state?: string
    is_telehealth?: boolean
}

interface LocationSelectProps {
    value: string | number
    onChange: (locationId: string, location?: Location) => void
    includeAll?: boolean
    allLabel?: string
    placeholder?: string
    disabled?: boolean
    required?: boolean
    showAddress?: boolean
}

/** Icon for a location row — VideoCamera for telehealth, Buildings for a
 *  physical clinic. Returned as a JSX element rather than an emoji because
 *  this is production clinical software (no emojis in the UI). */
const LocationIcon = ({ location, size = 16 }: { location: LocationOption; size?: number }) => (
    location.is_telehealth
        ? <VideoCamera size={size} weight="duotone" />
        : <Buildings size={size} weight="duotone" />
)

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
    const [locations, setLocations] = useState<LocationOption[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        const fetchLocations = async () => {
            try {
                const data = await lookupsApi.getLocations()
                if (!cancelled) {
                    setLocations(data)
                }
            } catch {
                if (!cancelled) {
                    setLocations([])
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }
        fetchLocations()
        return () => { cancelled = true }
    }, [])

    const selectedLocation = locations.find(l => l.id === String(value))

    const handleSelect = (location: LocationOption | null) => {
        if (location) {
            onChange(location.id, location)
        } else {
            onChange('', undefined)
        }
        setIsOpen(false)
    }

    return (
        <div className="location-select-wrapper">
            <div
                className={`location-select-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {loading ? (
                    <span className="location-select-placeholder">
                        <SpinnerGap size={16} className="animate-spin" />
                        Loading locations...
                    </span>
                ) : selectedLocation ? (
                    <div className="location-select-value">
                        <span className="location-select-icon-emoji">
                            <LocationIcon location={selectedLocation} />
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
                ) : !value && includeAll ? (
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

            {isOpen && !loading && (
                <div className="location-select-dropdown">
                    {includeAll && (
                        <div
                            className={`location-select-option ${!value ? 'selected' : ''}`}
                            onClick={() => handleSelect(null)}
                        >
                            <MapPin size={16} />
                            <span>{allLabel}</span>
                        </div>
                    )}
                    {locations.map(location => (
                        <div
                            key={location.id}
                            className={`location-select-option ${String(value) === location.id ? 'selected' : ''}`}
                            onClick={() => handleSelect(location)}
                        >
                            <span className="location-option-icon">
                                <LocationIcon location={location} />
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
                    {locations.length === 0 && (
                        <div className="location-select-option" style={{ opacity: 0.5 }}>
                            <MapPin size={16} />
                            <span>No locations found</span>
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
