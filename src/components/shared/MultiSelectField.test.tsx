import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MultiSelectField from './MultiSelectField'

const OPTS = ['Within Normal Limits (WNL)', 'Anxious', 'Tearful', 'Other (specify)']

function setup(initialValue: string[] | string | undefined = undefined) {
    const onChange = vi.fn()
    const utils = render(
        <MultiSelectField options={OPTS} value={initialValue} onChange={onChange} />,
    )
    return { onChange, ...utils }
}

describe('MultiSelectField', () => {
    it('renders empty when no value', () => {
        setup()
        expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull()
    })

    it('coerces a single legacy string into one chip', () => {
        // Backwards compat with old notes that stored a string.
        setup('Anxious')
        expect(screen.getByText('Anxious')).toBeInTheDocument()
    })

    it('renders a chip per selected value', () => {
        setup(['Anxious', 'Tearful'])
        expect(screen.getByText('Anxious')).toBeInTheDocument()
        expect(screen.getByText('Tearful')).toBeInTheDocument()
    })

    it('adds a predefined option via the dropdown', () => {
        const { onChange } = setup([])
        const select = screen.getByRole('combobox')
        fireEvent.change(select, { target: { value: 'Anxious' } })
        expect(onChange).toHaveBeenLastCalledWith(['Anxious'])
    })

    it('appends, not replaces, when adding from the dropdown', () => {
        const { onChange } = setup(['Tearful'])
        const select = screen.getByRole('combobox')
        fireEvent.change(select, { target: { value: 'Anxious' } })
        expect(onChange).toHaveBeenLastCalledWith(['Tearful', 'Anxious'])
    })

    it('removes a chip via the X button', () => {
        const { onChange } = setup(['Anxious', 'Tearful'])
        const removeBtn = screen.getByRole('button', { name: 'Remove Anxious' })
        fireEvent.click(removeBtn)
        expect(onChange).toHaveBeenLastCalledWith(['Tearful'])
    })

    it('adds a custom typed value on Enter', () => {
        const { onChange } = setup([])
        const input = screen.getByPlaceholderText(/Type a custom value/) as HTMLInputElement
        fireEvent.change(input, { target: { value: 'feeling out of sorts' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(onChange).toHaveBeenLastCalledWith(['feeling out of sorts'])
    })

    it('clears the input after adding custom text', () => {
        setup([])
        const input = screen.getByPlaceholderText(/Type a custom value/) as HTMLInputElement
        fireEvent.change(input, { target: { value: 'custom' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(input.value).toBe('')
    })

    it('dedupes when adding the same value twice', () => {
        const { onChange } = setup(['Anxious'])
        const select = screen.getByRole('combobox')
        // Already-selected options are filtered out — assert that's the case.
        const optionTexts = Array.from(select.querySelectorAll('option')).map(o => o.textContent)
        expect(optionTexts).not.toContain('Anxious')
        // And from the typed-text path, dedupe is enforced.
        const input = screen.getByPlaceholderText(/Type a custom value/) as HTMLInputElement
        fireEvent.change(input, { target: { value: 'Anxious' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(onChange).not.toHaveBeenCalled()
    })

    it('ignores blank/whitespace custom input', () => {
        const { onChange } = setup([])
        const input = screen.getByPlaceholderText(/Type a custom value/) as HTMLInputElement
        fireEvent.change(input, { target: { value: '   ' } })
        fireEvent.keyDown(input, { key: 'Enter' })
        expect(onChange).not.toHaveBeenCalled()
    })

    it('disables controls when disabled prop is true', () => {
        render(
            <MultiSelectField
                options={OPTS}
                value={['Anxious']}
                onChange={() => {}}
                disabled
            />,
        )
        expect(screen.getByRole('combobox')).toBeDisabled()
        expect(screen.getByPlaceholderText(/Type a custom value/)).toBeDisabled()
        // Chip remove button is hidden when disabled.
        expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull()
    })
})
