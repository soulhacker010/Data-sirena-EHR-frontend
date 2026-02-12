interface SkeletonProps {
    variant?: 'line' | 'circle' | 'rect'
    width?: string
    height?: string
    className?: string
}

export function Skeleton({ variant = 'line', width, height, className = '' }: SkeletonProps) {
    const baseClass = `skeleton skeleton-${variant}`
    return (
        <div
            className={`${baseClass} ${className}`}
            style={{ width, height }}
        />
    )
}

interface TableSkeletonProps {
    rows?: number
    cols?: number
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
    return (
        <div className="table-skeleton">
            {/* Header */}
            <div className="skeleton-table-header">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={`h-${i}`} height="14px" width={`${60 + Math.random() * 40}%`} />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={`r-${rowIdx}`} className="skeleton-table-row">
                    {Array.from({ length: cols }).map((_, colIdx) => (
                        <Skeleton key={`c-${colIdx}`} height="12px" width={`${40 + Math.random() * 50}%`} />
                    ))}
                </div>
            ))}
        </div>
    )
}

export function CardSkeleton() {
    return (
        <div className="skeleton-card">
            <Skeleton height="16px" width="60%" />
            <Skeleton height="32px" width="40%" />
            <Skeleton height="12px" width="80%" />
        </div>
    )
}

export function PageSkeleton() {
    return (
        <div className="page-skeleton">
            {/* Header skeleton */}
            <div className="skeleton-header">
                <Skeleton height="28px" width="200px" />
                <Skeleton height="14px" width="300px" />
            </div>

            {/* Stats cards */}
            <div className="skeleton-stats-grid">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </div>

            {/* Table */}
            <div className="skeleton-table-container">
                <TableSkeleton rows={6} cols={5} />
            </div>
        </div>
    )
}

export default Skeleton
