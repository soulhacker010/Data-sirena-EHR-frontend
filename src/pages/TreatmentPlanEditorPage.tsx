import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
    CaretDown, CaretRight, FloppyDisk, PencilSimple, Copy,
    Plus, Trash, ArrowsClockwise, Link as LinkIcon, PenNib, CheckCircle, FilePdf
} from '@phosphor-icons/react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { InterventionsChecklist } from '../components/clinical'
import SignaturePad from '../components/ui/SignaturePad'
import { treatmentPlansApi } from '../api/treatmentPlans'
import type { TreatmentPlan, TreatmentPlanGoal } from '../api/treatmentPlans'
import { useAuth } from '../context'
import { AddendumThread } from '../components/shared'
import { getApiErrorMessage } from '../utils/errors'
import { printTreatmentPlan } from '../utils/printTreatmentPlan'

// ─── Constants ────────────────────────────────────────────────────────────────
const GOAL_TYPES = [
    'Symptom Reduction',
    'Skill Acquisition',
    'Behavior Reduction',
    'Functional Improvement',
    'Social/Relational',
    'Educational/Vocational',
    'Self-Care/Daily Living',
    'Crisis Prevention',
]

const GOAL_STATUSES: Array<{ value: TreatmentPlanGoal['status']; label: string; color: string }> = [
    { value: 'new', label: 'New', color: '#3b82f6' },
    { value: 'continued', label: 'Continued', color: '#22c55e' },
    { value: 'modified', label: 'Modified', color: '#f59e0b' },
    { value: 'met', label: 'Met', color: '#10b981' },
    { value: 'discontinued', label: 'Discontinued', color: '#ef4444' },
]

const FREQUENCY_OPTIONS = [
    'Weekly', 'Biweekly', 'Monthly', 'Twice weekly',
    '3x weekly', 'As needed', 'Intensive (daily)',
]

const SESSION_DURATION_OPTIONS = ['30 min', '45 min', '60 min', '90 min']

const DEFAULT_MEDICAL_NECESSITY = `The services outlined in this treatment plan are medically necessary to address the client's presenting diagnosis and functional impairments. Without continued treatment, the client's condition is expected to deteriorate.`

function emptyGoal(): TreatmentPlanGoal {
    return {
        id: crypto.randomUUID(),
        problem: '',
        long_term_goal: '',
        objectives: '',
        target_date: '',
        progress: '',
        notes: '',
        goal_type: '',
        status: 'new',
        linked_note_ids: [],
    }
}

