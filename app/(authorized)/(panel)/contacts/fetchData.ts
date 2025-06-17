import { Database } from "@/lib/database.types"
import ContactBrowserFactory from "@/lib/repositories/contacts/ContactBrowserFactory"
import { ContactFilterArray } from "@/lib/repositories/contacts/ContactRepository"
import { SupabaseClient } from "@supabase/supabase-js"
import { AdvancedFilterOptions } from "@/components/contacts/AdvancedFilters"
import { convertAdvancedFiltersToRepository } from "@/lib/contacts/filterUtils"

export const itemsPerPage = 10

export async function fetchData(supabase: SupabaseClient<Database>, options: {
    pageIndex: number
    pageSize: number
    searchFilter?: string
    advancedFilters?: AdvancedFilterOptions
}) {
    const contactRepository = ContactBrowserFactory.getInstance(supabase)
    const limit = options.pageSize;
    const offset = options.pageSize * options.pageIndex;
    
    let filters: ContactFilterArray = []
    
    // Legacy search filter (keeping for backward compatibility)
    if (options.searchFilter?.trim()) {
        filters.push({
            column: "profile_name",
            operator: "ilike",
            value: `%${options.searchFilter.trim()}%`
        })
    }
    
    // Advanced filters
    if (options.advancedFilters) {
        const advancedFilters = convertAdvancedFiltersToRepository(options.advancedFilters)
        filters = [...filters, ...advancedFilters]
    }
    
    const result = await contactRepository.getContacts(
        filters.length > 0 ? filters : undefined,
        { column: 'created_at', options: { ascending: false } },
        { limit: limit, offset: offset},
        true,
    )
    const pageCount = result.itemsCount ? Math.ceil(result.itemsCount / itemsPerPage) : -1;
    return {
        rows: result.rows,
        pageCount
    }
}

export async function getContactCounts(supabase: SupabaseClient<Database>) {
    const contactRepository = ContactBrowserFactory.getInstance(supabase)
    
    // Get total count
    const totalResult = await contactRepository.getContacts(
        undefined,
        undefined,
        undefined,
        true
    )
    
    // Get active count (last 24 hours)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const activeResult = await contactRepository.getContacts(
        [{ column: "last_message_at", operator: "gte", value: yesterday.toISOString() }],
        undefined,
        undefined,
        true
    )
    
    // Get inactive count
    const inactiveResult = await contactRepository.getContacts(
        [{ column: "last_message_at", operator: "lt", value: yesterday.toISOString() }],
        undefined,
        undefined,
        true
    )
    
    // Get untagged count
    const untaggedResult = await contactRepository.getContacts(
        [{ column: "tags", operator: "is", value: null }],
        undefined,
        undefined,
        true
    )
    
    return {
        total: totalResult.itemsCount || 0,
        active: activeResult.itemsCount || 0,
        inactive: inactiveResult.itemsCount || 0,
        untagged: untaggedResult.itemsCount || 0
    }
}