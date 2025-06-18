import { DBTables } from "@/lib/enums/Tables";
import { createClient as createBrowserClient } from "@/utils/supabase-browser";
import { createClient as createServerClient } from "@/utils/supabase-server";
import { QuickReply, CreateQuickReplyRequest, UpdateQuickReplyRequest, QuickReplyFilters } from "@/types/quick-reply";
import { QuickReplyRepository } from "./QuickReplyRepository";

type SupabaseClientType = ReturnType<typeof createBrowserClient> | ReturnType<typeof createServerClient>

export class QuickReplyRepositorySupabaseImpl implements QuickReplyRepository {
    private client;
    
    constructor(client: SupabaseClientType) {
        this.client = client;
    }

    async getQuickReplies(
        filters?: QuickReplyFilters,
        paginationOptions?: { limit: number, offset: number },
        fetchCount?: boolean,
    ): Promise<{ rows: QuickReply[], itemsCount: number | null }> {
        let selectOptions = {}
        if (fetchCount) {
            selectOptions = { count: 'exact' }
        }
        
        let query = this.client
            .from(DBTables.QuickReplies)
            .select('*', selectOptions)
            .order('created_at', { ascending: false })

        // Apply filters
        if (filters) {
            if (filters.category) {
                query = query.eq('category', filters.category)
            }
            if (filters.search) {
                query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
            }
            if (filters.is_global !== undefined) {
                query = query.eq('is_global', filters.is_global)
            }
            if (filters.created_by) {
                query = query.eq('created_by', filters.created_by)
            }
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

    async getQuickReplyById(id: string): Promise<QuickReply | null> {
        const { data, error } = await this.client
            .from(DBTables.QuickReplies)
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // Not found
            throw error
        }
        
        return data
    }

    async createQuickReply(quickReply: CreateQuickReplyRequest): Promise<QuickReply> {
        const { data: user } = await this.client.auth.getUser()
        if (!user.user) throw new Error('User not authenticated')

        const { data, error } = await this.client
            .from(DBTables.QuickReplies)
            .insert({
                ...quickReply,
                created_by: user.user.id,
            })
            .select()
            .single()

        if (error) throw error
        return data
    }

    async updateQuickReply(id: string, updates: UpdateQuickReplyRequest): Promise<QuickReply> {
        const { data, error } = await this.client
            .from(DBTables.QuickReplies)
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    }

    async deleteQuickReply(id: string): Promise<boolean> {
        const { error } = await this.client
            .from(DBTables.QuickReplies)
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    }

    async getCategories(): Promise<string[]> {
        const { data, error } = await this.client
            .from(DBTables.QuickReplies)
            .select('category')
            .not('category', 'is', null)

        if (error) throw error

        // Extract unique categories
        const categories = [...new Set(data.map(item => item.category).filter(Boolean))]
        return categories.sort()
    }
}