export interface Paginated<T> {
    total: number
    data: T[]
    meta: {
        currentPage: number
        allPages: number
        itemsPerPage: number
        allItems: number
    }
    links: {
        firstPage: string
        lastPage: string
        currentPage: string
        nextPage: string
        previousPage: string
    }
}