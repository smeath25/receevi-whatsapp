import { DBTables } from "@/lib/enums/Tables";
import { createClient as createBrowserClient } from "@/utils/supabase-browser";
import { Contact } from "../../../types/contact";
import { ContactColumnName, ContactFilterArray, ContactFromDB, ContactRepository, ContactUpdate } from "./ContactRepository";

type SupabaseClientType = ReturnType<typeof createBrowserClient>

export class ContactRepositorySupabaseImpl implements ContactRepository {
    private client;
    constructor(client: SupabaseClientType) {
        this.client = client;
    }
    async getContacts(
        filters?: ContactFilterArray,
        order?: {
            column: ContactColumnName,
            options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: undefined }
        },
        paginationOptions?: { limit: number, offset: number },
        fetchCount?: boolean,
    ): Promise<{ rows: Contact[], itemsCount: number | null }> {
        let selectOptions = {}
        if (fetchCount) {
            selectOptions = { count: 'exact' }
        }
        let query = this.client
            .from(DBTables.Contacts)
            .select('*', selectOptions)
        if (filters) {
            for (const filter of filters) {
                query = query.filter(filter.column, filter.operator, filter.value)
            }
        }
        if (order) {
            query = query.order(order.column, order.options)
        }
        if (paginationOptions) {
            const from = paginationOptions.offset
            const to = from + paginationOptions.limit - 1
            query.range(from, to)
        }
        const result = await query
        if (result.error) throw result.error
        return {
            rows: result.data,
            itemsCount: result.count,
        }
    }

    async getContactsHavingTag(tags: string[]): Promise<ContactFromDB[]> {
        const { data, error } = await this.client
            .from('contacts')
            .select('*')
            .overlaps('tags', tags)
        if (error) throw error
        return data
    }

    async getContactById(contactId: string): Promise<ContactFromDB> {
        const { data, error } = await this.client
            .from('contacts')
            .select('*')
            .eq('wa_id', contactId)
        if (error) throw error
        return data && data[0]
    }

    async updateContact(wa_id: number, updates: Omit<ContactUpdate, 'wa_id'>): Promise<ContactFromDB> {
        // Use API route for consistency and better error handling
        const response = await fetch(`/api/contacts/${wa_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to update contact')
        }

        const result = await response.json()
        return result.contact
    }
}