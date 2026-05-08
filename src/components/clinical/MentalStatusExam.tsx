import { Brain } from '@phosphor-icons/react'
import { MSE_FIELDS } from '../../constants/clinicalFields'
import MultiSelectField from '../shared/MultiSelectField'

/**
 * E6 + E7 + E8 (Dr. Joe 2026-05-04): every MSE field is now a multi-select
 * combobox supporting WNL as a first-class option (E6 — already in the
 * options list), free-text input (E7), and multiple selections at once (E8).
 *
 * Storage: `note_data[field.key]` is now `string[]`. Old notes that stored
 * `string` are coerced to a one-element array on read by `MultiSelectField`,
 * and the printIntake helper handles both shapes transparently.
 */
interface MentalStatusExamProps {
    /** Now allows arrays on the values map — old single-string entries
     *  still work (MultiSelectField coerces). */
    values: Record<string, string | string[]>
    /** Always called with an array of strings. */
    onChange: (key: string, value: string[]) => void
    disabled?: boolean
    collapsed?: boolean
    onToggleCollapse?: () => void
}

function isFilled(value: string | string[] | undefined): boolean {
    if (!value) return false
    if (Array.isArray(value)) return value.length > 0
    return value.trim().length > 0
}

export default function MentalStatusExam({
    values,
    onChange,
    disabled = false,
    collapsed = false,
    onToggleCollapse,
}: MentalStatusExamProps) {
    const filledCount = MSE_FIELDS.filter(f => isFilled(values[f.key])).length

    return (
        <div className="clinical-section mse-section">
            <button
                type="button"
                className="clinical-section-header"
                onClick={onToggleCollapse}
                aria-expanded={!collapsed}
            >
                <div className="clinical-section-title">
                    <Brain size={20} weight="duotone" />
                    <h4>Mental Status Exam (MSE)</h4>
                    <span className="clinical-section-count">
                        {filledCount}/{MSE_FIELDS.length}
                    </span>
                </div>
                <span className={`clinical-section-chevron ${collapsed ? '' : 'open'}`}>
                    &#9662;
                </span>
            </button>

            {!collapsed && (
                <div className="mse-grid">
                    {MSE_FIELDS.map(field => (
                        <div key={field.key} className="mse-field">
                            <label className="form-label">{field.label}</label>
                            <MultiSelectField
                                options={field.options.filter(o => o !== 'Other (specify)')}
                                value={values[field.key]}
                                onChange={(next) => onChange(field.key, next)}
                                disabled={disabled}
                                placeholder="Type custom observation…"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
