import { ChartBar, Plus, Trash } from '@phosphor-icons/react'
import { ABA_FIELDS } from '../../constants/clinicalFields'

interface ABAGoalEntry {
    goal: string
    trials: string
    correct: string
    prompt_level: string
}

interface ABADataFieldsProps {
    values: Record<string, unknown>
    onChange: (key: string, value: unknown) => void
    disabled?: boolean
    collapsed?: boolean
    onToggleCollapse?: () => void
}

const EMPTY_GOAL: ABAGoalEntry = { goal: '', trials: '', correct: '', prompt_level: '' }

export default function ABADataFields({
    values,
    onChange,
    disabled = false,
    collapsed = false,
    onToggleCollapse,
}: ABADataFieldsProps) {
    const goals = (values.aba_goals as ABAGoalEntry[]) || [{ ...EMPTY_GOAL }]
    const abcData = (values.aba_abc_data as string) || ''
    const reinforcers = (values.aba_reinforcers as string) || ''
    const maladaptive = (values.aba_maladaptive_behaviors as string) || ''

    const promptOptions = ABA_FIELDS.find(f => f.key === 'aba_prompt_level')?.options || []

    const updateGoal = (index: number, field: keyof ABAGoalEntry, value: string) => {
        const updated = goals.map((g, i) => i === index ? { ...g, [field]: value } : g)
        onChange('aba_goals', updated)
    }

    const addGoal = () => {
        onChange('aba_goals', [...goals, { ...EMPTY_GOAL }])
    }

    const removeGoal = (index: number) => {
        if (goals.length <= 1) return
        onChange('aba_goals', goals.filter((_, i) => i !== index))
    }

    return (
        <div className="clinical-section aba-section">
            <button
                type="button"
                className="clinical-section-header"
                onClick={onToggleCollapse}
                aria-expanded={!collapsed}
            >
                <div className="clinical-section-title">
                    <ChartBar size={20} weight="duotone" />
                    <h4>ABA Session Data</h4>
                    <span className="clinical-section-count">
                        {goals.filter(g => g.goal).length} goal(s)
                    </span>
                </div>
                <span className={`clinical-section-chevron ${collapsed ? '' : 'open'}`}>
                    &#9662;
                </span>
            </button>

            {!collapsed && (
                <div className="aba-content">
                    <div className="aba-goals-section">
                        <div className="aba-goals-header">
                            <label className="form-label">Goals Targeted &amp; Trial Data</label>
                            {!disabled && (
                                <button type="button" className="btn-icon-sm" onClick={addGoal}>
                                    <Plus size={14} /> Add Goal
                                </button>
                            )}
                        </div>

                        {goals.map((goal, idx) => (
                            <div key={idx} className="aba-goal-row">
                                <div className="aba-goal-fields">
                                    <div className="form-group aba-goal-name">
                                        <label className="form-label-sm">Goal / Target</label>
                                        <input
                                            type="text"
                                            className="form-input-basic"
                                            placeholder="e.g. Manding for preferred items"
                                            value={goal.goal}
                                            onChange={e => updateGoal(idx, 'goal', e.target.value)}
                                            disabled={disabled}
                                        />
                                    </div>
                                    <div className="form-group aba-goal-trials">
                                        <label className="form-label-sm">Trials</label>
                                        <input
                                            type="number"
                                            className="form-input-basic"
                                            placeholder="10"
                                            value={goal.trials}
                                            onChange={e => updateGoal(idx, 'trials', e.target.value)}
                                            disabled={disabled}
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group aba-goal-correct">
                                        <label className="form-label-sm">Correct</label>
                                        <input
                                            type="number"
                                            className="form-input-basic"
                                            placeholder="8"
                                            value={goal.correct}
                                            onChange={e => updateGoal(idx, 'correct', e.target.value)}
                                            disabled={disabled}
                                            min="0"
                                        />
                                    </div>
                                    <div className="form-group aba-goal-prompt">
                                        <label className="form-label-sm">Prompt Level</label>
                                        <select
                                            className="form-input-basic"
                                            value={goal.prompt_level}
                                            onChange={e => updateGoal(idx, 'prompt_level', e.target.value)}
                                            disabled={disabled}
                                        >
                                            <option value="">Select...</option>
                                            {promptOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {!disabled && goals.length > 1 && (
                                        <button
                                            type="button"
                                            className="btn-icon-sm btn-danger-icon"
                                            onClick={() => removeGoal(idx)}
                                            title="Remove goal"
                                        >
                                            <Trash size={14} />
                                        </button>
                                    )}
                                </div>
                                {goal.trials && goal.correct && (
                                    <div className="aba-goal-accuracy">
                                        {Math.round((parseInt(goal.correct) / parseInt(goal.trials)) * 100) || 0}% accuracy
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="form-group">
                        <label className="form-label">ABC Data (Antecedent-Behavior-Consequence)</label>
                        <textarea
                            className="form-textarea"
                            value={abcData}
                            onChange={e => onChange('aba_abc_data', e.target.value)}
                            placeholder="A: [Antecedent] → B: [Behavior] → C: [Consequence]"
                            rows={3}
                            disabled={disabled}
                        />
                    </div>

                    <div className="aba-extras-row">
                        <div className="form-group">
                            <label className="form-label">Reinforcers Used</label>
                            <input
                                type="text"
                                className="form-input-basic"
                                value={reinforcers}
                                onChange={e => onChange('aba_reinforcers', e.target.value)}
                                placeholder="e.g. iPad, stickers, verbal praise"
                                disabled={disabled}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Maladaptive Behaviors Observed</label>
                            <input
                                type="text"
                                className="form-input-basic"
                                value={maladaptive}
                                onChange={e => onChange('aba_maladaptive_behaviors', e.target.value)}
                                placeholder="e.g. Elopement (2x), SIB (1x)"
                                disabled={disabled}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