export default function TreatmentPlanEditorPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const clientParam = searchParams.get('client')
    const fromIntakeParam = searchParams.get('from_intake')
    const { user } = useAuth()
    const isEditMode = Boolean(id)

    // ─── State ────────────────────────────────────────────────────────────────
    const [plan, setPlan] = useState<TreatmentPlan | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [selectedClientId, setSelectedClientId] = useState(clientParam || '')
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    const [reviewDate, setReviewDate] = useState('')
    const [goals, setGoals] = useState<TreatmentPlanGoal[]>([emptyGoal()])
    const [planData, setPlanData] = useState<Record<string, unknown>>({})
    const [clients, setClients] = useState<Array<{ id: string; full_name: string; date_of_birth?: string }>>([])

    // Section collapse
    const [sections, setSections] = useState<Record<string, boolean>>({
        header: true,
        goals: true,
        interventions: false,
        frequency: false,
        involvement: false,
        special: false,
        strengths: false,
        review: false,
        footer: false,
    })

    const isLocked = plan?.is_locked || false

    const [isSigningProvider, setIsSigningProvider] = useState(false)
    const [isCoSigning, setIsCoSigning] = useState(false)
    const [isSigning, setIsSigning] = useState(false)
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isFirstRender = useRef(true)

    // ─── Review banner logic (4.11) ───────────────────────────────────────────
    const reviewDue = plan?.review_date
        ? new Date(plan.review_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // within 30 days
        : false
    const reviewOverdue = plan?.review_date
        ? new Date(plan.review_date) < new Date()
        : false

    // ─── Load ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadClients = async () => {
            try {
                const { default: apiClient } = await import('../api/client')
                const { data } = await apiClient.get('/clients/', { params: { page_size: 500 } })
                setClients(data.results || [])
            } catch { /* silent */ }
        }
        loadClients()
    }, [])

    useEffect(() => {
        if (!id) return
        const loadPlan = async () => {
            setLoading(true)
            try {
                const data = await treatmentPlansApi.getById(id)
                setPlan(data)
                setSelectedClientId(data.client_id)
                setStartDate(data.start_date)
                setReviewDate(data.review_date || '')
                setGoals(data.goals.length > 0 ? data.goals : [emptyGoal()])
                setPlanData(data.plan_data || {})
            } catch (err: unknown) {
                toast.error(getApiErrorMessage(err, 'Failed to load plan'))
                navigate('/treatment-plans')
            } finally {
                setLoading(false)
            }
        }
        loadPlan()
    }, [id, navigate])

    // Auto-set review date 6 months from start
    useEffect(() => {
        if (!reviewDate && startDate && !isEditMode) {
            const d = new Date(startDate)
            d.setMonth(d.getMonth() + 6)
            setReviewDate(d.toISOString().split('T')[0])
        }
    }, [startDate, reviewDate, isEditMode])

    // E13: Auto-pull diagnoses + strengths from latest signed intake when a NEW
    // plan opens with a client selected (or when the user picks one). Mirrors
    // the existing "Pull Intake Strengths" button so the data Dr. Joe expects
    // ("All info should auto populate (diagnoses etc)") shows up without
    // requiring a manual click. Only fires once per client and never clobbers
    // values the user has already typed.
    const autoPulledClientRef = useRef<string | null>(null)
    useEffect(() => {
        if (isEditMode || !selectedClientId) return
        if (autoPulledClientRef.current === selectedClientId) return
        autoPulledClientRef.current = selectedClientId

        let cancelled = false
        treatmentPlansApi.pullIntakeStrengths(selectedClientId)
            .then(strengths => {
                if (cancelled) return
                setPlanData(prev => {
                    const next = { ...prev }
                    if (!next.primary_diagnosis && strengths.primary_diagnosis) {
                        next.primary_diagnosis = strengths.primary_diagnosis
                    }
                    if (!next.secondary_diagnoses && strengths.secondary_diagnoses) {
                        next.secondary_diagnoses = strengths.secondary_diagnoses
                    }
                    if (!next.client_strengths && strengths.client_strengths) {
                        next.client_strengths = strengths.client_strengths
                    }
                    if (!next.support_systems && strengths.support_systems) {
                        next.support_systems = strengths.support_systems
                    }
                    if (!next.tentative_goals && strengths.tentative_goals) {
                        next.tentative_goals = strengths.tentative_goals
                    }
                    if (!next.frequency && strengths.treatment_frequency) {
                        next.frequency = strengths.treatment_frequency
                    }
                    if (!next.duration && strengths.treatment_duration) {
                        next.duration = strengths.treatment_duration
                    }
                    return next
                })
            })
            .catch(() => {
                // No signed intake for this client yet — silent. Per Dr. Joe's
                // workflow this is fine; he'll fill the plan manually.
            })

        return () => { cancelled = true }
    }, [isEditMode, selectedClientId])

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const updatePlanField = useCallback((key: string, value: unknown) => {
        setPlanData(prev => ({ ...prev, [key]: value }))
    }, [])

    const toggleSection = (key: string) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const updateGoal = (idx: number, field: keyof TreatmentPlanGoal, value: unknown) => {
        setGoals(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g))
    }

    const addGoal = () => setGoals(prev => [...prev, emptyGoal()])

    const removeGoal = (idx: number) => {
        if (goals.length <= 1) {
            toast.error('At least one goal is required')
            return
        }
        setGoals(prev => prev.filter((_, i) => i !== idx))
    }

    // ─── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedClientId) {
            toast.error('Please select a client')
            return
        }
        if (goals.every(g => !g.problem && !g.long_term_goal)) {
            toast.error('At least one goal must have a problem or long-term goal')
            return
        }
        setSaving(true)
        try {
            const payload = {
                client_id: selectedClientId,
                start_date: startDate,
                review_date: reviewDate || undefined,
                goals,
                plan_data: planData,
                from_intake: fromIntakeParam || undefined,
            }
            if (isEditMode && id) {
                const updated = await treatmentPlansApi.update(id, payload)
                setPlan(updated)
                toast.success('Treatment plan saved')
            } else {
                const created = await treatmentPlansApi.create(payload)
                toast.success('Treatment plan created')
                navigate(`/treatment-plans/${created.id}/edit`, { replace: true })
            }
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to save'))
        } finally {
            setSaving(false)
        }
    }

    // ─── Auto-save ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isEditMode || !id || isLocked) return
        if (isFirstRender.current) { isFirstRender.current = false; return }
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
        autoSaveTimer.current = setTimeout(async () => {
            setAutoSaveStatus('saving')
            try {
                const updated = await treatmentPlansApi.update(id, {
                    start_date: startDate,
                    review_date: reviewDate || undefined,
                    goals,
                    plan_data: planData,
                })
                setPlan(updated)
                setAutoSaveStatus('saved')
                setTimeout(() => setAutoSaveStatus('idle'), 2000)
            } catch { setAutoSaveStatus('idle') }
        }, 2000)
        return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
    }, [planData, goals]) // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Copy from Previous (4.2) ─────────────────────────────────────────────
    const handleCopyFromPrevious = async () => {
        if (!selectedClientId) { toast.error('Select a client first'); return }
        try {
            const prev = await treatmentPlansApi.copyFromPrevious(selectedClientId)
            setGoals(prev.goals.length > 0 ? prev.goals : [emptyGoal()])
            setPlanData(prev.plan_data || {})
            toast.success('Copied from previous treatment plan')
        } catch {
            toast.error('No previous signed plan found for this client')
        }
    }

    // ─── Pull Intake Strengths + Diagnosis (4.10, 4.1) ───────────────────────
    const handlePullIntakeStrengths = async () => {
        if (!selectedClientId) { toast.error('Select a client first'); return }
        try {
            const strengths = await treatmentPlansApi.pullIntakeStrengths(selectedClientId)
            updatePlanField('client_strengths', strengths.client_strengths)
            updatePlanField('support_systems', strengths.support_systems)
            updatePlanField('tentative_goals', strengths.tentative_goals)
            if (strengths.treatment_frequency) updatePlanField('frequency', strengths.treatment_frequency)
            if (strengths.treatment_duration) updatePlanField('duration', strengths.treatment_duration)
            if (strengths.primary_diagnosis) updatePlanField('primary_diagnosis', strengths.primary_diagnosis)
            if (strengths.secondary_diagnoses) updatePlanField('secondary_diagnoses', strengths.secondary_diagnoses)
            toast.success('Pulled from intake')
        } catch {
            toast.error('No signed intake found for this client')
        }
    }

    // ─── Section Header ───────────────────────────────────────────────────────
    const SH = ({ sid, title, num }: { sid: string; title: string; num: string }) => (
        <button type="button" className="intake-section-header" onClick={() => toggleSection(sid)}>
            {sections[sid] ? <CaretDown size={18} /> : <CaretRight size={18} />}
            <span className="intake-section-number">{num}</span>
            <span className="intake-section-title">{title}</span>
        </button>
    )

    if (loading) {
        return <DashboardLayout><div className="page-loading">Loading treatment plan...</div></DashboardLayout>
    }

    return (
        <DashboardLayout>
            <div className="intake-editor">
                {/* Top Bar */}
                <div className="intake-editor-topbar">
                    <div>
                        <h1>{isEditMode ? 'Edit' : 'New'} Treatment Plan</h1>
                        {plan && (
                            <>
                                <span className={`status-badge status-${plan.status}`}>{plan.status}</span>
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>v{plan.version}</span>
                            </>
                        )}
                    </div>
                    <div className="intake-editor-actions">
                        {autoSaveStatus === 'saving' && <span className="autosave-indicator saving">Saving…</span>}
                        {autoSaveStatus === 'saved' && <span className="autosave-indicator saved">Saved</span>}
                        {plan && (
                            <button type="button" className="btn-secondary" onClick={() => printTreatmentPlan(plan, user?.organization_name)}>
                                <FilePdf size={16} /> Export PDF
                            </button>
                        )}
                        {!isLocked && (
                            <>
                                <button type="button" className="btn-secondary" onClick={handleCopyFromPrevious}>
                                    <Copy size={16} /> Copy Previous
                                </button>
                                <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                                    <FloppyDisk size={16} /> {saving ? 'Saving...' : 'Save Draft'}
                                </button>
                            </>
                        )}
                        {isLocked && <span className="locked-badge"><PencilSimple size={14} /> Locked</span>}
                    </div>
                </div>

                {isLocked && (
                    <div className="alert-banner alert-info">This plan is signed and locked.</div>
                )}

                {/* 4.11 Review Banner */}
                {reviewDue && !isLocked && (
                    <div className={`alert-banner ${reviewOverdue ? 'alert-error' : 'alert-warning'}`}>
                        <ArrowsClockwise size={18} />
                        {reviewOverdue
                            ? `Review OVERDUE — was due ${plan?.review_date}. Please update goals and re-sign.`
                            : `6-month review coming up (${plan?.review_date}). Review and update goal statuses.`
                        }
                    </div>
                )}

                <div className="intake-editor-form">
                    {/* ─── 4.1 Header ──────────────────────────────────────────── */}
                    <div className="intake-section">
                        <SH sid="header" title="Client & Plan Information" num="1" />
                        {sections.header && (
                            <div className="intake-section-body">
                                <div className="intake-grid-2">
                                    <div className="form-group">
                                        <label>Client *</label>
                                        <select
                                            className="form-select"
                                            value={selectedClientId}
                                            onChange={e => setSelectedClientId(e.target.value)}
                                            disabled={isLocked || isEditMode}
                                        >
                                            <option value="">Select client...</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Provider</label>
                                        <input className="form-input" value={`${user?.first_name || ''} ${user?.last_name || ''}`} disabled />
                                    </div>
                                </div>
                                <div className="intake-grid-2" style={{ marginTop: '0.75rem' }}>
                                    <div className="form-group">
                                        <label>Start Date *</label>
                                        <input type="date" className="form-input" value={startDate}
                                            onChange={e => setStartDate(e.target.value)} disabled={isLocked} />
                                    </div>
                                    <div className="form-group">
                                        <label>6-Month Review Date</label>
                                        <input type="date" className="form-input" value={reviewDate}
                                            onChange={e => setReviewDate(e.target.value)} disabled={isLocked} />
                                    </div>
                                </div>
                                <div className="intake-grid-2" style={{ marginTop: '0.75rem' }}>
                                    <div className="form-group">
                                        <label>Primary Diagnosis</label>
                                        <input type="text" className="form-input"
                                            placeholder="e.g., F41.1 — Generalized anxiety disorder"
                                            value={(planData.primary_diagnosis as string) || ''}
                                            onChange={e => updatePlanField('primary_diagnosis', e.target.value)}
                                            disabled={isLocked} />
                                    </div>
                                    <div className="form-group">
                                        <label>Authorization #</label>
                                        <input type="text" className="form-input"
                                            placeholder="Auth number"
                                            value={(planData.authorization_number as string) || ''}
                                            onChange={e => updatePlanField('authorization_number', e.target.value)}
                                            disabled={isLocked} />
                                    </div>
                                </div>
                                {(planData.secondary_diagnoses as Array<{ code: string; label: string }> | undefined)?.length ? (
                                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                                        <label>Secondary Diagnoses</label>
                                        <div className="dx-tags">
                                            {(planData.secondary_diagnoses as Array<{ code: string; label: string }>).map(d => (
                                                <span key={d.code} className="dx-tag">{d.code}{d.label ? ` — ${d.label}` : ''}</span>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>

                    {/* ─── 4.3-4.5 Goal Grid ───────────────────────────────────── */}
                    <div className="intake-section">
                        <SH sid="goals" title="Treatment Goals" num="2" />
                        {sections.goals && (
                            <div className="intake-section-body">
                                {goals.map((goal, idx) => (
                                    <div key={goal.id} className="tp-goal-card">
                                        <div className="tp-goal-header">
                                            <span className="tp-goal-num">Goal {idx + 1}</span>
                                            <div className="tp-goal-header-actions">
                                                {/* 4.5 Goal Type */}
                                                <select className="form-select-sm"
                                                    value={goal.goal_type}
                                                    onChange={e => updateGoal(idx, 'goal_type', e.target.value)}
                                                    disabled={isLocked}>
                                                    <option value="">Type...</option>
                                                    {GOAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                                {/* 4.12 Review Status */}
                                                <select className="form-select-sm"
                                                    value={goal.status}
                                                    onChange={e => updateGoal(idx, 'status', e.target.value)}
                                                    disabled={isLocked}
                                                    style={{ color: GOAL_STATUSES.find(s => s.value === goal.status)?.color }}>
                                                    {GOAL_STATUSES.map(s => (
                                                        <option key={s.value} value={s.value} style={{ color: s.color }}>{s.label}</option>
                                                    ))}
                                                </select>
                                                {/* 4.4 Delete Goal */}
                                                {!isLocked && (
                                                    <button type="button" className="btn-icon-sm btn-danger" title="Remove goal"
                                                        onClick={() => removeGoal(idx)}>
                                                        <Trash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="intake-grid-2">
                                            <div className="form-group">
                                                <label>Problem Statement</label>
                                                <textarea className="form-textarea" rows={2}
                                                    placeholder="Describe the clinical problem..."
                                                    value={goal.problem} onChange={e => updateGoal(idx, 'problem', e.target.value)}
                                                    disabled={isLocked} />
                                            </div>
                                            <div className="form-group">
                                                <label>Long-Term Goal</label>
                                                <textarea className="form-textarea" rows={2}
                                                    placeholder="What does success look like?"
                                                    value={goal.long_term_goal} onChange={e => updateGoal(idx, 'long_term_goal', e.target.value)}
                                                    disabled={isLocked} />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                            <label>Measurable Objectives</label>
                                            <textarea className="form-textarea" rows={3}
                                                placeholder="1. Client will identify 3 coping strategies...&#10;2. Client will reduce frequency of..."
                                                value={goal.objectives} onChange={e => updateGoal(idx, 'objectives', e.target.value)}
                                                disabled={isLocked} />
                                        </div>
                                        <div className="intake-grid-2" style={{ marginTop: '0.5rem' }}>
                                            <div className="form-group">
                                                <label>Target Date</label>
                                                <input type="date" className="form-input"
                                                    value={goal.target_date} onChange={e => updateGoal(idx, 'target_date', e.target.value)}
                                                    disabled={isLocked} />
                                            </div>
                                            <div className="form-group">
                                                <label>Progress Notes</label>
                                                <input type="text" className="form-input"
                                                    placeholder="Current progress toward goal..."
                                                    value={goal.progress} onChange={e => updateGoal(idx, 'progress', e.target.value)}
                                                    disabled={isLocked} />
                                            </div>
                                        </div>
                                        {/* 4.14 Link to SOAP Notes */}
                                        <div className="tp-goal-links" style={{ marginTop: '0.5rem' }}>
                                            <LinkIcon size={14} />
                                            <span className="intake-helper-text" style={{ margin: 0 }}>
                                                {goal.linked_note_ids.length > 0
                                                    ? `${goal.linked_note_ids.length} linked session note(s)`
                                                    : 'No linked session notes yet'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {/* 4.4 Add Goal */}
                                {!isLocked && (
                                    <button type="button" className="btn-secondary" onClick={addGoal} style={{ marginTop: '0.75rem' }}>
                                        <Plus size={16} /> Add Goal
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ─── 4.6 Interventions / Modalities ──────────────────────── */}
                    <div className="intake-section">
                        <SH sid="interventions" title="Interventions / Modalities" num="3" />
                        {sections.interventions && (
                            <div className="intake-section-body">
                                <InterventionsChecklist
                                    selected={(planData.interventions_checklist as string[]) || []}
                                    onChange={(selected: string[]) => updatePlanField('interventions_checklist', selected)}
                                    disabled={isLocked}
                                />

                                {/* E14: Per-plan narrative under the dropdown to
                                    individualize. Dr. Joe (2026-05-04): "needs
                                    a narrative box under drop down for
                                    interventions to individualize and put
                                    specific interventions so notes are not
                                    perceived as boiler plate." */}
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="form-label">
                                        Individualization Narrative
                                    </label>
                                    <textarea
                                        className="form-textarea"
                                        rows={5}
                                        placeholder="Describe how the selected interventions will be tailored to this specific client — particular techniques, modifications, sequencing, and patient-specific considerations. Plain language, not boilerplate."
                                        value={(planData.interventions_narrative as string) || ''}
                                        onChange={e => updatePlanField('interventions_narrative', e.target.value)}
                                        disabled={isLocked}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── 4.7 Frequency & Duration ────────────────────────────── */}
                    <div className="intake-section">
                        <SH sid="frequency" title="Frequency & Duration of Services" num="4" />
                        {sections.frequency && (
                            <div className="intake-section-body">
                                <div className="intake-grid-2">
                                    <div className="form-group">
                                        <label>Session Frequency</label>
                                        <select className="form-select"
                                            value={(planData.frequency as string) || ''}
                                            onChange={e => updatePlanField('frequency', e.target.value)}
                                            disabled={isLocked}>
                                            <option value="">Select frequency...</option>
                                            {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Session Duration</label>
                                        <select className="form-select"
                                            value={(planData.session_duration as string) || ''}
                                            onChange={e => updatePlanField('session_duration', e.target.value)}
                                            disabled={isLocked}>
                                            <option value="">Select duration...</option>
                                            {SESSION_DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                                    <label>Estimated Treatment Duration</label>
                                    <select className="form-select"
                                        value={(planData.duration as string) || ''}
                                        onChange={e => updatePlanField('duration', e.target.value)}
                                        disabled={isLocked}>
                                        <option value="">Select...</option>
                                        <option value="3 months">3 months</option>
                                        <option value="6 months">6 months</option>
                                        <option value="9 months">9 months</option>
                                        <option value="12 months">12 months</option>
                                        <option value="Ongoing">Ongoing</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── 4.8 Involvement of Others ───────────────────────────── */}
                    <div className="intake-section">
                        <SH sid="involvement" title="Involvement of Others" num="5" />
                        {sections.involvement && (
                            <div className="intake-section-body">
                                {[
                                    { key: 'family_involvement', label: 'Family Involvement', placeholder: 'Family therapy sessions, parent training, collateral contacts...' },
                                    { key: 'school_iep_involvement', label: 'School / IEP Coordination', placeholder: 'IEP meetings, teacher consultations, school counselor coordination...' },
                                    { key: 'other_provider_involvement', label: 'Other Providers', placeholder: 'Psychiatrist, PCP, case manager, probation officer...' },
                                ].map(field => (
                                    <div className="form-group" key={field.key} style={{ marginBottom: '1rem' }}>
                                        <label>{field.label}</label>
                                        <textarea className="form-textarea" rows={2}
                                            placeholder={field.placeholder}
                                            value={(planData[field.key] as string) || ''}
                                            onChange={e => updatePlanField(field.key, e.target.value)}
                                            disabled={isLocked} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ─── 4.9 Special Needs ───────────────────────────────────── */}
                    <div className="intake-section">
                        <SH sid="special" title="Special Needs / Accommodations" num="6" />
                        {sections.special && (
                            <div className="intake-section-body">
                                <textarea className="form-textarea" rows={3}
                                    placeholder="IEP/504 plan, interpreter needs, mobility accommodations, sensory considerations..."
                                    value={(planData.special_needs as string) || ''}
                                    onChange={e => updatePlanField('special_needs', e.target.value)}
                                    disabled={isLocked} />
                            </div>
                        )}
                    </div>

                    {/* ─── 4.10 Strengths & Supports ───────────────────────────── */}
                    <div className="intake-section">
                        <SH sid="strengths" title="Strengths & Supports" num="7" />
                        {sections.strengths && (
                            <div className="intake-section-body">
                                {!isLocked && (
                                    <button type="button" className="btn-secondary" onClick={handlePullIntakeStrengths}
                                        style={{ marginBottom: '0.75rem' }}>
                                        <ArrowsClockwise size={16} /> Pull from Intake
                                    </button>
                                )}
                                <div className="form-group">
                                    <label>Client Strengths</label>
                                    <textarea className="form-textarea" rows={3}
                                        placeholder="Strengths identified during assessment..."
                                        value={(planData.client_strengths as string) || ''}
                                        onChange={e => updatePlanField('client_strengths', e.target.value)}
                                        disabled={isLocked} />
                                </div>
                                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                                    <label>Support Systems</label>
                                    <textarea className="form-textarea" rows={3}
                                        placeholder="Family, community, school, religious supports..."
                                        value={(planData.support_systems as string) || ''}
                                        onChange={e => updatePlanField('support_systems', e.target.value)}
                                        disabled={isLocked} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── 4.13 Footer: Medical Necessity & Signatures ─────────── */}
                    <div className="intake-section">
                        <SH sid="footer" title="Medical Necessity & Signatures" num="8" />
                        {sections.footer && (
                            <div className="intake-section-body">
                                <div className="form-group">
                                    <label>Medical Necessity Statement</label>
                                    <textarea className="form-textarea" rows={4}
                                        value={(planData.medical_necessity as string) || DEFAULT_MEDICAL_NECESSITY}
                                        onChange={e => updatePlanField('medical_necessity', e.target.value)}
                                        disabled={isLocked} />
                                </div>
                                <div className="intake-signature-section" style={{ marginTop: '1.5rem' }}>
                                    <h4>Provider Signature</h4>
                                    {plan?.signed_at ? (
                                        <div className="signature-status signed">
                                            <CheckCircle size={16} weight="fill" /> Signed by {plan.provider_name} on {new Date(plan.signed_at).toLocaleDateString()}
                                        </div>
                                    ) : plan && !isSigningProvider ? (
                                        <button
                                            type="button"
                                            className="btn-secondary btn-sm"
                                            onClick={() => setIsSigningProvider(true)}
                                            disabled={isSigning}
                                        >
                                            <PenNib size={16} /> Sign as Provider
                                        </button>
                                    ) : plan && isSigningProvider ? (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <SignaturePad
                                                onSave={async (sig) => {
                                                    setIsSigning(true)
                                                    try {
                                                        const updated = await treatmentPlansApi.sign(plan.id, sig)
                                                        setPlan(updated)
                                                        setIsSigningProvider(false)
                                                        toast.success('Treatment plan signed')
                                                    } catch (err: unknown) {
                                                        toast.error(getApiErrorMessage(err, 'Failed to sign'))
                                                    } finally {
                                                        setIsSigning(false)
                                                    }
                                                }}
                                                onCancel={() => setIsSigningProvider(false)}
                                            />
                                        </div>
                                    ) : (
                                        <p className="intake-helper-text">Save the plan first to enable signing.</p>
                                    )}

                                    <h4 style={{ marginTop: '1.5rem' }}>Co-Signature (Supervisor)</h4>
                                    {plan?.co_signed_at ? (
                                        <div className="signature-status signed">
                                            <CheckCircle size={16} weight="fill" /> Co-signed by {plan.co_signer_name} on {new Date(plan.co_signed_at).toLocaleDateString()}
                                        </div>
                                    ) : plan?.signed_at && !isCoSigning ? (
                                        <button
                                            type="button"
                                            className="btn-secondary btn-sm"
                                            onClick={() => setIsCoSigning(true)}
                                            disabled={isSigning}
                                        >
                                            <PenNib size={16} /> Co-Sign as Supervisor
                                        </button>
                                    ) : plan?.signed_at && isCoSigning ? (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <SignaturePad
                                                onSave={async (sig) => {
                                                    setIsSigning(true)
                                                    try {
                                                        const updated = await treatmentPlansApi.coSign(plan.id, sig)
                                                        setPlan(updated)
                                                        setIsCoSigning(false)
                                                        toast.success('Co-signature collected')
                                                    } catch (err: unknown) {
                                                        toast.error(getApiErrorMessage(err, 'Failed to co-sign'))
                                                    } finally {
                                                        setIsSigning(false)
                                                    }
                                                }}
                                                onCancel={() => setIsCoSigning(false)}
                                            />
                                        </div>
                                    ) : (
                                        <p className="intake-helper-text">Provider must sign before supervisor co-signature.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* E18: addendum thread on treatment plans — for
                            mid-cycle plan corrections (goal added at supervision,
                            modified frequency, etc.) without breaking the
                            sealed signed version. */}
                        {plan && (
                            <AddendumThread parentKind="treatment-plan" parentId={plan.id} />
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
