import { useState } from 'react'
import { ListChecks, Plus, X } from '@phosphor-icons/react'
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
    const [customInput, setCustomInput] = useState('')

    const predefined = INTERVENTION_OPTIONS
    const custom = selected.filter(s => !predefined.includes(s))

    const toggle = (item: string) => {
        const next = selected.includes(item)
            ? selected.filter(i => i !== item)
            : [...selected, item]
        onChange(next)
    }

    const addCustom = () => {
        const trimmed = customInput.trim()
        if (!trimmed || selected.includes(trimmed)) {
            setCustomInput('')
            return
        }
        onChange([...selected, trimmed])
        setCustomInput('')
    }

    const removeCustom = (item: string) => {
        onChange(selected.filter(i => i !== item))
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
                <>
                    <div className="checkbox-grid interventions-grid">
                        {predefined.map(item => (
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

                    {/* Custom interventions */}
                    {custom.length > 0 && (
                        <div className="interventions-custom-list">
                            {custom.map(item => (
                                <span key={item} className="intervention-custom-tag">
                                    {item}
                                    {!disabled && (
                                        <button type="button" onClick={() => removeCustom(item)}>
                                            <X size={12} weight="bold" />
                                        </button>
                                    )}
                                </span>
                            ))}
                        </div>
                    )}

                    {!disabled && (
                        <div className="interventions-custom-input">
                            <input
                                type="text"
                                className="form-input-basic"
                                placeholder="Add custom intervention…"
                                value={customInput}
                                onChange={e => setCustomInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                            />
                            <button
                                type="button"
                                className="btn-secondary btn-sm"
                                onClick={addCustom}
                                disabled={!customInput.trim()}
                            >
                                <Plus size={14} weight="bold" /> Add
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
