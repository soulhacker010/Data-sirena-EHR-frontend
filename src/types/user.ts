export type UserRole = 'admin' | 'clinician' | 'supervisor' | 'biller' | 'front_desk'

export interface Organization {
    id: string
    name: string
    tax_id?: string
    contact_email?: string
    contact_phone?: string
    address?: string
    created_at: string
    updated_at: string
}

export interface User {
    id: string
    organization_id: string
    organization_name?: string
    email: string
    first_name: string
    last_name: string
    role: UserRole
    phone?: string
    licenses?: string[]
    credentials?: string
    is_active: boolean
    is_supervisor: boolean
    last_login?: string
    created_at: string
    updated_at: string
}

export interface AuthUser {
    id: string
    email: string
    first_name: string
    last_name: string
    role: UserRole
    organization_id: string
    organization_name: string
}

export interface LoginRequest {
    email: string
    password: string
}

export interface LoginResponse {
    access: string
    refresh: string
    user: AuthUser
}

export interface TokenRefreshRequest {
    refresh: string
}

export interface TokenRefreshResponse {
    access: string
}

export interface ChangePasswordRequest {
    current_password: string
    new_password: string
    confirm_password: string
}

export interface CreateUserPayload {
    email: string
    first_name: string
    last_name: string
    role: UserRole
    phone?: string
    is_supervisor?: boolean
}

export interface UpdateUserPayload extends Partial<CreateUserPayload> {
    is_active?: boolean
}
