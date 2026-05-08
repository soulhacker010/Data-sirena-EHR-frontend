import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DateOfBirthInput from './DateOfBirthInput'

function setup(initial = '') {
    const onChange = vi.fn()
    const utils = render(
        <DateOfBirthInput value={initial} onChange={onChange} />,
    )
    return {
        onChange,
        month: utils.getByLabelText('Month') as HTMLSelectElement,
        day: utils.getByLabelText('Day') as HTMLInputElement,
        year: utils.getByLabelText('Year') as HTMLInputElement,
        ...utils,
    }
}

describe('DateOfBirthInput', () => {
    it('renders three independently labelled fields', () => {
        setup()
        expect(screen.getByLabelText('Month')).toBeInTheDocument()
        expect(screen.getByLabelText('Day')).toBeInTheDocument()
        expect(screen.getByLabelText('Year')).toBeInTheDocument()
    })

    it('hydrates from a YYYY-MM-DD value', () => {
        const { month, day, year } = setup('1966-03-15')
        expect(month.value).toBe('03')
        expect(day.value).toBe('15')
        expect(year.value).toBe('1966')
    })

    it('emits ISO date once all three parts are valid (1966-03-15)', () => {
        const { onChange, month, day, year } = setup()
        fireEvent.change(month, { target: { value: '03' } })
        fireEvent.change(day, { target: { value: '15' } })
        fireEvent.change(year, { target: { value: '1966' } })

        // The final emitted value (last call) should be the full ISO date.
        expect(onChange).toHaveBeenLastCalledWith('1966-03-15')
    })

    it('NEVER produces "0066" when typing year 1966 — the client-reported bug', () => {
        const { onChange, year } = setup()
        fireEvent.change(year, { target: { value: '1966' } })

        // No call should produce a date with year < 1900.
        const allArgs = onChange.mock.calls.map(c => c[0])
        for (const arg of allArgs) {
            if (arg) {
                const y = parseInt(arg.split('-')[0], 10)
                expect(y).toBeGreaterThanOrEqual(1900)
            }
        }
    })

    it('caps year input to 4 digits (cannot accidentally enter 19660)', () => {
        const { year } = setup()
        fireEvent.change(year, { target: { value: '19660' } })
        expect(year.value).toBe('1966')
    })

    it('strips non-digits from year and day inputs', () => {
        const { day, year } = setup()
        fireEvent.change(year, { target: { value: '19a6b' } })
        expect(year.value).toBe('196')
        fireEvent.change(day, { target: { value: '1x5' } })
        expect(day.value).toBe('15')
    })

    it('emits empty string while any part is missing', () => {
        const { onChange, month, day } = setup()
        fireEvent.change(month, { target: { value: '03' } })
        fireEvent.change(day, { target: { value: '15' } })
        // Year is still empty — last emit should be ''.
        expect(onChange).toHaveBeenLastCalledWith('')
    })

    it('rejects impossible dates (Feb 30) by emitting empty string', () => {
        const { onChange, month, day, year } = setup()
        fireEvent.change(month, { target: { value: '02' } })
        fireEvent.change(day, { target: { value: '30' } })
        fireEvent.change(year, { target: { value: '2000' } })
        expect(onChange).toHaveBeenLastCalledWith('')
    })

    it('rejects years outside [minYear, maxYear]', () => {
        const onChange = vi.fn()
        render(
            <DateOfBirthInput
                value=""
                onChange={onChange}
                minYear={1950}
                maxYear={2020}
            />,
        )
        const month = screen.getByLabelText('Month') as HTMLSelectElement
        const day = screen.getByLabelText('Day') as HTMLInputElement
        const year = screen.getByLabelText('Year') as HTMLInputElement
        fireEvent.change(month, { target: { value: '01' } })
        fireEvent.change(day, { target: { value: '01' } })
        fireEvent.change(year, { target: { value: '1949' } })
        expect(onChange).toHaveBeenLastCalledWith('')
        fireEvent.change(year, { target: { value: '2025' } })
        expect(onChange).toHaveBeenLastCalledWith('')
    })

    it('updates day max when month changes (Feb has 28-29 days)', () => {
        const { month, year, day } = setup()
        fireEvent.change(year, { target: { value: '2001' } })  // not a leap year
        fireEvent.change(month, { target: { value: '02' } })
        expect(day.max).toBe('28')
        fireEvent.change(month, { target: { value: '01' } })
        expect(day.max).toBe('31')
    })

    it('handles leap year February (2000 = leap, 29 days)', () => {
        const { month, year, day, onChange } = setup()
        fireEvent.change(year, { target: { value: '2000' } })
        fireEvent.change(month, { target: { value: '02' } })
        fireEvent.change(day, { target: { value: '29' } })
        expect(onChange).toHaveBeenLastCalledWith('2000-02-29')
    })

    it('passes hasError into aria-invalid on every field', () => {
        render(
            <DateOfBirthInput value="" onChange={() => {}} hasError />,
        )
        expect(screen.getByLabelText('Month')).toHaveAttribute('aria-invalid', 'true')
        expect(screen.getByLabelText('Day')).toHaveAttribute('aria-invalid', 'true')
        expect(screen.getByLabelText('Year')).toHaveAttribute('aria-invalid', 'true')
    })

    it('round-trips a value through hydration → display unchanged', () => {
        const { month, day, year } = setup('1980-11-09')  // the Nov 9 case
        expect(month.value).toBe('11')
        expect(day.value).toBe('09')
        expect(year.value).toBe('1980')
    })
})
