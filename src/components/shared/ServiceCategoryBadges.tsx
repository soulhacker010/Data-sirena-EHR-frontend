/**
 * ServiceCategoryBadges (E21) — read-only chip row showing every service
 * category the client is enrolled in (Psych, OT, Speech, etc.). Used on
 * client lists and the client-detail header so billing/admin can scan a list
 * and tell at a glance which service applies to whom.
 *
 * Renders nothing when the client has no categories (avoids visual noise).
 */
import { SERVICE_CATEGORY_OPTIONS, type ServiceCategory } from '../../types/client'

interface Props {
    categories: ServiceCategory[] | undefined
    /** Use full label vs short abbreviation. Default: short. */
    long?: boolean
    className?: string
}

export default function ServiceCategoryBadges({ categories, long = false, className }: Props) {
    if (!categories || categories.length === 0) return null

    return (
        <span className={`service-category-badges${className ? ` ${className}` : ''}`}>
            {categories.map(cat => {
                const opt = SERVICE_CATEGORY_OPTIONS.find(o => o.value === cat)
                if (!opt) return null
                return (
                    <span
                        key={cat}
                        className="service-category-badge"
                        style={{ backgroundColor: opt.bg, color: opt.color }}
                        title={opt.label}
                    >
                        {long ? opt.label : opt.short}
                    </span>
                )
            })}
        </span>
    )
}
