import { useState, useRef, useEffect } from 'react'
import { MagnifyingGlass, X, User } from '@phosphor-icons/react'

interface Client {
    id: number
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

// Mock clients - in real app, this would come from API
const mockClients: Client[] = [
    { id: 1, name: 'Sarah Johnson', dob: '03/15/1995', insurance: 'Blue Cross' },
    { id: 2, name: 'Michael Chen', dob: '08/22/2010', insurance: 'Aetna' },
    { id: 3, name: 'Emily Davis', dob: '12/03/2008', insurance: 'United' },
    { id: 4, name: 'James Wilson', dob: '05/18/2012', insurance: 'Cigna' },
    { id: 5, name: 'Lisa Thompson', dob: '01/30/2015', insurance: 'Medicaid' },
    { id: 6, name: 'David Brown', dob: '07/11/2009', insurance: 'Blue Cross' },
    { id: 7, name: 'Maria Garcia', dob: '09/25/2011', insurance: 'Aetna' },
    { id: 8, name: 'Robert Martinez', dob: '04/08/2007', insurance: 'United' },
]

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
    const [highlightIndex, setHighlightIndex] = useState(0)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Filter clients based on query
    useEffect(() => {
        if (query.length > 0) {
            const filtered = mockClients.filter(c =>
                c.name.toLowerCase().includes(query.toLowerCase()) ||
                c.dob?.includes(query)
            )
            setResults(filtered)
            setIsOpen(true)
            setHighlightIndex(0)
        } else {
            setResults([])
            setIsOpen(false)
        }
    }, [query])

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
                            DOB: {selectedClient.dob} • {selectedClient.insurance}
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
                        <MagnifyingGlass size={18} className="client-search-icon" />
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
                                            DOB: {client.dob} • {client.insurance}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {isOpen && query.length > 0 && results.length === 0 && (
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
