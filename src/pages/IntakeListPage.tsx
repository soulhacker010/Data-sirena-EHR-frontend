import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Plus, Eye, PencilSimple, Trash, MagnifyingGlass } from '@phosphor-icons/react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { intakesApi } from '../api/intakes'
import type { IntakeListItem, IntakeFilters } from '../api/intakes'
import { getApiErrorMessage } from '../utils/errors'

export default function IntakeListPage() {
    const navigate = useNavigate()
    const [intakes, setIntakes] = useState<IntakeListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [filters, setFilters] = useState<IntakeFilters>({ page: 1 })
    const [search, setSearch] = useState('')

    const loadIntakes = useCallback(async () => {
        setLoading(true)
        try {
            const data = await intakesApi.getAll(filters)
            setIntakes(data.results)
            setTotalCount(data.count)
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to load intakes'))
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => {
        loadIntakes()
    }, [loadIntakes])

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this draft intake?')) return
        try {
            await intakesApi.delete(id)
            toast.success('Intake deleted')
            loadIntakes()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to delete'))
        }
    }

    const filteredIntakes = search
        ? intakes.filter(i =>
            i.client_name?.toLowerCase().includes(search.toLowerCase()) ||
            i.provider_name?.toLowerCase().includes(search.toLowerCase())
        )
        : intakes

    const statusLabel = (s: string) => {
        const map: Record<string, string> = {
            draft: 'Draft', completed: 'Completed', signed: 'Signed', co_signed: 'Co-Signed'
        }
        return map[s] || s
    }

    return (
        <DashboardLayout>
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1>Intake Assessments</h1>
                        <p className="page-subtitle">{totalCount} total intakes</p>
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/intakes/new')}>
                        <Plus size={16} /> New Intake
                    </button>
                </div>

                <div className="page-toolbar">
                    <div className="search-box">
                        <MagnifyingGlass size={18} />
                        <input
                            type="text"
                            placeholder="Search by client or provider..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="form-select"
                        value={filters.status || ''}
                        onChange={e => setFilters(prev => ({ ...prev, status: e.target.value || undefined, page: 1 }))}
                        style={{ width: 'auto' }}
                    >
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="signed">Signed</option>
                        <option value="co_signed">Co-Signed</option>
                    </select>
                </div>

                {loading ? (
                    <div className="page-loading">Loading intakes...</div>
                ) : filteredIntakes.length === 0 ? (
                    <div className="empty-state">
                        <h3>No intakes found</h3>
                        <p>Create a new intake assessment to get started.</p>
                        <button className="btn-primary" onClick={() => navigate('/intakes/new')}>
                            <Plus size={16} /> New Intake
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>Provider</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredIntakes.map(intake => (
                                    <tr key={intake.id}>
                                        <td className="font-medium">{intake.client_name}</td>
                                        <td>{intake.provider_name}</td>
                                        <td>{intake.assessment_date}</td>
                                        <td>
                                            <span className={`status-badge status-${intake.status}`}>
                                                {statusLabel(intake.status)}
                                            </span>
                                        </td>
                                        <td>{new Date(intake.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <div className="table-actions">
                                                {intake.is_locked ? (
                                                    <button
                                                        className="btn-icon-sm"
                                                        title="View"
                                                        onClick={() => navigate(`/intakes/${intake.id}/edit`)}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn-icon-sm"
                                                            title="Edit"
                                                            onClick={() => navigate(`/intakes/${intake.id}/edit`)}
                                                        >
                                                            <PencilSimple size={16} />
                                                        </button>
                                                        {intake.status === 'draft' && (
                                                            <button
                                                                className="btn-icon-sm btn-danger"
                                                                title="Delete"
                                                                onClick={() => handleDelete(intake.id)}
                                                            >
                                                                <Trash size={16} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalCount > 10 && (
                    <div className="pagination">
                        <button
                            className="btn-secondary"
                            disabled={!filters.page || filters.page <= 1}
                            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                        >
                            Previous
                        </button>
                        <span>Page {filters.page || 1}</span>
                        <button
                            className="btn-secondary"
                            disabled={filteredIntakes.length < 10}
                            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
