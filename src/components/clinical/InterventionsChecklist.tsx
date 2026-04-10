import { ListChecks } from '@phosphor-icons/react'
import { INTERVENTION_OPTIONS } from '../../constants/clinicalFields'

interface InterventionsChecklistProps {
    selected: string[]
    onChange: (selected: string[]) => void
    disabled?: boolean
    collapsed?: boolean
    onToggleCollapse?: () => void
}

export default function InterventionsChecklist({
    selected,
    onChange,
    disabled = false,
    collapsed = false,
    onToggleCollapse,
}: InterventionsChecklistProps) {
    const toggle = (item: string) => {
        const next = selected.includes(item)
            ? selected.filter(i => i !== item)
            : [...selected, item]
        onChange(next)
    }

    return (
        <div className="clinical-section interventions-section">
            <button
                type="button"
                className="clinical-section-header"
                onClick={onToggleCollapse}
                aria-expanded={!collapsed}
            >
                <div className="clinical-section-title">
                    <ListChecks size={20} weight="duotone" />
                    <h4>Interventions Used</h4>
                    <span className="clinical-section-count">
                        {selected.length} selected
                    </span>
                </div>
                <span className={`clinical-section-chevron ${collapsed ? '' : 'open'}`}>
                    &#9662;
                </span>
            </button>

            {!collapsed && (
                <div className="checkbox-grid interventions-grid">
                    {INTERVENTION_OPTIONS.map(item => (
                        <label key={item} className="checkbox-item">
                            <input
                                type="checkbox"
                                checked={selected.includes(item)}
                                onChange={() => toggle(item)}
                                disabled={disabled}
                            />
                            <span>{item}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    )
}
