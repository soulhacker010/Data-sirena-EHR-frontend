import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { MagnifyingGlass, SpinnerGap, User } from '@phosphor-icons/react'
import { clientsApi } from '../../api'
import { formatDateSafe } from '../../utils/dates'

interface DashboardLayoutProps {
    children: ReactNode
    title?: string
}

interface SearchResult {
    id: string
    name: string
    dob?: string
    insurance?: string
}

const formatDob = (iso?: string) =>
    iso ? formatDateSafe(iso, { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''

export default function DashboardLayout({ children, title: _title = 'Dashboard' }: DashboardLayoutProps) {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [highlight, setHighlight] = useState(0)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const search = useCallback(async (q: string) => {
        if (q.length < 2) { setResults([]); setOpen(false); return }
        setLoading(true)
        try {
            const res = await clientsApi.getAll({ search: q, page_size: 8 })
            const items = (res.results || []).map(c => ({
                id: c.id,
                name: `${c.first_name} ${c.last_name}`,
                dob: c.date_of_birth || undefined,
                insurance: c.insurance_primary_name || undefined,
            }))
            setResults(items)
            setOpen(true)
            setHighlight(0)
        } catch {
            setResults([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (query.length >= 2) {
            debounceRef.current = setTimeout(() => search(query), 300)
        } else {
            setResults([])
            setOpen(false)
        }
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query, search])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleSelect = (client: SearchResult) => {
        setOpen(false)
        setQuery('')
        navigate(`/clients/${client.id}`)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open || results.length === 0) {
            if (e.key === 'Enter' && query.trim()) {
                navigate(`/clients?search=${encodeURIComponent(query.trim())}`)
                setQuery('')
                setOpen(false)
            }
            return
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(p => Math.min(p + 1, results.length - 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(p => Math.max(p - 1, 0)) }
        else if (e.key === 'Enter') { e.preventDefault(); if (results[highlight]) handleSelect(results[highlight]) }
        else if (e.key === 'Escape') setOpen(false)
    }

    return (
        <div className="app-layout">
            <Sidebar />

            <div className="app-main">
                <header className="app-header">
                    <div className="header-search" role="search" ref={wrapperRef} style={{ position: 'relative' }}>
                        {loading
                            ? <SpinnerGap size={18} weight="bold" className="text-primary animate-spin" aria-hidden="true" />
                            : <MagnifyingGlass size={18} weight="regular" className="text-gray-400" aria-hidden="true" />
                        }
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => { if (results.length > 0) setOpen(true) }}
                            aria-label="Search clients"
                            aria-autocomplete="list"
                            aria-expanded={open}
                        />

                        {open && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: 4,
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: 12,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                                zIndex: 200,
                                overflow: 'hidden',
                            }}>
                                {results.length > 0 ? (
                                    <>
                                        {results.map((client, i) => (
                                            <div
                                                key={client.id}
                                                onClick={() => handleSelect(client)}
                                                onMouseEnter={() => setHighlight(i)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    padding: '10px 16px',
                                                    cursor: 'pointer',
                                                    background: i === highlight ? 'rgba(13,148,136,0.06)' : 'transparent',
                                                    transition: 'background 0.15s',
                                                }}
                                            >
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: '50%',
                                                    background: 'rgba(13,148,136,0.1)',
                                                    color: '#0d9488',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                                                }}>
                                                    {client.name.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {client.name}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                                        {client.dob && <>DOB: {formatDob(client.dob)}</>}
                                                        {client.dob && client.insurance && ' · '}
                                                        {client.insurance}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        <div
                                            onClick={() => { navigate(`/clients?search=${encodeURIComponent(query.trim())}`); setQuery(''); setOpen(false) }}
                                            style={{
                                                padding: '9px 16px',
                                                textAlign: 'center',
                                                fontSize: 12,
                                                color: '#0d9488',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                borderTop: '1px solid #f1f5f9',
                                            }}
                                        >
                                            View all results →
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '20px 16px', color: '#94a3b8' }}>
                                        <User size={22} />
                                        <span style={{ fontSize: 13 }}>No clients found</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                <main className="app-content">
                    {children}
                </main>
            </div>
        </div>
    )
}
