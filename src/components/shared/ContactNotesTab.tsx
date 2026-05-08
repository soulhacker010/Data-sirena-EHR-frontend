/**
 * ContactNotesTab — list + add UI for non-billable client contact notes (E19).
 *
 * Lives inside the client-detail page's "Contacts" tab. Loads contacts for the
 * given clientId, lets staff add a new entry inline (date/type/summary +
 * optional duration), and supports delete for the author or admin (the
 * backend permission check handles authorization).
 *
 * Self-contained — owns its own state, doesn't propagate side-effects up.
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash, ChatCircleText } from '@phosphor-icons/react'
import {
    contactNotesApi, CONTACT_TYPE_OPTIONS,
    type ContactNote, type ContactType,
} from '../../api/contactNotes'
import { getApiErrorMessage } from '../../utils/errors'

interface Props {
    clientId: string
}

function nowIsoLocal(): string {
    // 'YYYY-MM-DDTHH:MM' — accepted by `<input type="datetime-local">` and
    // converted to UTC ISO via Date.toISOString() before send.
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `T${pad(d.getHours())}:${pad(d.getMinutes())}`
    )
}

export default function ContactNotesTab({ clientId }: Props) {
    const [contacts, setContacts] = useState<ContactNote[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const [form, setForm] = useState({
        contact_date: nowIsoLocal(),
        contact_type: 'phone_outbound' as ContactType,
        summary: '',
        duration_minutes: '' as string,
    })

    const reload = async () => {
        setIsLoading(true)
        try {
            const data = await contactNotesApi.list({ client: clientId, page_size: 100 })
            setContacts(data.results)
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to load contacts'))
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const data = await contactNotesApi.list({ client: clientId, page_size: 100 })
                if (!cancelled) setContacts(data.results)
            } catch {
                // silent — empty state is acceptable
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [clientId])

    const handleSave = async () => {
        if (!form.summary.trim()) {
            toast.error('Summary is required')
            return
        }
        setIsSaving(true)
        try {
            // datetime-local → ISO with timezone — parsed as local then UTC
            // (same fix pattern as the calendar save: avoid naive datetimes).
            const isoDate = new Date(form.contact_date).toISOString()
            const duration = form.duration_minutes.trim()
                ? parseInt(form.duration_minutes, 10)
                : null
            await contactNotesApi.create({
                client_id: clientId,
                contact_date: isoDate,
                contact_type: form.contact_type,
                summary: form.summary.trim(),
                duration_minutes: Number.isFinite(duration) ? duration : null,
            })
            toast.success('Contact logged')
            setShowForm(false)
            setForm({
                contact_date: nowIsoLocal(),
                contact_type: 'phone_outbound',
                summary: '',
                duration_minutes: '',
            })
            await reload()
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to save contact'))
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (contact: ContactNote) => {
        if (!window.confirm('Delete this contact log entry? This cannot be undone.')) return
        try {
            await contactNotesApi.delete(contact.id)
            setContacts(prev => prev.filter(c => c.id !== contact.id))
            toast.success('Contact deleted')
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to delete'))
        }
    }

    return (
        <div className="contact-notes-tab">
            <div className="contact-notes-header">
                <div>
                    <h2 className="card-title">
                        <ChatCircleText size={20} weight="duotone" /> Contact Log
                    </h2>
                    <p className="text-muted text-sm">
                        Non-billable contacts — phone calls, emails, missed-appointment outreach,
                        and collateral conversations. Documented in the patient record but never
                        invoiced.
                    </p>
                </div>
                {!showForm && (
                    <button className="btn-primary" onClick={() => setShowForm(true)}>
                        <Plus size={18} /> Log Contact
                    </button>
                )}
            </div>

            {showForm && (
                <div className="contact-form card">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Contact Date / Time *</label>
                            <input
                                type="datetime-local"
                                className="form-input-basic"
                                value={form.contact_date}
                                onChange={(e) => setForm(prev => ({ ...prev, contact_date: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type *</label>
                            <select
                                className="form-input-basic"
                                value={form.contact_type}
                                onChange={(e) => setForm(prev => ({ ...prev, contact_type: e.target.value as ContactType }))}
                            >
                                {CONTACT_TYPE_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Duration (min)</label>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                className="form-input-basic"
                                placeholder="optional"
                                value={form.duration_minutes}
                                onChange={(e) => setForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Summary *</label>
                        <textarea
                            className="form-textarea"
                            rows={3}
                            placeholder="What was discussed or what happened?"
                            value={form.summary}
                            onChange={(e) => setForm(prev => ({ ...prev, summary: e.target.value }))}
                            autoFocus
                        />
                    </div>
                    <div className="form-actions">
                        <button
                            className="btn-secondary"
                            onClick={() => setShowForm(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleSave}
                            disabled={isSaving || !form.summary.trim()}
                        >
                            {isSaving ? 'Saving…' : 'Log Contact'}
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <p className="text-muted">Loading contacts…</p>
            ) : contacts.length === 0 ? (
                <div className="card text-center text-muted p-4">
                    No contacts logged for this client yet.
                </div>
            ) : (
                <ol className="contact-list">
                    {contacts.map(c => (
                        <li key={c.id} className="contact-item">
                            <div className="contact-item-meta">
                                <span className="contact-item-type">{c.contact_type_display}</span>
                                <span className="contact-item-sep">·</span>
                                <time className="contact-item-time">
                                    {new Date(c.contact_date).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    })}
                                </time>
                                <span className="contact-item-sep">·</span>
                                <span className="contact-item-author">{c.provider_name}</span>
                                {c.duration_minutes != null && (
                                    <>
                                        <span className="contact-item-sep">·</span>
                                        <span className="contact-item-duration">{c.duration_minutes} min</span>
                                    </>
                                )}
                                <button
                                    type="button"
                                    className="contact-item-delete"
                                    title="Delete"
                                    onClick={() => handleDelete(c)}
                                >
                                    <Trash size={14} />
                                </button>
                            </div>
                            <p className="contact-item-summary">{c.summary}</p>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    )
}
