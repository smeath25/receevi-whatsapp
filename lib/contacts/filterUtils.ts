import { ContactFilterArray } from "../repositories/contacts/ContactRepository"
import { AdvancedFilterOptions } from "@/components/contacts/AdvancedFilters"

export function convertAdvancedFiltersToRepository(
    advancedFilters: AdvancedFilterOptions
): ContactFilterArray {
    const filters: ContactFilterArray = []

    // Name filter
    if (advancedFilters.name?.trim()) {
        filters.push({
            column: "profile_name",
            operator: "ilike",
            value: `%${advancedFilters.name.trim()}%`
        })
    }

    // Tags filter
    if (advancedFilters.tags && advancedFilters.tags.length > 0) {
        filters.push({
            column: "tags",
            operator: "overlaps",
            value: advancedFilters.tags
        })
    }

    // Activity status filters
    if (advancedFilters.activityStatus) {
        switch (advancedFilters.activityStatus) {
            case 'active':
                // Active contacts are those with messages in the last 24 hours
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                filters.push({
                    column: "last_message_at",
                    operator: "gte",
                    value: yesterday.toISOString()
                })
                break
                
            case 'inactive':
                // Inactive contacts are those without messages in the last 24 hours
                const yesterdayInactive = new Date()
                yesterdayInactive.setDate(yesterdayInactive.getDate() - 1)
                filters.push({
                    column: "last_message_at",
                    operator: "lt",
                    value: yesterdayInactive.toISOString()
                })
                break
                
            case 'untagged':
                // Untagged contacts have null or empty tags array
                filters.push({
                    column: "tags",
                    operator: "is",
                    value: null
                })
                break
        }
    }

    // Date range filter for created_at
    if (advancedFilters.dateRange) {
        if (advancedFilters.dateRange.from) {
            filters.push({
                column: "created_at",
                operator: "gte",
                value: advancedFilters.dateRange.from.toISOString()
            })
        }
        if (advancedFilters.dateRange.to) {
            // Add 1 day to include the entire end date
            const endDate = new Date(advancedFilters.dateRange.to)
            endDate.setDate(endDate.getDate() + 1)
            filters.push({
                column: "created_at",
                operator: "lt",
                value: endDate.toISOString()
            })
        }
    }

    // Last message date range filter
    if (advancedFilters.lastMessageRange) {
        if (advancedFilters.lastMessageRange.from) {
            filters.push({
                column: "last_message_at",
                operator: "gte",
                value: advancedFilters.lastMessageRange.from.toISOString()
            })
        }
        if (advancedFilters.lastMessageRange.to) {
            const endDate = new Date(advancedFilters.lastMessageRange.to)
            endDate.setDate(endDate.getDate() + 1)
            filters.push({
                column: "last_message_at",
                operator: "lt",
                value: endDate.toISOString()
            })
        }
    }

    // Assigned to filter
    if (advancedFilters.assignedTo) {
        filters.push({
            column: "assigned_to",
            operator: "eq",
            value: advancedFilters.assignedTo
        })
    }

    return filters
}

export function getFilterDisplayText(filters: AdvancedFilterOptions): string {
    const parts: string[] = []

    if (filters.name?.trim()) {
        parts.push(`Name: "${filters.name.trim()}"`)
    }

    if (filters.activityStatus && filters.activityStatus !== 'all') {
        const statusMap = {
            active: 'Active (24h)',
            inactive: 'Inactive',
            untagged: 'Untagged'
        }
        parts.push(`Status: ${statusMap[filters.activityStatus]}`)
    }

    if (filters.tags && filters.tags.length > 0) {
        parts.push(`Tags: ${filters.tags.join(', ')}`)
    }

    if (filters.dateRange?.from || filters.dateRange?.to) {
        const from = filters.dateRange.from?.toLocaleDateString() || 'Start'
        const to = filters.dateRange.to?.toLocaleDateString() || 'End'
        parts.push(`Created: ${from} - ${to}`)
    }

    if (filters.assignedTo) {
        parts.push(`Assigned to: ${filters.assignedTo}`)
    }

    return parts.length > 0 ? parts.join(' • ') : 'No filters'
}