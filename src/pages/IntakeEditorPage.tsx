import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { CaretDown, CaretRight, FloppyDisk, PencilSimple, Copy, PenNib, CheckCircle, Eye, FilePdf } from '@phosphor-icons/react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { MentalStatusExam, RiskAssessment } from '../components/clinical'
import SignaturePad from '../components/ui/SignaturePad'
import { intakesApi } from '../api/intakes'
import type { IntakeAssessment } from '../api/intakes'
import { AddendumThread } from '../components/shared'
import { useAuth } from '../context'
import { getApiErrorMessage } from '../utils/errors'
import { printIntake } from '../utils/printIntake'

// ─── ICD-10 Common Codes (searchable subset) ─────────────────────────────────
const ICD10_CODES = [
    { code: 'F32.1', label: 'Major depressive disorder, single episode, moderate' },
    { code: 'F32.2', label: 'Major depressive disorder, single episode, severe' },
    { code: 'F33.1', label: 'Major depressive disorder, recurrent, moderate' },
    { code: 'F33.2', label: 'Major depressive disorder, recurrent, severe' },
    { code: 'F41.0', label: 'Panic disorder' },
    { code: 'F41.1', label: 'Generalized anxiety disorder' },
    { code: 'F43.10', label: 'Post-traumatic stress disorder, unspecified' },
    { code: 'F43.12', label: 'Post-traumatic stress disorder, chronic' },
    { code: 'F43.20', label: 'Adjustment disorder, unspecified' },
    { code: 'F43.21', label: 'Adjustment disorder with depressed mood' },
    { code: 'F43.22', label: 'Adjustment disorder with anxiety' },
    { code: 'F43.23', label: 'Adjustment disorder with mixed anxiety and depressed mood' },
    { code: 'F84.0', label: 'Autistic disorder' },
    { code: 'F90.0', label: 'ADHD, predominantly inattentive type' },
    { code: 'F90.1', label: 'ADHD, predominantly hyperactive type' },
    { code: 'F90.2', label: 'ADHD, combined type' },
    { code: 'F31.9', label: 'Bipolar disorder, unspecified' },
    { code: 'F20.9', label: 'Schizophrenia, unspecified' },
    { code: 'F60.3', label: 'Borderline personality disorder' },
    { code: 'F50.0', label: 'Anorexia nervosa' },
    { code: 'F50.2', label: 'Bulimia nervosa' },
    { code: 'F10.20', label: 'Alcohol dependence, uncomplicated' },
    { code: 'F11.20', label: 'Opioid dependence, uncomplicated' },
    { code: 'F12.20', label: 'Cannabis dependence, uncomplicated' },
    { code: 'F42.2', label: 'OCD, mixed obsessional thoughts and acts' },
    { code: 'F93.0', label: 'Separation anxiety disorder of childhood' },
    { code: 'F94.0', label: 'Selective mutism' },
    { code: 'F40.10', label: 'Social anxiety disorder' },
]

// ─── Constants ────────────────────────────────────────────────────────────────
const RISK_FACTOR_OPTIONS = [
    'Suicidal ideation', 'Homicidal ideation', 'Self-harm behaviors',
    'History of suicide attempts', 'History of violence/aggression',
    'Substance abuse/dependence', 'Access to weapons/firearms',
    'Recent significant loss', 'Chronic pain', 'Social isolation',
    'History of trauma/abuse', 'Command hallucinations',
    'Impulsivity', 'Non-compliance with treatment',
    'Unstable housing', 'Legal problems',
]

const TREATMENT_FREQUENCY_OPTIONS = [
    'Weekly', 'Biweekly', 'Monthly', 'Twice weekly',
    '3x weekly', 'As needed', 'Intensive (daily)',
]

const DEFAULT_MEDICAL_NECESSITY = `I certify that the services provided are medically necessary and consistent with the patient's diagnosis and treatment plan. Services are required to address the presenting clinical condition and prevent deterioration of the patient's mental health functioning.`

