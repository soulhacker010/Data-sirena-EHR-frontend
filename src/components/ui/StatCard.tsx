import type { ElementType } from 'react'

interface StatCardProps {
    title: string
    value: string | number
    subtitle?: string
    icon?: ElementType
    trend?: {
        value: number
        isPositive: boolean
    }
    className?: string
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend, className = '' }: StatCardProps) {
    return (
        <div className={`stat-card ${className}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 font-medium">{title}</p>
                    <p className="stat-card-value mt-1">{value}</p>
                    {subtitle && (
                        <p className="stat-card-label">{subtitle}</p>
                    )}
                    {trend && (
                        <p className={`text-sm mt-2 font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                            <span className="text-gray-500 font-normal ml-1">vs last month</span>
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-cyan-600" />
                    </div>
                )}
            </div>
        </div>
    )
}
