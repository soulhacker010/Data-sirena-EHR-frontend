/**
 * DateOfBirthInput — three-field MM / DD / YYYY date entry.
 *
 * Replaces native <input type="date"> for date-of-birth specifically because
 * native date pickers handle distant past years badly:
 *   - Chrome/Safari interpret typed-but-not-arrow-keyed years digit by digit
 *     and clamp to whatever satisfies `min` after each keystroke. Typing
 *     "1966" can produce 0066, then 0966, then bounce between values, and
 *     the browser may settle on 0066 if the year sub-field commits early.
 *   - Year-picker UIs in mobile browsers often only show ~10 years back.
 *
 * Three independent fields sidestep all of that:
 *   - Month is a labelled dropdown — no typing ambiguity.
 *   - Day and Year are number inputs — typing "1966" stays 1966.
 *
 * Contract: emits onChange(isoString) where isoString is either:
 *   - 'YYYY-MM-DD' when all three parts form a real date, or
 *   - ''           when any field is blank (parent uses falsy check).
 *
 * Returns null isoString for impossible dates (e.g. Feb 30) so the parent's
 * validator surfaces the error in its normal flow.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

export interface DateOfBirthInputProps {
    /** Current ISO date value 'YYYY-MM-DD' or '' */
    value: string
    /** Called with new ISO value (or '' if any part is blank) */
    onChange: (isoDate: string) => void
    /** Optional: name attribute is forwarded to the day field for form integrations */
    name?: string
    /** Optional: lower bound for year (default 1900) */
    minYear?: number
    /** Optional: upper bound for year (default current year) */
    maxYear?: number
    /** Mark the input as in-error (red border + a11y) */
    hasError?: boolean
    /** Disable the input */
    disabled?: boolean
    /** Custom id prefix for label-for / aria connections */
    idPrefix?: string
}

const MONTHS = [
    { value: '01', label: 'Jan' },
    { value: '02', label: 'Feb' },
    { value: '03', label: 'Mar' },
    { value: '04', label: 'Apr' },
    { value: '05', label: 'May' },
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
    { value: '08', label: 'Aug' },
    { value: '09', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' },
]

interface Parts {
    month: string
    day: string
    year: string
}

const EMPTY: Parts = { month: '', day: '', year: '' }

/** Split 'YYYY-MM-DD' into its parts, or EMPTY if anything is malformed. */
function splitIso(value: string): Parts {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return EMPTY
    const [year, month, day] = value.split('-')
    return { year, month, day }
}

/** Last day of the given month (1-12) in the given year. Year may be 0. */
function daysInMonth(year: number, month: number): number {
    if (!Number.isFinite(year) || !Number.isFinite(month)) return 31
    if (month < 1 || month > 12) return 31
    return new Date(year, month, 0).getDate()
}

/**
 * Combine parts into ISO YYYY-MM-DD if (and only if) the result is a real
 * calendar date within [minYear, maxYear]. Returns '' otherwise.
 */
function combineParts(parts: Parts, minYear: number, maxYear: number): string {
    const { year, month, day } = parts
    if (!year || !month || !day) return ''

    const y = parseInt(year, 10)
    const m = parseInt(month, 10)
    const d = parseInt(day, 10)

    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ''
    if (y < minYear || y > maxYear) return ''
    if (m < 1 || m > 12) return ''
    if (d < 1 || d > daysInMonth(y, m)) return ''

    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function DateOfBirthInput({
    value,
    onChange,
    name,
    minYear = 1900,
    maxYear = new Date().getFullYear(),
    hasError = false,
    disabled = false,
    idPrefix = 'dob',
}: DateOfBirthInputProps) {
    const [parts, setParts] = useState<Parts>(() => splitIso(value))

    // If parent value changes externally (e.g., form reset, edit-modal hydration),
    // sync our local parts. Track the last value we *consumed* so our own
    // keystrokes don't get clobbered when value round-trips back as the same string.
    const lastSyncedValueRef = useRef(value)
    useEffect(() => {
        if (value !== lastSyncedValueRef.current) {
            lastSyncedValueRef.current = value
            setParts(splitIso(value))
        }
    }, [value])

    const monthId = `${idPrefix}-month`
    const dayId = `${idPrefix}-day`
    const yearId = `${idPrefix}-year`

    const errorClass = hasError ? ' input-error' : ''

    const update = (next: Parts) => {
        setParts(next)
        onChange(combineParts(next, minYear, maxYear))
    }

    // Memoize day max so an invalid Feb 30 immediately rejects rather than
    // silently storing 30 with month=02.
    const dayMax = useMemo(() => {
        const y = parseInt(parts.year, 10) || 2000
        const m = parseInt(parts.month, 10) || 1
        return daysInMonth(y, m)
    }, [parts.year, parts.month])

    return (
        <div className="dob-input-row" role="group" aria-label="Date of birth">
            <div className="dob-field dob-field-month">
                <label htmlFor={monthId} className="dob-sublabel">Month</label>
                <select
                    id={monthId}
                    value={parts.month}
                    onChange={(e) => update({ ...parts, month: e.target.value })}
                    disabled={disabled}
                    className={`form-input-basic${errorClass}`}
                    aria-invalid={hasError || undefined}
                >
                    <option value="">MM</option>
                    {MONTHS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>
            </div>
            <div className="dob-field dob-field-day">
                <label htmlFor={dayId} className="dob-sublabel">Day</label>
                <input
                    id={dayId}
                    name={name}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    min={1}
                    max={dayMax}
                    placeholder="DD"
                    value={parts.day}
                    onChange={(e) => {
                        // Trim to 2 digits to keep the field tidy without blocking valid 1-31.
                        const v = e.target.value.replace(/\D/g, '').slice(0, 2)
                        update({ ...parts, day: v })
                    }}
                    disabled={disabled}
                    className={`form-input-basic${errorClass}`}
                    aria-invalid={hasError || undefined}
                />
            </div>
            <div className="dob-field dob-field-year">
                <label htmlFor={yearId} className="dob-sublabel">Year</label>
                <input
                    id={yearId}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    min={minYear}
                    max={maxYear}
                    placeholder="YYYY"
                    value={parts.year}
                    onChange={(e) => {
                        // 4-digit cap only — never silently expand to "0066".
                        const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                        update({ ...parts, year: v })
                    }}
                    disabled={disabled}
                    className={`form-input-basic${errorClass}`}
                    aria-invalid={hasError || undefined}
                />
            </div>
        </div>
    )
}
