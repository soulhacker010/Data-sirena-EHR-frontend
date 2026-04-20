import { useState, useRef, useEffect, useCallback } from 'react'
import { MagnifyingGlass, X, User, SpinnerGap } from '@phosphor-icons/react'
import { clientsApi } from '../../api'
import { formatDateSafe } from '../../utils/dates'

interface Client {
    id: string
    name: string
    dob?: string
    insurance?: string
}

interface ClientSearchProps {
    onSelect: (client: Client) => void
    selectedClient?: Client | null
    placeholder?: string
    disabled?: boolean
    required?: boolean
}

const formatDate = (iso: string): string => {
    if (!iso) return ''
    return formatDateSafe(iso, { month: '2-digit', day: '2-digit', year: 'numeric' })
}

export default function ClientSearch({
    onSelect,
    selectedClient,
    placeholder = 'Search clients...',
    disabled = false,
    required = false
}: ClientSearchProps) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [results, setResults] = useState<Client[]>([])
    const [loading, setLoading] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(0)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const searchClients = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([])
            setIsOpen(false)
            return
        }

        setLoading(true)
        try {
            const response = await clientsApi.getAll({ search: searchQuery, page_size: 10 })
            const clients = (response.results || []).map(c => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`,
                dob: c.date_of_birth ? formatDate(c.date_of_birth) : undefined,
                insurance: c.insurance_primary_name || undefined,
            }))
            setResults(clients)
            setIsOpen(true)
            setHighlightIndex(0)
        } catch {
            setResults([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        if (query.length >= 2) {
            debounceRef.current = setTimeout(() => {
                searchClients(query)
            }, 300)
        } else {
            setResults([])
            setIsOpen(false)
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [query, searchClients])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (client: Client) => {
        onSelect(client)
        setQuery('')
        setIsOpen(false)
    }

    const handleClear = () => {
        onSelect(null as unknown as Client)
        setQuery('')
        inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIndex(prev => Math.min(prev + 1, results.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter' && results[highlightIndex]) {
            e.preventDefault()
            handleSelect(results[highlightIndex])
        } else if (e.key === 'Escape') {
            setIsOpen(false)
        }
    }

    return (
        <div className="client-search-wrapper" ref={wrapperRef}>
            {selectedClient ? (
                <div className="client-search-selected">
                    <div className="client-search-selected-avatar">
                        {selectedClient.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="client-search-selected-info">
                        <span className="client-search-selected-name">{selectedClient.name}</span>
                        <span className="client-search-selected-details">
                            {selectedClient.dob && <>DOB: {selectedClient.dob}</>}
                            {selectedClient.dob && selectedClient.insurance && ' • '}
                            {selectedClient.insurance}
                        </span>
                    </div>
                    {!disabled && (
                        <button className="client-search-clear" onClick={handleClear} type="button">
                            <X size={16} />
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="client-search-input-wrapper">
                        {loading ? (
                            <SpinnerGap size={18} className="client-search-icon animate-spin" />
                        ) : (
                            <MagnifyingGlass size={18} className="client-search-icon" />
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className="client-search-input"
                            disabled={disabled}
                            required={required}
                        />
                    </div>

                    {isOpen && results.length > 0 && (
                        <div className="client-search-dropdown">
                            {results.map((client, index) => (
                                <div
                                    key={client.id}
                                    className={`client-search-option ${index === highlightIndex ? 'highlighted' : ''}`}
                                    onClick={() => handleSelect(client)}
                                    onMouseEnter={() => setHighlightIndex(index)}
                                >
                                    <div className="client-search-option-avatar">
                                        {client.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="client-search-option-info">
                                        <span className="client-search-option-name">{client.name}</span>
                                        <span className="client-search-option-details">
                                            {client.dob && <>DOB: {client.dob}</>}
                                            {client.dob && client.insurance && ' • '}
                                            {client.insurance}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {isOpen && !loading && query.length >= 2 && results.length === 0 && (
                        <div className="client-search-dropdown">
                            <div className="client-search-no-results">
                                <User size={24} />
                                <span>No clients found</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
