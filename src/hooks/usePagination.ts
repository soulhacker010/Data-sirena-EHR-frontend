import { useState, useMemo, useCallback } from 'react'

interface UsePaginationOptions {
    totalItems: number
    pageSize?: number
    initialPage?: number
}

interface UsePaginationReturn<T> {
    currentPage: number
    totalPages: number
    pageSize: number
    startIndex: number
    endIndex: number
    goToPage: (page: number) => void
    nextPage: () => void
    prevPage: () => void
    paginatedItems: (items: T[]) => T[]
    canGoNext: boolean
    canGoPrev: boolean
}

export function usePagination<T = unknown>({
    totalItems,
    pageSize = 25,
    initialPage = 1,
}: UsePaginationOptions): UsePaginationReturn<T> {
    const [currentPage, setCurrentPage] = useState(initialPage)

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(totalItems / pageSize)),
        [totalItems, pageSize]
    )

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, totalItems)

    const goToPage = useCallback(
        (page: number) => {
            setCurrentPage(Math.max(1, Math.min(page, totalPages)))
        },
        [totalPages]
    )

    const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage])
    const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage])

    const paginatedItems = useCallback(
        (items: T[]) => items.slice(startIndex, endIndex),
        [startIndex, endIndex]
    )

    return {
        currentPage,
        totalPages,
        pageSize,
        startIndex,
        endIndex,
        goToPage,
        nextPage,
        prevPage,
        paginatedItems,
        canGoNext: currentPage < totalPages,
        canGoPrev: currentPage > 1,
    }
}
