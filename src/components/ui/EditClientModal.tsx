import { useState, useEffect } from 'react'
import Modal from './Modal'
import { clientSchema } from '../../lib/validationSchemas'
import {
    User,
    Phone,
    ShieldCheck
} from '@phosphor-icons/react'

interface EditClientModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit?: (clientData: ClientFormData) => void
    clientData: ClientFormData | null
}

export interface ClientFormData {
    id?: number
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
    groupNumber: ''
}

export default function EditClientModal({ isOpen, onClose, onSubmit, clientData }: EditClientModalProps) {
    const [formData, setFormData] = useState<ClientFormData>(initialFormData)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Populate form when clientData changes
    useEffect(() => {
        if (clientData) {
            setFormData(clientData)
            setErrors({})
        } else {
            setFormData(initialFormData)
        }
    }, [clientData])

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
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (onSubmit) {
            onSubmit(formData)
        }

        setIsSubmitting(false)
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Client" size="lg">
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
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                className={`form-input-basic${errors.dateOfBirth ? ' input-error' : ''}`}
                            />
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
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="form-input-basic"
                                placeholder="CA"
                            />
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
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
