import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import { MagnifyingGlass, Export } from '@phosphor-icons/react'

interface DashboardLayoutProps {
    children: ReactNode
    title?: string
}

export default function DashboardLayout({ children, title: _title = 'Dashboard' }: DashboardLayoutProps) {
    return (
        <div className="app-layout">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="app-main">
                {/* Top Header */}
                <header className="app-header">
                    {/* Search */}
                    <div className="header-search" role="search">
                        <MagnifyingGlass size={18} weight="regular" className="text-gray-400" aria-hidden="true" />
                        <input type="text" placeholder="Search keywords..." aria-label="Search" />
                    </div>

                    {/* Right Actions */}
                    <div className="header-actions">
                        <select className="header-select" aria-label="Time period">
                            <option>Week</option>
                            <option>Month</option>
                            <option>Year</option>
                        </select>
                        <button className="header-export-btn" aria-label="Export data">
                            <Export size={16} weight="bold" />
                            Export
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="app-content">
                    {children}
                </main>
            </div>
        </div>
    )
}
