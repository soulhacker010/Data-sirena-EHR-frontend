import { Brain } from '@phosphor-icons/react'
import { MSE_FIELDS } from '../../constants/clinicalFields'

interface MentalStatusExamProps {
    values: Record<string, string>
    onChange: (key: string, value: string) => void
    disabled?: boolean
    collapsed?: boolean
    onToggleCollapse?: () => void
}

export default function MentalStatusExam({
    values,
    onChange,
    disabled = false,
    collapsed = false,
    onToggleCollapse,
}: MentalStatusExamProps) {
    const filledCount = MSE_FIELDS.filter(f => values[f.key]).length

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
                            <select
                                className="form-input-basic"
                                value={values[field.key] || ''}
                                onChange={e => onChange(field.key, e.target.value)}
                                disabled={disabled}
                            >
                                <option value="">Select...</option>
                                {field.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
