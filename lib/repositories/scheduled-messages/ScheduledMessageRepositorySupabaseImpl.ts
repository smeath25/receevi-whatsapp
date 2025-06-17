import { Database } from "@/lib/database.types"
import { SupabaseClient } from "@supabase/supabase-js"
import { ScheduledMessage, CreateScheduledMessageRequest } from "@/types/scheduled-message"
import { ScheduledMessageRepository } from "./ScheduledMessageRepository"

export class ScheduledMessageRepositorySupabaseImpl implements ScheduledMessageRepository {
    constructor(private client: SupabaseClient<Database>) {}

    async create(request: CreateScheduledMessageRequest): Promise<ScheduledMessage> {
        const { data, error } = await this.client
            .from('scheduled_messages')
            .insert({
                to: request.to,
                message_content: request.message_content,
                message_type: request.message_type,
                file_data: request.file_data as any,
                template_data: request.template_data as any,
                scheduled_at: request.scheduled_at,
                created_by: (await this.client.auth.getUser()).data.user?.id
            })
            .select()
            .single()

        if (error) throw error
        return data as unknown as ScheduledMessage
    }

    async getById(id: string): Promise<ScheduledMessage | null> {
        const { data, error } = await this.client
            .from('scheduled_messages')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            if (error.code === 'PGRST116') return null // Not found
            throw error
        }
        return data as unknown as ScheduledMessage
    }

    async getByUser(userId: string, limit = 50, offset = 0): Promise<ScheduledMessage[]> {
        const { data, error } = await this.client
            .from('scheduled_messages')
            .select('*')
            .eq('created_by', userId)
            .order('scheduled_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) throw error
        return data as unknown as ScheduledMessage[]
    }

    async getByContact(contactId: number, limit = 10): Promise<ScheduledMessage[]> {
        const { data, error } = await this.client
            .from('scheduled_messages')
            .select('*')
            .eq('to', contactId)
            .order('scheduled_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return data as unknown as ScheduledMessage[]
    }

    async updateStatus(
        id: string, 
        status: 'sent' | 'failed' | 'cancelled', 
        data?: { wam_id?: string, error_message?: string }
    ): Promise<void> {
        const updateData: any = { 
            status,
            updated_at: new Date().toISOString()
        }

        if (status === 'sent') {
            updateData.sent_at = new Date().toISOString()
            if (data?.wam_id) {
                updateData.wam_id = data.wam_id
            }
        }

        if (data?.error_message) {
            updateData.error_message = data.error_message
        }

        const { error } = await this.client
            .from('scheduled_messages')
            .update(updateData)
            .eq('id', id)

        if (error) throw error
    }

    async cancel(id: string): Promise<void> {
        await this.updateStatus(id, 'cancelled')
    }

    async getPending(limit = 100): Promise<ScheduledMessage[]> {
        const { data, error } = await this.client
            .rpc('get_pending_scheduled_messages', { limit_count: limit })

        if (error) throw error
        return data as unknown as ScheduledMessage[]
    }

    async incrementRetryCount(id: string, errorMessage?: string): Promise<void> {
        const { error } = await this.client
            .rpc('mark_scheduled_message_failed', { 
                message_id: id, 
                error_msg: errorMessage || 'Unknown error' 
            })

        if (error) throw error
    }
}