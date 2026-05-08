import { useState, useRef, useEffect, useCallback } from 'react'
import { MagnifyingGlass, X, Buildings, SpinnerGap } from '@phosphor-icons/react'
import { billingApi } from '../../api'
import type { Payer } from '../../types'

interface PayerSearchProps {
    onSelect: (payer: Payer | null) => void
    selectedPayer?: Payer | null
    placeholder?: string
    disabled?: boolean
    required?: boolean
    // Restrict to payers that support 837P (the professional claim file format)
    onlyElectronic?: boolean
}

export default function PayerSearch({
    onSelect,
    selectedPayer,
    placeholder = 'Search payer name or ID...',
    disabled = false,
    required = false,
    onlyElectronic = true,
}: PayerSearchProps) {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [results, setResults] = useState<Payer[]>([])
    const [loading, setLoading] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(0)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const searchPayers = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([])
            setIsOpen(false)
            return
        }

        setLoading(true)
        try {
            const payers = await billingApi.searchPayers({
                search: searchQuery,
                supports_837p: onlyElectronic || undefined,
                limit: 10,
            })
            setResults(payers)
            setIsOpen(true)
            setHighlightIndex(0)
        } catch {
            setResults([])
        } finally {
            setLoading(false)
        }
    }, [onlyElectronic])

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        if (query.length >= 2) {
            debounceRef.current = setTimeout(() => {
                searchPayers(query)
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
    }, [query, searchPayers])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (payer: Payer) => {
        onSelect(payer)
        setQuery('')
        setIsOpen(false)
    }

    const handleClear = () => {
        onSelect(null)
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
        <div className="payer-search-wrapper" ref={wrapperRef}>
            {selectedPayer ? (
                <div className="payer-search-selected">
                    <div className="payer-search-selected-icon">
                        <Buildings size={18} weight="duotone" />
                    </div>
                    <div className="payer-search-selected-info">
                        <span className="payer-search-selected-name">{selectedPayer.name}</span>
                        <span className="payer-search-selected-details">
                            ID: {selectedPayer.payer_id}
                            {selectedPayer.supports_era && ' • ERA'}
                            {selectedPayer.enrollment_required && ' • Enrollment required'}
                        </span>
                    </div>
                    {!disabled && (
                        <button className="payer-search-clear" onClick={handleClear} type="button">
                            <X size={16} />
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="payer-search-input-wrapper">
                        {loading ? (
                            <SpinnerGap size={18} className="payer-search-icon animate-spin" />
                        ) : (
                            <MagnifyingGlass size={18} className="payer-search-icon" />
                        )}
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            className="payer-search-input"
                            disabled={disabled}
                            required={required}
                        />
                    </div>

                    {isOpen && results.length > 0 && (
                        <div className="payer-search-dropdown">
                            {results.map((payer, index) => (
                                <div
                                    key={payer.id}
                                    className={`payer-search-option ${index === highlightIndex ? 'highlighted' : ''}`}
                                    onClick={() => handleSelect(payer)}
                                    onMouseEnter={() => setHighlightIndex(index)}
                                >
                                    <div className="payer-search-option-icon">
                                        <Buildings size={16} />
                                    </div>
                                    <div className="payer-search-option-info">
                                        <span className="payer-search-option-name">{payer.name}</span>
                                        <span className="payer-search-option-details">
                                            ID: {payer.payer_id}
                                            {payer.supports_era && ' • ERA'}
                                            {payer.enrollment_required && ' • Enrollment required'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {isOpen && !loading && query.length >= 2 && results.length === 0 && (
                        <div className="payer-search-dropdown">
                            <div className="payer-search-no-results">
                                <Buildings size={24} />
                                <span>No payers found</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
