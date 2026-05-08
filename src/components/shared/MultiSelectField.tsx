/**
 * MultiSelectField — chips + dropdown + free-text combobox for clinical
 * fields where:
 *  - Most users want a quick predefined selection (E6: WNL is option #1)
 *  - Sometimes the right answer needs free text (E7: type to add)
 *  - The clinical reality is often "more than one applies" (E8: multi-select)
 *
 * Design:
 *  - Selected values render as removable chips above the controls.
 *  - A select dropdown lets you add another predefined option in one click;
 *    options already chosen are filtered out.
 *  - A small text input + Enter (or Add button) appends a custom value.
 *  - Empty value → no chips. Single-string legacy values are coerced to a
 *    one-element array on read so existing notes keep rendering.
 *
 * Backwards-compat contract: emits an array on every change. Parents store
 * the array in `note_data[field.key]`. Old notes that have a string at the
 * same key still render correctly because we coerce on read.
 */
import { useState, type KeyboardEvent } from 'react'
import { X, Plus } from '@phosphor-icons/react'

interface Props {
    /** Predefined options shown in the dropdown. */
    options: string[]
    /** Stored value: string array (new) or string (legacy/empty). */
    value: string[] | string | undefined
    /** Always called with an array of strings. */
    onChange: (next: string[]) => void
    placeholder?: string
    disabled?: boolean
}

/** Coerce any of the legitimate stored shapes into a clean string[] for editing. */
function asArray(v: string[] | string | undefined): string[] {
    if (!v) return []
    if (Array.isArray(v)) return v.filter(Boolean)
    return [v].filter(Boolean)
}

export default function MultiSelectField({
    options,
    value,
    onChange,
    placeholder = 'Type a custom value…',
    disabled = false,
}: Props) {
    const selected = asArray(value)
    const [draft, setDraft] = useState('')

    const add = (item: string) => {
        const trimmed = item.trim()
        if (!trimmed) return
        if (selected.includes(trimmed)) return  // dedupe
        onChange([...selected, trimmed])
    }

    const remove = (item: string) => {
        onChange(selected.filter(s => s !== item))
    }

    const handleAddDraft = () => {
        if (!draft.trim()) return
        add(draft)
        setDraft('')
    }

    const handleDraftKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddDraft()
        }
    }

    // Keep already-selected predefined options out of the dropdown list to
    // avoid noisy re-selection. Custom values (typed) won't be in `options`
    // anyway, so they pass through naturally.
    const remainingOptions = options.filter(o => !selected.includes(o))

    return (
        <div className="multiselect-field">
            {selected.length > 0 && (
                <div className="multiselect-chips">
                    {selected.map(item => (
                        <span key={item} className="multiselect-chip">
                            <span className="multiselect-chip-text">{item}</span>
                            {!disabled && (
                                <button
                                    type="button"
                                    className="multiselect-chip-remove"
                                    onClick={() => remove(item)}
                                    aria-label={`Remove ${item}`}
                                    title="Remove"
                                >
                                    <X size={12} weight="bold" />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}

            <div className="multiselect-controls">
                <select
                    className="form-input-basic multiselect-select"
                    value=""
                    onChange={(e) => {
                        if (e.target.value) add(e.target.value)
                    }}
                    disabled={disabled || remainingOptions.length === 0}
                >
                    <option value="">
                        {remainingOptions.length === 0 ? 'All options selected' : 'Add option…'}
                    </option>
                    {remainingOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>

                <div className="multiselect-custom">
                    <input
                        type="text"
                        className="form-input-basic"
                        placeholder={placeholder}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleDraftKey}
                        disabled={disabled}
                    />
                    <button
                        type="button"
                        className="btn-secondary btn-sm multiselect-add-btn"
                        onClick={handleAddDraft}
                        disabled={disabled || !draft.trim()}
                        title="Add"
                    >
                        <Plus size={14} weight="bold" />
                    </button>
                </div>
            </div>
        </div>
    )
}
