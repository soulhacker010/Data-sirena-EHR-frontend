/**
 * Role-based permission configuration for the Sirena Health EHR frontend.
 *
 * ⚠️  These roles MUST stay in sync with the backend DRF permission classes
 *     in apps/core/permissions.py. Here is the exact backend mapping:
 *
 *   Backend Class            → Allowed Roles
 *   ─────────────────────────────────────────────────────────────
 *   IsAdmin                  → admin
 *   IsSupervisorOrAbove      → admin, supervisor
 *   IsClinician              → admin, supervisor, clinician
 *   IsClinicalStaff          → admin, supervisor, clinician
 *   IsBiller                 → admin, biller
 *   IsFrontDesk              → admin, supervisor, clinician, front_desk
 *   IsAnyAuthenticated       → all
 *
 *   Backend View Assignments:
 *   ─────────────────────────────────────────────────────────────
 *   apps/accounts/views.py   → UserViewSet:          IsAdmin
 *   apps/audit/views.py      → AuditLogViewSet:      IsAdmin
 *   apps/billing/views.py    → InvoiceViewSet:       IsBiller
 *   apps/billing/views.py    → ClaimViewSet:         IsBiller
 *   apps/billing/views.py    → PaymentViewSet:       IsBiller
 *   apps/billing/views.py    → SuperBillViewSet:     IsClinicalStaff
 *   apps/clinical/views.py   → SessionNoteViewSet:   IsClinicalStaff
 *   apps/clinical/views.py   → TemplateViewSet:      IsClinicalStaff
 *   apps/clinical/views.py   → CoSignViewSet:        IsClinicalStaff
 *   apps/clients/views.py    → ClientViewSet:        IsFrontDesk
 *   apps/clients/views.py    → AuthorizationViewSet: IsFrontDesk
 *   apps/clients/views.py    → DocumentViewSet:      IsFrontDesk
 *   apps/reports/views.py    → All report views:     IsSupervisorOrAbove
 *   apps/scheduling/views.py → AppointmentViewSet:   IsFrontDesk
 */

import type { UserRole } from '../types'

// ─── Role Groups (matching backend permission classes exactly) ──────────────

/** IsAnyAuthenticated — all roles */
export const ALL_ROLES: UserRole[] = ['admin', 'supervisor', 'clinician', 'biller', 'front_desk']

/** IsClinician / IsClinicalStaff — clinical staff */
export const CLINICAL_ROLES: UserRole[] = ['admin', 'supervisor', 'clinician']

/** IsBiller — billing staff (admin + biller, NOT supervisor) */
export const BILLING_ROLES: UserRole[] = ['admin', 'biller']

/** IsSupervisorOrAbove — reports, oversight (admin + supervisor only) */
export const SUPERVISOR_ROLES: UserRole[] = ['admin', 'supervisor']

/** IsFrontDesk — scheduling, client intake (everyone except biller) */
export const SCHEDULING_ROLES: UserRole[] = ['admin', 'supervisor', 'clinician', 'front_desk']

/** IsAdmin — admin only */
export const ADMIN_ONLY: UserRole[] = ['admin']

// ─── Route Permission Map ────────────────────────────────────────────────────
// Maps route path prefixes to allowed roles.
// Order matters: more specific paths should come first.

interface RoutePermission {
    path: string
    roles: UserRole[]
}

const routePermissions: RoutePermission[] = [
    // Admin pages — IsAdmin
    { path: '/admin/users', roles: ADMIN_ONLY },
    { path: '/admin/audit', roles: ADMIN_ONLY },
    { path: '/settings', roles: ADMIN_ONLY },

    // Billing pages — IsBiller (admin + biller)
    { path: '/billing', roles: BILLING_ROLES },

    // Reports — IsSupervisorOrAbove (admin + supervisor)
    { path: '/reports', roles: SUPERVISOR_ROLES },

    // Clinical pages — IsClinicalStaff (admin + supervisor + clinician)
    { path: '/notes', roles: CLINICAL_ROLES },

    // Scheduling — IsFrontDesk (everyone except biller)
    { path: '/calendar', roles: SCHEDULING_ROLES },

    // Universal pages — IsAnyAuthenticated
    { path: '/dashboard', roles: ALL_ROLES },
    { path: '/clients', roles: SCHEDULING_ROLES },  // IsFrontDesk in backend
    { path: '/notifications', roles: ALL_ROLES },
]

/**
 * Check if a user with the given role can access a path.
 * Returns true if no specific rule exists (fail-open for unlisted routes).
 */
export function canAccess(role: UserRole, path: string): boolean {
    const rule = routePermissions.find(r => path === r.path || path.startsWith(r.path + '/'))
    if (!rule) return true
    return rule.roles.includes(role)
}

/**
 * Get the allowed roles for a given route path.
 */
export function getAllowedRoles(path: string): UserRole[] | undefined {
    const rule = routePermissions.find(r => path === r.path || path.startsWith(r.path + '/'))
    return rule?.roles
}
