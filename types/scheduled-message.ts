import { TemplateRequest } from "./message-template-request"

export type ScheduledMessageStatus = 'pending' | 'sent' | 'failed' | 'cancelled'

export type ScheduledMessageType = 'text' | 'template' | 'image' | 'video' | 'document'

export interface FileData {
    filename: string
    type: string
    size: number
    url?: string // For preview purposes
}

export interface ScheduledMessage {
    id: string
    to: number // WhatsApp ID
    message_content?: string
    message_type: ScheduledMessageType
    file_data?: FileData
    template_data?: TemplateRequest
    scheduled_at: string
    status: ScheduledMessageStatus
    created_at: string
    updated_at: string
    created_by: string
    sent_at?: string
    wam_id?: string // WhatsApp message ID
    error_message?: string
    retry_count: number
    max_retries: number
}

export interface CreateScheduledMessageRequest {
    to: number
    message_content?: string
    message_type: ScheduledMessageType
    file_data?: FileData
    template_data?: TemplateRequest
    scheduled_at: string
}

export interface ScheduledMessageFormData {
    message?: string
    file?: File
    fileType?: 'image' | 'video' | 'document'
    template?: TemplateRequest
    scheduledDateTime: Date
}