import { ScheduledMessage, CreateScheduledMessageRequest } from "@/types/scheduled-message"

export interface ScheduledMessageRepository {
    create(request: CreateScheduledMessageRequest): Promise<ScheduledMessage>
    getById(id: string): Promise<ScheduledMessage | null>
    getByUser(userId: string, limit?: number, offset?: number): Promise<ScheduledMessage[]>
    getByContact(contactId: number, limit?: number): Promise<ScheduledMessage[]>
    updateStatus(id: string, status: 'sent' | 'failed' | 'cancelled', data?: { wam_id?: string, error_message?: string }): Promise<void>
    cancel(id: string): Promise<void>
    getPending(limit?: number): Promise<ScheduledMessage[]>
    incrementRetryCount(id: string, errorMessage?: string): Promise<void>
}