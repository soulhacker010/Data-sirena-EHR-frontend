import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Plus, Eye, PencilSimple, Trash, MagnifyingGlass } from '@phosphor-icons/react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { treatmentPlansApi } from '../api/treatmentPlans'
import type { TreatmentPlanListItem, PlanFilters } from '../api/treatmentPlans'
import { getApiErrorMessage } from '../utils/errors'

export default function TreatmentPlanListPage() {
    const navigate = useNavigate()
    const [plans, setPlans] = useState<TreatmentPlanListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [totalCount, setTotalCount] = useState(0)
    const [filters, setFilters] = useState<PlanFilters>({ page: 1 })
    const [search, setSearch] = useState('')

    const loadPlans = useCallback(async () => {
        setLoading(true)
        try {
            const data = await treatmentPlansApi.getAll(filters)
            setPlans(data.results)
            setTotalCount(data.count)
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to load treatment plans'))
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => { loadPlans() }, [loadPlans])

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this draft treatment plan?')) return
        try {
            await treatmentPlansApi.delete(id)
            toast.success('Plan deleted')
            loadPlans()
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to delete'))
        }
    }

    const filtered = search
        ? plans.filter(p =>
            p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
            p.provider_name?.toLowerCase().includes(search.toLowerCase())
        )
        : plans

    const statusLabel = (s: string) => {
        const map: Record<string, string> = {
            draft: 'Draft', active: 'Active', signed: 'Signed',
            co_signed: 'Co-Signed', expired: 'Expired',
        }
        return map[s] || s
    }

    return (
        <DashboardLayout>
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1>Treatment Plans</h1>
                        <p className="page-subtitle">{totalCount} total plans</p>
                    </div>
                    <button className="btn-primary" onClick={() => navigate('/treatment-plans/new')}>
                        <Plus size={16} /> New Plan
                    </button>
                </div>

                <div className="page-toolbar">
                    <div className="search-box">
                        <MagnifyingGlass size={18} />
                        <input type="text" placeholder="Search by client or provider..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="form-select" style={{ width: 'auto' }}
                        value={filters.status || ''}
                        onChange={e => setFilters(prev => ({ ...prev, status: e.target.value || undefined, page: 1 }))}>
                        <option value="">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="signed">Signed</option>
                        <option value="co_signed">Co-Signed</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>

                {loading ? (
                    <div className="page-loading">Loading plans...</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <h3>No treatment plans found</h3>
                        <p>Create a new treatment plan to get started.</p>
                        <button className="btn-primary" onClick={() => navigate('/treatment-plans/new')}>
                            <Plus size={16} /> New Plan
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Client</th>
                                    <th>Provider</th>
                                    <th>Start</th>
                                    <th>Review</th>
                                    <th>Version</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => (
                                    <tr key={p.id}>
                                        <td className="font-medium">{p.client_name}</td>
                                        <td>{p.provider_name}</td>
                                        <td>{p.start_date}</td>
                                        <td>{p.review_date || '—'}</td>
                                        <td>v{p.version}</td>
                                        <td>
                                            <span className={`status-badge status-${p.status}`}>
                                                {statusLabel(p.status)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                {p.is_locked ? (
                                                    <button className="btn-icon-sm" title="View"
                                                        onClick={() => navigate(`/treatment-plans/${p.id}/edit`)}>
                                                        <Eye size={16} />
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button className="btn-icon-sm" title="Edit"
                                                            onClick={() => navigate(`/treatment-plans/${p.id}/edit`)}>
                                                            <PencilSimple size={16} />
                                                        </button>
                                                        {p.status === 'draft' && (
                                                            <button className="btn-icon-sm btn-danger" title="Delete"
                                                                onClick={() => handleDelete(p.id)}>
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
                        <button className="btn-secondary" disabled={!filters.page || filters.page <= 1}
                            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}>Previous</button>
                        <span>Page {filters.page || 1}</span>
                        <button className="btn-secondary" disabled={filtered.length < 10}
                            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}>Next</button>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
