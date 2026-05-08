import { useState } from 'react'
import Modal from './Modal'
import DateOfBirthInput from '../shared/DateOfBirthInput'
import { clientSchema } from '../../lib/validationSchemas'
import { calculateAge } from '../../utils/dates'
import {
    User,
    Phone,
    ShieldCheck
} from '@phosphor-icons/react'

interface AddClientModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit?: (clientData: ClientFormData) => Promise<void>
}

import { SERVICE_CATEGORY_OPTIONS, type ServiceCategory } from '../../types/client'

interface ClientFormData {
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
    phone: string
    email: string
    address: string
    city: string
    state: string
    zipCode: string
    insuranceName: string
    memberId: string
    groupNumber: string
    serviceCategories: ServiceCategory[]
}

const initialFormData: ClientFormData = {
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    insuranceName: '',
    memberId: '',
    groupNumber: '',
    serviceCategories: [],
}

export default function AddClientModal({ isOpen, onClose, onSubmit }: AddClientModalProps) {
    const [formData, setFormData] = useState<ClientFormData>(initialFormData)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors(prev => {
                const next = { ...prev }
                delete next[name]
                return next
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const result = clientSchema.safeParse(formData)
        if (!result.success) {
            const fieldErrors: Record<string, string> = {}
            result.error.issues.forEach((err) => {
                const field = err.path[0] as string
                if (!fieldErrors[field]) fieldErrors[field] = err.message
            })
            setErrors(fieldErrors)
            return
        }

        setIsSubmitting(true)
        try {
            if (onSubmit) {
                await onSubmit(formData)
            }
            setFormData(initialFormData)
            setErrors({})
        } catch {
            // Error handling is done in the parent (ClientsPage)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setFormData(initialFormData)
        setErrors({})
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add New Client" size="lg">
            <form onSubmit={handleSubmit} className="client-form" noValidate>
                {/* Personal Information Section */}
                <div className="form-section">
                    <div className="form-section-header">
                        <User size={20} weight="duotone" />
                        <h3>Personal Information</h3>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">First Name *</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                className={`form-input-basic${errors.firstName ? ' input-error' : ''}`}
                                placeholder="Enter first name"
                            />
                            {errors.firstName && <span className="field-error">{errors.firstName}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Last Name *</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                className={`form-input-basic${errors.lastName ? ' input-error' : ''}`}
                                placeholder="Enter last name"
                            />
                            {errors.lastName && <span className="field-error">{errors.lastName}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Date of Birth *</label>
                            <DateOfBirthInput
                                value={formData.dateOfBirth}
                                onChange={(iso) =>
                                    setFormData(prev => ({ ...prev, dateOfBirth: iso }))
                                }
                                hasError={Boolean(errors.dateOfBirth)}
                                idPrefix="add-client-dob"
                            />
                            {formData.dateOfBirth && (
                                <span className="field-hint">Age: {calculateAge(formData.dateOfBirth)} years</span>
                            )}
                            {errors.dateOfBirth && <span className="field-error">{errors.dateOfBirth}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Gender *</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className={`form-input-basic${errors.gender ? ' input-error' : ''}`}
                            >
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                                <option value="prefer-not">Prefer not to say</option>
                            </select>
                            {errors.gender && <span className="field-error">{errors.gender}</span>}
                        </div>
                    </div>
                </div>

                {/* Contact Information Section */}
                <div className="form-section">
                    <div className="form-section-header">
                        <Phone size={20} weight="duotone" />
                        <h3>Contact Information</h3>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Phone Number *</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className={`form-input-basic${errors.phone ? ' input-error' : ''}`}
                                placeholder="(555) 123-4567"
                            />
                            {errors.phone && <span className="field-error">{errors.phone}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`form-input-basic${errors.email ? ' input-error' : ''}`}
                                placeholder="email@example.com"
                            />
                            {errors.email && <span className="field-error">{errors.email}</span>}
                        </div>

                        <div className="form-group col-span-2">
                            <label className="form-label">Street Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="form-input-basic"
                                placeholder="123 Main Street"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">City</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="form-input-basic"
                                placeholder="Los Angeles"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">State</label>
                            <select
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="form-input-basic"
                            >
                                <option value="">Select state</option>
                                <option value="AL">AL</option><option value="AK">AK</option><option value="AZ">AZ</option><option value="AR">AR</option>
                                <option value="CA">CA</option><option value="CO">CO</option><option value="CT">CT</option><option value="DE">DE</option>
                                <option value="FL">FL</option><option value="GA">GA</option><option value="HI">HI</option><option value="ID">ID</option>
                                <option value="IL">IL</option><option value="IN">IN</option><option value="IA">IA</option><option value="KS">KS</option>
                                <option value="KY">KY</option><option value="LA">LA</option><option value="ME">ME</option><option value="MD">MD</option>
                                <option value="MA">MA</option><option value="MI">MI</option><option value="MN">MN</option><option value="MS">MS</option>
                                <option value="MO">MO</option><option value="MT">MT</option><option value="NE">NE</option><option value="NV">NV</option>
                                <option value="NH">NH</option><option value="NJ">NJ</option><option value="NM">NM</option><option value="NY">NY</option>
                                <option value="NC">NC</option><option value="ND">ND</option><option value="OH">OH</option><option value="OK">OK</option>
                                <option value="OR">OR</option><option value="PA">PA</option><option value="RI">RI</option><option value="SC">SC</option>
                                <option value="SD">SD</option><option value="TN">TN</option><option value="TX">TX</option><option value="UT">UT</option>
                                <option value="VT">VT</option><option value="VA">VA</option><option value="WA">WA</option><option value="WV">WV</option>
                                <option value="WI">WI</option><option value="WY">WY</option><option value="DC">DC</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">ZIP Code</label>
                            <input
                                type="text"
                                name="zipCode"
                                value={formData.zipCode}
                                onChange={handleChange}
                                className="form-input-basic"
                                placeholder="90001"
                            />
                        </div>
                    </div>
                </div>

                {/* E21 — Service Categories */}
                <div className="form-section">
                    <div className="form-section-header">
                        <User size={20} weight="duotone" />
                        <h3>Service Categories</h3>
                    </div>
                    <p className="form-hint" style={{ marginBottom: '0.5rem' }}>
                        Pick every service this client receives. Lists and the client header
                        will show colored chips so billing/admin can scan at a glance.
                    </p>
                    <div className="service-category-picker">
                        {SERVICE_CATEGORY_OPTIONS.map(opt => {
                            const checked = formData.serviceCategories.includes(opt.value)
                            return (
                                <label
                                    key={opt.value}
                                    className={`service-category-pick${checked ? ' checked' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                serviceCategories: checked
                                                    ? prev.serviceCategories.filter(c => c !== opt.value)
                                                    : [...prev.serviceCategories, opt.value],
                                            }))
                                        }}
                                    />
                                    <span
                                        className="service-category-badge"
                                        style={{ backgroundColor: opt.bg, color: opt.color }}
                                    >
                                        {opt.short}
                                    </span>
                                    <span>{opt.label}</span>
                                </label>
                            )
                        })}
                    </div>
                </div>

                {/* Insurance Information Section */}
                <div className="form-section">
                    <div className="form-section-header">
                        <ShieldCheck size={20} weight="duotone" />
                        <h3>Insurance Information</h3>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Insurance Provider</label>
                            <input
                                type="text"
                                name="insuranceName"
                                value={formData.insuranceName}
                                onChange={handleChange}
                                className="form-input-basic"
                                placeholder="Blue Cross Blue Shield"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Member ID</label>
                            <input
                                type="text"
                                name="memberId"
                                value={formData.memberId}
                                onChange={handleChange}
                                className="form-input-basic"
                                placeholder="BCB123456789"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Group Number</label>
                            <input
                                type="text"
                                name="groupNumber"
                                value={formData.groupNumber}
                                onChange={handleChange}
                                className="form-input-basic"
                                placeholder="GRP001234"
                            />
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                    <button type="button" onClick={handleClose} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Adding Client...' : 'Add Client'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
