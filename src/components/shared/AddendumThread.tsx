/**
 * AddendumThread — list + add UI for addendums on any clinical document
 * (session note, intake, treatment plan). One component, three call sites.
 *
 * UX choices:
 *  - Existing addendums render as a chronological list with author + timestamp.
 *  - "Add Addendum" reveals an inline textarea + Save button rather than
 *    opening a modal — less disruptive when correcting one detail.
 *  - Submit is disabled while empty/whitespace and while saving.
 *  - Body is cleared and the new addendum prepended to the list on success.
 *  - Failures surface via toast (parent doesn't need to handle errors).
 *
 * The component is read-only when `disabled` is true (e.g. the parent doc
 * doesn't yet exist — addendums require a saved parent ID).
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ChatText, Plus } from '@phosphor-icons/react'
import { addendumsApi, type Addendum, type AddendumParentKind } from '../../api/addendums'
import { getApiErrorMessage } from '../../utils/errors'

interface Props {
    parentKind: AddendumParentKind
    parentId: string | null | undefined
    /** Disable add UI (e.g. when parent isn't saved yet). List still loads. */
    disabled?: boolean
}

export default function AddendumThread({ parentKind, parentId, disabled = false }: Props) {
    const [addendums, setAddendums] = useState<Addendum[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [body, setBody] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        let cancelled = false
        if (!parentId) {
            setAddendums([])
            return
        }
        setIsLoading(true)
        addendumsApi.list(parentKind, parentId)
            .then(rows => { if (!cancelled) setAddendums(rows) })
            .catch(() => { /* silent — empty state is acceptable on error */ })
            .finally(() => { if (!cancelled) setIsLoading(false) })
        return () => { cancelled = true }
    }, [parentKind, parentId])

    const handleSave = async () => {
        if (!parentId) return
        const trimmed = body.trim()
        if (!trimmed) return
        setIsSaving(true)
        try {
            const created = await addendumsApi.create(parentKind, parentId, trimmed)
            setAddendums(prev => [...prev, created])
            setBody('')
            setShowForm(false)
            toast.success('Addendum added')
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to add addendum'))
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="addendum-thread">
            <div className="addendum-thread-header">
                <ChatText size={18} weight="duotone" />
                <h4 className="addendum-thread-title">
                    Addendums
                    {addendums.length > 0 && (
                        <span className="addendum-thread-count">{addendums.length}</span>
                    )}
                </h4>
            </div>

            {isLoading ? (
                <p className="addendum-thread-empty">Loading addendums…</p>
            ) : addendums.length === 0 ? (
                <p className="addendum-thread-empty">No addendums yet.</p>
            ) : (
                <ol className="addendum-list">
                    {addendums.map(a => (
                        <li key={a.id} className="addendum-item">
                            <div className="addendum-item-meta">
                                <span className="addendum-item-author">{a.created_by_name}</span>
                                <span className="addendum-item-sep">·</span>
                                <time className="addendum-item-time">
                                    {new Date(a.created_at).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    })}
                                </time>
                            </div>
                            <p className="addendum-item-body">{a.body}</p>
                        </li>
                    ))}
                </ol>
            )}

            {!disabled && parentId && (
                showForm ? (
                    <div className="addendum-form">
                        <textarea
                            className="form-textarea addendum-form-textarea"
                            placeholder="Describe the change or addition. This will be added with your name and the current timestamp; it cannot be edited later."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={4}
                            autoFocus
                            disabled={isSaving}
                        />
                        <div className="addendum-form-actions">
                            <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={() => { setShowForm(false); setBody('') }}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary btn-sm"
                                onClick={handleSave}
                                disabled={isSaving || !body.trim()}
                            >
                                {isSaving ? 'Saving…' : 'Add Addendum'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        className="addendum-add-btn"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus size={14} weight="bold" />
                        Add Addendum
                    </button>
                )
            )}
        </div>
    )
}