export default function IntakeEditorPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const isEditMode = Boolean(id)

    // ─── State ────────────────────────────────────────────────────────────────
    const [intake, setIntake] = useState<IntakeAssessment | null>(null)
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [selectedClientId, setSelectedClientId] = useState('')
    const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0])

    // Intake data fields (stored in intake_data JSONB)
    const [intakeData, setIntakeData] = useState<Record<string, unknown>>({})

    // Section collapse toggles
    const [sections, setSections] = useState<Record<string, boolean>>({
        header: true,
        presenting: true,
        diagnosis: true,
        history: true,
        mse: false,
        family: false,
        risk: false,
        safety: false,
        strengths: false,
        treatment: false,
        special: false,
        footer: false,
    })

    // ICD-10 search
    const [icdSearch, setIcdSearch] = useState('')
    const [showIcdDropdown, setShowIcdDropdown] = useState(false)

    // Clients list for selector
    const [clients, setClients] = useState<Array<{ id: string; full_name: string; date_of_birth?: string; mrn?: string }>>([])

    // Organization NPIs (auto-populated from backend)
    const [orgNpis, setOrgNpis] = useState<Array<{ id: string; npi_number: string; business_name: string }>>([])

    const isLocked = intake?.is_locked || false

    const [isSigningProvider, setIsSigningProvider] = useState(false)
    const [isSigningClient, setIsSigningClient] = useState(false)
    const [isSigning, setIsSigning] = useState(false)
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const [showPreview, setShowPreview] = useState(false)
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isFirstRender = useRef(true)

    // ─── Load Data ────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const { default: apiClient } = await import('../api/client')
                const [clientsRes, npiRes] = await Promise.all([
                    apiClient.get('/clients/', { params: { page_size: 500 } }),
                    apiClient.get('/auth/npis/'),
                ])
                setClients(clientsRes.data.results || [])
                const npis = npiRes.data || []
                setOrgNpis(npis)
                // E4 + E5: Auto-populate the rendering provider NPI when not
                // already set. Priority order:
                //   1) the current user's individual (Type 1) NPI — most
                //      accurate; this is the clinician filling out the intake
                //   2) the org's first NPI — fallback for solo practices
                //      where each provider hasn't been assigned an NPI yet
                if (!intakeData.provider_npi) {
                    const userNpi = (user as { npi?: string } | null | undefined)?.npi
                    if (userNpi) {
                        updateField('provider_npi', userNpi)
                    } else if (npis.length > 0) {
                        updateField('provider_npi', npis[0].npi_number)
                    }
                }
            } catch {
                // silent fail
            }
        }
        loadInitialData()
    }, [])

    useEffect(() => {
        if (!id) return
        const loadIntake = async () => {
            setLoading(true)
            try {
                const data = await intakesApi.getById(id)
                setIntake(data)
                setSelectedClientId(data.client_id)
                setAssessmentDate(data.assessment_date)
                setIntakeData(data.intake_data || {})
            } catch (err: unknown) {
                toast.error(getApiErrorMessage(err, 'Failed to load intake'))
                navigate('/intakes')
            } finally {
                setLoading(false)
            }
        }
        loadIntake()
    }, [id, navigate])

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const updateField = useCallback((key: string, value: unknown) => {
        setIntakeData(prev => ({ ...prev, [key]: value }))
    }, [])

    const toggleSection = (key: string) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const selectedClient = clients.find(c => c.id === selectedClientId)

    // ICD-10 search filter
    const filteredIcd = ICD10_CODES.filter(c =>
        c.code.toLowerCase().includes(icdSearch.toLowerCase()) ||
        c.label.toLowerCase().includes(icdSearch.toLowerCase())
    )

    const addSecondaryDx = (code: string, label: string) => {
        const current = (intakeData.secondary_diagnoses as Array<{ code: string; label: string }>) || []
        if (current.length >= 4) {
            toast.error('Maximum 4 secondary diagnoses')
            return
        }
        if (current.some(d => d.code === code)) return
        updateField('secondary_diagnoses', [...current, { code, label }])
    }

    const removeSecondaryDx = (code: string) => {
        const current = (intakeData.secondary_diagnoses as Array<{ code: string; label: string }>) || []
        updateField('secondary_diagnoses', current.filter(d => d.code !== code))
    }

    // Toggle risk factor
    const toggleRiskFactor = (factor: string) => {
        const current = (intakeData.intake_risk_factors as string[]) || []
        if (current.includes(factor)) {
            updateField('intake_risk_factors', current.filter(f => f !== factor))
        } else {
            updateField('intake_risk_factors', [...current, factor])
        }
    }

    // ─── Auto-save (edit mode only, 2s debounce) ─────────────────────────────
    useEffect(() => {
        if (!isEditMode || !id || isLocked) return
        if (isFirstRender.current) { isFirstRender.current = false; return }
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
        autoSaveTimer.current = setTimeout(async () => {
            setAutoSaveStatus('saving')
            try {
                const updated = await intakesApi.update(id, {
                    assessment_date: assessmentDate,
                    intake_data: intakeData,
                })
                setIntake(updated)
                setAutoSaveStatus('saved')
                setTimeout(() => setAutoSaveStatus('idle'), 2000)
            } catch {
                setAutoSaveStatus('idle')
            }
        }, 2000)
        return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
    }, [intakeData])

    // ─── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedClientId) {
            toast.error('Please select a client')
            return
        }
        setSaving(true)
        try {
            const payload = {
                client_id: selectedClientId,
                assessment_date: assessmentDate,
                intake_data: intakeData,
            }
            if (isEditMode && id) {
                const updated = await intakesApi.update(id, payload)
                setIntake(updated)
                toast.success('Intake saved')
            } else {
                const created = await intakesApi.create(payload)
                toast.success('Intake created')
                navigate(`/intakes/${created.id}/edit`, { replace: true })
            }
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, 'Failed to save'))
        } finally {
            setSaving(false)
        }
    }

    // ─── Copy from Previous ──────────────────────────────────────────────────
    const handleCopyFromPrevious = async () => {
        if (!selectedClientId) {
            toast.error('Select a client first')
            return
        }
        try {
            const { data } = await (await import('../api/client')).default.get('/intakes/', {
                params: { client: selectedClientId, status: 'signed' }
            })
            const results = data.results || []
            if (results.length === 0) {
                toast.error('No previous signed intake found for this client')
                return
            }
            const prevIntake = await intakesApi.getById(results[0].id)
            setIntakeData(prevIntake.intake_data || {})
            toast.success('Copied from previous intake')
        } catch {
            toast.error('Failed to copy from previous intake')
        }
    }

    // ─── Section Header Component ─────────────────────────────────────────────
    const SectionHeader = ({ id: sId, title, number }: { id: string; title: string; number: string }) => (
        <button
            type="button"
            className="intake-section-header"
            onClick={() => toggleSection(sId)}
        >
            {sections[sId] ? <CaretDown size={18} /> : <CaretRight size={18} />}
            <span className="intake-section-number">{number}</span>
            <span className="intake-section-title">{title}</span>
        </button>
    )

    if (loading) {
        return (
            <DashboardLayout>
                <div className="page-loading">Loading intake...</div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="intake-editor">
                {/* Top Bar */}
                <div className="intake-editor-topbar">
                    <div>
                        <h1>{isEditMode ? 'Edit' : 'New'} Intake Assessment</h1>
                        {intake && (
                            <span className={`status-badge status-${intake.status}`}>{intake.status}</span>
                        )}
                    </div>
                    <div className="intake-editor-actions">
                        {autoSaveStatus === 'saving' && <span className="autosave-indicator saving">Saving…</span>}
                        {autoSaveStatus === 'saved' && <span className="autosave-indicator saved"><CheckCircle size={14} weight="fill" /> Saved</span>}
                        {intake && (
                            <button type="button" className="btn-secondary" onClick={() => setShowPreview(true)}>
                                <Eye size={16} /> Preview
                            </button>
                        )}
                        {intake && (
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => printIntake(intake, selectedClient, user || undefined, user?.organization_name)}
                            >
                                <FilePdf size={16} /> Export PDF
                            </button>
                        )}
                        {!isLocked && (
                            <>
                                <button type="button" className="btn-secondary" onClick={handleCopyFromPrevious}>
                                    <Copy size={16} /> Copy from Previous
                                </button>
                                <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                                    <FloppyDisk size={16} /> {saving ? 'Saving...' : 'Save Draft'}
                                </button>
                            </>
                        )}
                        {isLocked && (
                            <span className="locked-badge"><PencilSimple size={14} /> Locked</span>
                        )}
                    </div>
                </div>

                {isLocked && (
                    <div className="alert-banner alert-info">
                        This intake is signed and locked. No further edits can be made.
                    </div>
                )}

                <div className="intake-editor-form">
                    {/* ─── 3.1 Form Header ─────────────────────────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="header" title="Client & Provider Information" number="1" />
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
                                        <label>Assessment Date *</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={assessmentDate}
                                            onChange={e => setAssessmentDate(e.target.value)}
                                            disabled={isLocked}
                                        />
                                    </div>
                                </div>
                                {selectedClient && (
                                    <div className="intake-client-info">
                                        <div><strong>DOB:</strong> {selectedClient.date_of_birth || '—'}</div>
                                        <div><strong>MRN:</strong> {selectedClient.mrn || '—'}</div>
                                        <div><strong>Provider:</strong> {user?.first_name} {user?.last_name}</div>
                                        <div><strong>NPI:</strong> {(intakeData.provider_npi as string) || '—'}</div>
                                    </div>
                                )}
                                <div className="intake-grid-2" style={{ marginTop: '0.75rem' }}>
                                    <div className="form-group">
                                        <label>Provider NPI</label>
                                        {orgNpis.length > 0 ? (
                                            <select
                                                className="form-select"
                                                value={(intakeData.provider_npi as string) || ''}
                                                onChange={e => updateField('provider_npi', e.target.value)}
                                                disabled={isLocked}
                                            >
                                                <option value="">Select NPI...</option>
                                                {orgNpis.map(n => (
                                                    <option key={n.id} value={n.npi_number}>
                                                        {n.npi_number} — {n.business_name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Enter NPI manually"
                                                    value={(intakeData.provider_npi as string) || ''}
                                                    onChange={e => updateField('provider_npi', e.target.value)}
                                                    disabled={isLocked}
                                                />
                                                <span className="field-hint" style={{ color: '#f59e0b' }}>
                                                    No NPIs configured in your organization.{' '}
                                                    <a href="/settings" style={{ color: '#d97706', fontWeight: 600 }}>Go to Settings → Add NPI</a>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label>Referral Source</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g., Self-referral, PCP, School"
                                            value={(intakeData.referral_source as string) || ''}
                                            onChange={e => updateField('referral_source', e.target.value)}
                                            disabled={isLocked}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── 3.2 Presenting Problem ──────────────────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="presenting" title="Presenting Problem / Chief Complaint" number="2" />
                        {sections.presenting && (
                            <div className="intake-section-body">
                                <textarea
                                    className="form-textarea"
                                    rows={5}
                                    placeholder="Describe the presenting problem, symptoms, duration, severity, and impact on functioning..."
                                    value={(intakeData.presenting_problem as string) || ''}
                                    onChange={e => updateField('presenting_problem', e.target.value)}
                                    disabled={isLocked}
                                />
                            </div>
                        )}
                    </div>

                    {/* ─── 3.3 Diagnosis ────────────────────────────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="diagnosis" title="Diagnosis" number="3" />
                        {sections.diagnosis && (
                            <div className="intake-section-body">
                                <div className="form-group">
                                    <label>Primary Diagnosis (ICD-10)</label>
                                    <select
                                        className="form-select"
                                        value={(intakeData.primary_diagnosis as string) || ''}
                                        onChange={e => updateField('primary_diagnosis', e.target.value)}
                                        disabled={isLocked}
                                    >
                                        <option value="">Select primary diagnosis...</option>
                                        {ICD10_CODES.map(c => (
                                            <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Secondary Diagnoses (up to 4)</label>
                                    <div className="icd-search-wrapper">
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Search ICD-10 code or description..."
                                            value={icdSearch}
                                            onChange={e => { setIcdSearch(e.target.value); setShowIcdDropdown(true) }}
                                            onFocus={() => setShowIcdDropdown(true)}
                                            disabled={isLocked}
                                        />
                                        {showIcdDropdown && icdSearch && (
                                            <div className="icd-dropdown">
                                                {filteredIcd.slice(0, 10).map(c => (
                                                    <button
                                                        key={c.code}
                                                        type="button"
                                                        className="icd-dropdown-item"
                                                        onClick={() => {
                                                            addSecondaryDx(c.code, c.label)
                                                            setIcdSearch('')
                                                            setShowIcdDropdown(false)
                                                        }}
                                                    >
                                                        <strong>{c.code}</strong> — {c.label}
                                                    </button>
                                                ))}
                                                {filteredIcd.length === 0 && (
                                                    <div className="icd-dropdown-item" style={{ opacity: 0.5 }}>No matches</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="dx-tags">
                                        {((intakeData.secondary_diagnoses as Array<{ code: string; label: string }>) || []).map(d => (
                                            <span key={d.code} className="dx-tag">
                                                {d.code} — {d.label}
                                                {!isLocked && (
                                                    <button type="button" onClick={() => removeSecondaryDx(d.code)}>×</button>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* E12: Justification narrative for the diagnosis.
                                    Dr. Joe (2026-05-04): "would like a narrative
                                    box to put justification for diagnosis". */}
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="form-label">
                                        Diagnosis Justification
                                    </label>
                                    <textarea
                                        className="form-textarea"
                                        rows={4}
                                        placeholder="Describe the clinical reasoning that supports this diagnosis: presenting symptoms, duration, functional impact, and how the criteria were met. This is your narrative — not a template."
                                        value={(intakeData.diagnosis_justification as string) || ''}
                                        onChange={e => updateField('diagnosis_justification', e.target.value)}
                                        disabled={isLocked}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── 3.4 Pertinent History ───────────────────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="history" title="Pertinent History" number="4" />
                        {sections.history && (
                            <div className="intake-section-body">
                                {[
                                    { key: 'psychiatric_history', label: 'Psychiatric History', placeholder: 'Previous diagnoses, hospitalizations, medications...' },
                                    { key: 'medical_history', label: 'Medical History', placeholder: 'Current medical conditions, medications, allergies...' },
                                    { key: 'developmental_history', label: 'Developmental History', placeholder: 'Milestones, developmental delays, IEP/504...' },
                                    { key: 'trauma_history', label: 'Trauma History', placeholder: 'History of abuse, neglect, significant adverse events...' },
                                    { key: 'substance_use_history', label: 'Substance Use History', placeholder: 'Current/past substance use, frequency, last use...' },
                                ].map(field => (
                                    <div className="form-group" key={field.key} style={{ marginBottom: '1rem' }}>
                                        <label>{field.label}</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={3}
                                            placeholder={field.placeholder}
                                            value={(intakeData[field.key] as string) || ''}
                                            onChange={e => updateField(field.key, e.target.value)}
                                            disabled={isLocked}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ─── 3.5 MSE at Intake ───────────────────────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="mse" title="Mental Status Exam at Intake" number="5" />
                        {sections.mse && (
                            <div className="intake-section-body">
                                <MentalStatusExam
                                    values={intakeData as Record<string, string | string[]>}
                                    onChange={updateField}
                                    disabled={isLocked}
                                />
                            </div>
                        )}
                    </div>

                    {/* ─── 3.6 Family / Psychosocial Assessment ────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="family" title="Family / Psychosocial Assessment" number="6" />
                        {sections.family && (
                            <div className="intake-section-body">
                                {[
                                    { key: 'family_composition', label: 'Family Composition / Living Situation', placeholder: 'Who lives in the home, family structure...' },
                                    { key: 'family_relationships', label: 'Family Relationships', placeholder: 'Quality of relationships, conflicts, supports...' },
                                    { key: 'social_functioning', label: 'Social Functioning', placeholder: 'Peer relationships, social activities, isolation...' },
                                    { key: 'education_employment', label: 'Education / Employment', placeholder: 'Current school/work, performance, accommodations...' },
                                    { key: 'cultural_considerations', label: 'Cultural / Religious Considerations', placeholder: 'Relevant cultural factors, language needs...' },
                                ].map(field => (
                                    <div className="form-group" key={field.key} style={{ marginBottom: '1rem' }}>
                                        <label>{field.label}</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={3}
                                            placeholder={field.placeholder}
                                            value={(intakeData[field.key] as string) || ''}
                                            onChange={e => updateField(field.key, e.target.value)}
                                            disabled={isLocked}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ─── 3.7 Risk Factors ────────────────────────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="risk" title="Risk Factors" number="7" />
                        {sections.risk && (
                            <div className="intake-section-body">
                                <p className="intake-helper-text">Select all that apply:</p>
                                <div className="intake-checklist-grid">
                                    {RISK_FACTOR_OPTIONS.map(factor => {
                                        const checked = ((intakeData.intake_risk_factors as string[]) || []).includes(factor)
                                        return (
                                            <label key={factor} className="intake-check-item">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleRiskFactor(factor)}
                                                    disabled={isLocked}
                                                />
                                                <span>{factor}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Risk Factor Explanation</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        placeholder="Explain selected risk factors in detail..."
                                        value={(intakeData.risk_explanation as string) || ''}
                                        onChange={e => updateField('risk_explanation', e.target.value)}
                                        disabled={isLocked}
                                    />
                                </div>

                                <RiskAssessment
                                    values={intakeData}
                                    onChange={updateField}
                                    disabled={isLocked}
                                />
                            </div>
                        )}
                    </div>

                    {/* ─── 3.8 Safety Plan ─────────────────────────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="safety" title="Safety Plan" number="8" />
                        {sections.safety && (
                            <div className="intake-section-body">
                                <div className="form-group">
                                    <label>Safety Plan in Place?</label>
                                    <div className="intake-radio-group">
                                        <label className="intake-radio">
                                            <input
                                                type="radio"
                                                name="safety_plan"
                                                value="yes"
                                                checked={(intakeData.safety_plan_in_place as string) === 'yes'}
                                                onChange={() => updateField('safety_plan_in_place', 'yes')}
                                                disabled={isLocked}
                                            />
                                            <span>Yes</span>
                                        </label>
                                        <label className="intake-radio">
                                            <input
                                                type="radio"
                                                name="safety_plan"
                                                value="no"
                                                checked={(intakeData.safety_plan_in_place as string) === 'no'}
                                                onChange={() => updateField('safety_plan_in_place', 'no')}
                                                disabled={isLocked}
                                            />
                                            <span>No</span>
                                        </label>
                                        <label className="intake-radio">
                                            <input
                                                type="radio"
                                                name="safety_plan"
                                                value="na"
                                                checked={(intakeData.safety_plan_in_place as string) === 'na'}
                                                onChange={() => updateField('safety_plan_in_place', 'na')}
                                                disabled={isLocked}
                                            />
                                            <span>N/A</span>
                                        </label>
                                    </div>
                                </div>
                                {(intakeData.safety_plan_in_place as string) === 'yes' && (
                                    <div className="form-group" style={{ marginTop: '1rem' }}>
                                        <label>Safety Plan Details</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={4}
                                            placeholder="Warning signs, coping strategies, people to contact, emergency contacts..."
                                            value={(intakeData.safety_plan_details as string) || ''}
                                            onChange={e => updateField('safety_plan_details', e.target.value)}
                                            disabled={isLocked}
                                        />
                                    </div>
                                )}
                                {(intakeData.safety_plan_in_place as string) === 'no' && (
                                    <div className="form-group" style={{ marginTop: '1rem' }}>
                                        <label>Explanation (why no safety plan)</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={3}
                                            placeholder="Explain why a safety plan is not in place..."
                                            value={(intakeData.safety_plan_explanation as string) || ''}
                                            onChange={e => updateField('safety_plan_explanation', e.target.value)}
                                            disabled={isLocked}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ─── 3.9 Strengths, Supports, Goals ──────────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="strengths" title="Strengths, Supports & Treatment Goals" number="9" />
                        {sections.strengths && (
                            <div className="intake-section-body">
                                <div className="form-group">
                                    <label>Client Strengths</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        placeholder="e.g., Motivated for treatment, strong family support, good insight..."
                                        value={(intakeData.client_strengths as string) || ''}
                                        onChange={e => updateField('client_strengths', e.target.value)}
                                        disabled={isLocked}
                                    />
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Support Systems</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        placeholder="e.g., Family, friends, religious community, case manager..."
                                        value={(intakeData.support_systems as string) || ''}
                                        onChange={e => updateField('support_systems', e.target.value)}
                                        disabled={isLocked}
                                    />
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Tentative Treatment Goals</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={4}
                                        placeholder="1. Reduce depressive symptoms...\n2. Improve coping skills...\n3. Increase social functioning..."
                                        value={(intakeData.tentative_goals as string) || ''}
                                        onChange={e => updateField('tentative_goals', e.target.value)}
                                        disabled={isLocked}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── 3.10 Treatment Length / Frequency ────────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="treatment" title="Treatment Length & Frequency" number="10" />
                        {sections.treatment && (
                            <div className="intake-section-body">
                                <div className="intake-grid-2">
                                    <div className="form-group">
                                        <label>Recommended Frequency</label>
                                        <select
                                            className="form-select"
                                            value={(intakeData.treatment_frequency as string) || ''}
                                            onChange={e => updateField('treatment_frequency', e.target.value)}
                                            disabled={isLocked}
                                        >
                                            <option value="">Select frequency...</option>
                                            {TREATMENT_FREQUENCY_OPTIONS.map(f => (
                                                <option key={f} value={f}>{f}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Estimated Duration</label>
                                        <select
                                            className="form-select"
                                            value={(intakeData.treatment_duration as string) || ''}
                                            onChange={e => updateField('treatment_duration', e.target.value)}
                                            disabled={isLocked}
                                        >
                                            <option value="">Select duration...</option>
                                            <option value="3 months">3 months</option>
                                            <option value="6 months">6 months</option>
                                            <option value="9 months">9 months</option>
                                            <option value="12 months">12 months</option>
                                            <option value="Ongoing">Ongoing</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label>Session Duration</label>
                                    <select
                                        className="form-select"
                                        value={(intakeData.session_duration as string) || ''}
                                        onChange={e => updateField('session_duration', e.target.value)}
                                        disabled={isLocked}
                                    >
                                        <option value="">Select session length...</option>
                                        <option value="30 min">30 minutes</option>
                                        <option value="45 min">45 minutes</option>
                                        <option value="60 min">60 minutes</option>
                                        <option value="90 min">90 minutes</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── 3.11 Special Needs ──────────────────────────────────── */}
                    <div className="intake-section">
                        <SectionHeader id="special" title="Special Needs / Educational Needs" number="11" />
                        {sections.special && (
                            <div className="intake-section-body">
                                <textarea
                                    className="form-textarea"
                                    rows={4}
                                    placeholder="IEP/504 plan, learning disabilities, communication needs, interpreter required, mobility accommodations..."
                                    value={(intakeData.special_needs as string) || ''}
                                    onChange={e => updateField('special_needs', e.target.value)}
                                    disabled={isLocked}
                                />
                            </div>
                        )}
                    </div>

                    {/* ─── 3.12 Footer (Medical Necessity + Signatures) ────────── */}
                    <div className="intake-section">
                        <SectionHeader id="footer" title="Medical Necessity & Signatures" number="12" />
                        {sections.footer && (
                            <div className="intake-section-body">
                                <div className="form-group">
                                    <label>Medical Necessity Statement</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={4}
                                        value={(intakeData.medical_necessity as string) || DEFAULT_MEDICAL_NECESSITY}
                                        onChange={e => updateField('medical_necessity', e.target.value)}
                                        disabled={isLocked}
                                    />
                                </div>

                                <div className="intake-signature-section" style={{ marginTop: '1.5rem' }}>
                                    <h4>Provider Signature</h4>
                                    {intake?.signed_at ? (
                                        <div className="signature-status signed">
                                            <CheckCircle size={16} weight="fill" /> Signed by {intake.provider_name} on {new Date(intake.signed_at).toLocaleDateString()}
                                        </div>
                                    ) : intake && !isSigningProvider ? (
                                        <button
                                            type="button"
                                            className="btn-secondary btn-sm"
                                            onClick={() => setIsSigningProvider(true)}
                                            disabled={isSigning}
                                        >
                                            <PenNib size={16} /> Sign as Provider
                                        </button>
                                    ) : intake && isSigningProvider ? (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <SignaturePad
                                                onSave={async (sig) => {
                                                    setIsSigning(true)
                                                    try {
                                                        const updated = await intakesApi.sign(intake.id, sig)
                                                        setIntake(updated)
                                                        setIsSigningProvider(false)
                                                        toast.success('Intake signed')
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
                                        <p className="intake-helper-text">Save the intake first to enable signing.</p>
                                    )}

                                    <h4 style={{ marginTop: '1.5rem' }}>Client Signature</h4>
                                    {intake?.client_signed_at ? (
                                        <div className="signature-status signed">
                                            <CheckCircle size={16} weight="fill" /> Client signed on {new Date(intake.client_signed_at).toLocaleDateString()}
                                        </div>
                                    ) : intake && !isSigningClient ? (
                                        <button
                                            type="button"
                                            className="btn-secondary btn-sm"
                                            onClick={() => setIsSigningClient(true)}
                                            disabled={isSigning}
                                        >
                                            <PenNib size={16} /> Collect Client Signature
                                        </button>
                                    ) : intake && isSigningClient ? (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <SignaturePad
                                                onSave={async (sig) => {
                                                    setIsSigning(true)
                                                    try {
                                                        const updated = await intakesApi.clientSign(intake.id, sig)
                                                        setIntake(updated)
                                                        setIsSigningClient(false)
                                                        toast.success('Client signature collected')
                                                    } catch (err: unknown) {
                                                        toast.error(getApiErrorMessage(err, 'Failed to collect signature'))
                                                    } finally {
                                                        setIsSigning(false)
                                                    }
                                                }}
                                                onCancel={() => setIsSigningClient(false)}
                                            />
                                        </div>
                                    ) : (
                                        <p className="intake-helper-text">Save the intake first to collect client signature.</p>
                                    )}

                                    {intake?.co_signed_at && (
                                        <>
                                            <h4 style={{ marginTop: '1.5rem' }}>Co-Signature</h4>
                                            <div className="signature-status signed">
                                                <CheckCircle size={16} weight="fill" /> Co-signed by {intake.co_signer_name} on {new Date(intake.co_signed_at).toLocaleDateString()}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ─── 3.13 Convert to Treatment Plan ──────────────────────── */}
                    {intake && !isLocked && (
                        <div className="intake-section" style={{ textAlign: 'center', padding: '1.5rem' }}>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={() => {
                                    toast.success('Treatment plan creation will use intake data')
                                    navigate(`/treatment-plans?client=${selectedClientId}&from_intake=${intake.id}`)
                                }}
                            >
                                Convert to Full Treatment Plan
                            </button>
                        </div>
                    )}

                    {/* E11: addendum thread on intakes — Dr. Joe specifically
                        asked for "a place for an addendum as you learn more
                        info or want to change diagnosis". */}
                    {intake && (
                        <AddendumThread parentKind="intake" parentId={intake.id} />
                    )}
                </div>
            </div>

            {/* ─── Preview Modal ──────────────────────────────────────────── */}
            {showPreview && intake && (
                <div className="modal-overlay" onClick={() => setShowPreview(false)}>
                    <div className="modal-container" style={{ maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Intake Assessment Preview</h2>
                            <button className="modal-close" onClick={() => setShowPreview(false)}>×</button>
                        </div>
                        <div className="modal-body intake-preview">
                            <div className="intake-preview-meta">
                                <span><strong>Client:</strong> {intake.client_name}</span>
                                <span><strong>Date:</strong> {intake.assessment_date}</span>
                                <span><strong>Provider:</strong> {intake.provider_name}</span>
                                <span className={`badge badge-${intake.status === 'signed' || intake.status === 'co_signed' ? 'success' : 'neutral'}`}>{intake.status}</span>
                            </div>

                            {Object.entries(intakeData).map(([key, value]) => {
                                if (!value || (Array.isArray(value) && value.length === 0)) return null
                                const label = key.replace(/^intake_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                const renderItem = (v: unknown) => {
                                    if (v && typeof v === 'object' && !Array.isArray(v)) {
                                        const obj = v as Record<string, unknown>
                                        if (obj.code && obj.label) return `${obj.code} — ${obj.label}`
                                        return Object.values(obj).join(' ')
                                    }
                                    return String(v)
                                }
                                return (
                                    <div key={key} className="intake-preview-field">
                                        <p className="intake-preview-label">{label}</p>
                                        {Array.isArray(value) ? (
                                            <ul className="intake-preview-list">
                                                {value.map((v, i) => <li key={i}>{renderItem(v)}</li>)}
                                            </ul>
                                        ) : (
                                            <p className="intake-preview-value">{renderItem(value)}</p>
                                        )}
                                    </div>
                                )
                            })}

                            <div className="intake-preview-signatures">
                                <div className="intake-preview-sig-box">
                                    <p className="intake-preview-label">Provider Signature</p>
                                    {intake.signed_at
                                        ? <p className="intake-preview-value">✓ {intake.provider_name} — {new Date(intake.signed_at).toLocaleDateString()}</p>
                                        : <p className="intake-preview-value" style={{ color: '#94a3b8' }}>Not yet signed</p>
                                    }
                                </div>
                                <div className="intake-preview-sig-box">
                                    <p className="intake-preview-label">Client Signature</p>
                                    {intake.client_signed_at
                                        ? <p className="intake-preview-value">✓ {new Date(intake.client_signed_at).toLocaleDateString()}</p>
                                        : <p className="intake-preview-value" style={{ color: '#94a3b8' }}>Not yet signed</p>
                                    }
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => window.print()}>Print</button>
                            <button className="btn-primary" onClick={() => setShowPreview(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}
