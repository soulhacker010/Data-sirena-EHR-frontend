import { Warning } from '@phosphor-icons/react'
import {
    RISK_LEVEL_OPTIONS,
    RISK_FACTOR_OPTIONS,
    RISK_PROTECTIVE_FACTORS,
    RISK_ACTIONS_TAKEN,
} from '../../constants/clinicalFields'

interface RiskAssessmentProps {
    values: Record<string, unknown>
    onChange: (key: string, value: unknown) => void
    disabled?: boolean
    collapsed?: boolean
    onToggleCollapse?: () => void
}

export default function RiskAssessment({
    values,
    onChange,
    disabled = false,
    collapsed = false,
    onToggleCollapse,
}: RiskAssessmentProps) {
    const suicideLevel = (values.risk_suicide_level as string) || ''
    const homicideLevel = (values.risk_homicide_level as string) || ''
    const riskFactors = (values.risk_factors as string[]) || []
    const protectiveFactors = (values.risk_protective_factors as string[]) || []
    const actionsTaken = (values.risk_actions_taken as string[]) || []
    const riskNotes = (values.risk_notes as string) || ''

    const hasRisk = suicideLevel !== '' || homicideLevel !== ''

    const toggleArrayItem = (key: string, current: string[], item: string) => {
        const next = current.includes(item)
            ? current.filter(i => i !== item)
            : [...current, item]
        onChange(key, next)
    }

    return (
        <div className={`clinical-section risk-section ${hasRisk && (suicideLevel !== 'None' || homicideLevel !== 'None') ? 'risk-flagged' : ''}`}>
            <button
                type="button"
                className="clinical-section-header"
                onClick={onToggleCollapse}
                aria-expanded={!collapsed}
            >
                <div className="clinical-section-title">
                    <Warning size={20} weight="duotone" />
                    <h4>Risk Assessment</h4>
                    {hasRisk && suicideLevel !== 'None' && (
                        <span className="risk-badge">SI: {suicideLevel}</span>
                    )}
                    {hasRisk && homicideLevel !== 'None' && (
                        <span className="risk-badge">HI: {homicideLevel}</span>
                    )}
                </div>
                <span className={`clinical-section-chevron ${collapsed ? '' : 'open'}`}>
                    &#9662;
                </span>
            </button>

            {!collapsed && (
                <div className="risk-content">
                    <div className="risk-levels-row">
                        <div className="form-group">
                            <label className="form-label">Suicidality Level</label>
                            <select
                                className="form-input-basic"
                                value={suicideLevel}
                                onChange={e => onChange('risk_suicide_level', e.target.value)}
                                disabled={disabled}
                            >
                                <option value="">Select...</option>
                                {RISK_LEVEL_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Homicidality Level</label>
                            <select
                                className="form-input-basic"
                                value={homicideLevel}
                                onChange={e => onChange('risk_homicide_level', e.target.value)}
                                disabled={disabled}
                            >
                                <option value="">Select...</option>
                                {RISK_LEVEL_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Risk Factors</label>
                        <div className="checkbox-grid">
                            {RISK_FACTOR_OPTIONS.map(factor => (
                                <label key={factor} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={riskFactors.includes(factor)}
                                        onChange={() => toggleArrayItem('risk_factors', riskFactors, factor)}
                                        disabled={disabled}
                                    />
                                    <span>{factor}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Protective Factors</label>
                        <div className="checkbox-grid">
                            {RISK_PROTECTIVE_FACTORS.map(factor => (
                                <label key={factor} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={protectiveFactors.includes(factor)}
                                        onChange={() => toggleArrayItem('risk_protective_factors', protectiveFactors, factor)}
                                        disabled={disabled}
                                    />
                                    <span>{factor}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Actions Taken</label>
                        <div className="checkbox-grid">
                            {RISK_ACTIONS_TAKEN.map(action => (
                                <label key={action} className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={actionsTaken.includes(action)}
                                        onChange={() => toggleArrayItem('risk_actions_taken', actionsTaken, action)}
                                        disabled={disabled}
                                    />
                                    <span>{action}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Additional Risk Notes</label>
                        <textarea
                            className="form-textarea"
                            value={riskNotes}
                            onChange={e => onChange('risk_notes', e.target.value)}
                            placeholder="Document any additional risk-related observations..."
                            rows={3}
                            disabled={disabled}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
