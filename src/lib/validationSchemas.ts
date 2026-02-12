import { z } from 'zod'

// Login form
export const loginSchema = z.object({
    email: z.string()
        .min(1, 'Email is required')
        .email('Please enter a valid email'),
    password: z.string()
        .min(1, 'Password is required')
        .min(6, 'Password must be at least 6 characters'),
    rememberMe: z.boolean().optional()
})

export type LoginFormData = z.infer<typeof loginSchema>

// Client form
export const clientSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    gender: z.string().min(1, 'Gender is required'),
    phone: z.string()
        .min(1, 'Phone number is required')
        .regex(/^[\d\s\-\(\)\+]+$/, 'Please enter a valid phone number'),
    email: z.string()
        .email('Please enter a valid email')
        .or(z.literal('')),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    insuranceName: z.string().optional(),
    memberId: z.string().optional(),
    groupNumber: z.string().optional()
})

export type ClientFormData = z.infer<typeof clientSchema>

// User form
export const userSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string()
        .min(1, 'Email is required')
        .email('Please enter a valid email'),
    role: z.string().min(1, 'Role is required'),
    phone: z.string().optional(),
    status: z.string().optional()
})

export type UserFormData = z.infer<typeof userSchema>

// Payment form
export const paymentSchema = z.object({
    amount: z.number({ error: 'Amount is required' })
        .positive('Amount must be greater than 0'),
    method: z.string().min(1, 'Payment method is required'),
    reference: z.string().optional(),
    notes: z.string().optional()
})

export type PaymentFormData = z.infer<typeof paymentSchema>

// Password change form
export const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
        .min(1, 'New password is required')
        .min(8, 'Password must be at least 8 characters')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
})

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>
