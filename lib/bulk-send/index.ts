'use server';

import { createClient as createServerClient } from '@/utils/supabase-server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import MessageTemplateServerFactory from '../repositories/message-template/MessageTemplateServerFactory';

const schema = z.object({
    broadcast_name: z.string().min(1, "Broadcast name is required"),
    message_template: z.string().min(1, "Message template is required"),
    language: z.string().min(1, "Language is required"),
    contact_tags: z.string().optional().default("[]"),
    is_scheduled: z.string().optional().default("false"),
    scheduled_at: z.string().optional().default(""),
});

type BulkSendRequest = {
    name: string,
    messageTemplate: string,
    language: string,
    contactTags: string[],
    isScheduled?: boolean,
    scheduledAt?: string,
}

export async function getTemplateLanguges(templateName: string): Promise<string[]> {
    try {
        // Fetch directly from WhatsApp API to get the most up-to-date languages
        const whatsappBusinessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
        const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN
        
        if (!whatsappBusinessAccountId || !whatsappAccessToken) {
            console.error('WhatsApp configuration missing, falling back to database')
            const messageTemplateRepo = MessageTemplateServerFactory.getInstance()
            return await messageTemplateRepo.getMessageTemplateLanguages(templateName)
        }

        const response = await fetch(
            `https://graph.facebook.com/v17.0/${whatsappBusinessAccountId}/message_templates?name=${encodeURIComponent(templateName)}&status=APPROVED`,
            {
                headers: {
                    'Authorization': `Bearer ${whatsappAccessToken}`
                }
            }
        )

        if (!response.ok) {
            console.error('Failed to fetch template languages from WhatsApp API:', response.status)
            // Fallback to database
            const messageTemplateRepo = MessageTemplateServerFactory.getInstance()
            return await messageTemplateRepo.getMessageTemplateLanguages(templateName)
        }

        const data = await response.json()
        const languages = data.data
            .filter((template: any) => template.name === templateName && template.status === 'APPROVED')
            .map((template: any) => template.language as string)
        
        // Remove duplicates and sort
        return [...new Set(languages)].sort() as string[]
        
    } catch (error) {
        console.error('Error fetching template languages from WhatsApp API:', error)
        // Fallback to database
        const messageTemplateRepo = MessageTemplateServerFactory.getInstance()
        return await messageTemplateRepo.getMessageTemplateLanguages(templateName)
    }
}

export async function bulkSend(prevState: {message: string}, formData: FormData) {
    try {
        const parsed = schema.parse({
            broadcast_name: formData.get('broadcast_name'),
            message_template: formData.get('message_template'),
            contact_tags: formData.get('contact_tags'),
            language: formData.get('language'),
            is_scheduled: formData.get('is_scheduled'),
            scheduled_at: formData.get('scheduled_at'),
        });

        // Validate and parse contact tags
        let contactTags: string[] = []
        if (parsed.contact_tags) {
            try {
                contactTags = JSON.parse(parsed.contact_tags)
                if (!Array.isArray(contactTags)) {
                    console.error('Contact tags is not an array:', contactTags)
                    return { message: "Invalid contact tags format" }
                }
            } catch (parseError) {
                console.error('Failed to parse contact tags:', parseError, 'Raw value:', parsed.contact_tags)
                return { message: "Invalid contact tags format" }
            }
        }

        // Parse scheduling parameters
        const isScheduled = parsed.is_scheduled === 'true'
        let scheduledAt: string | undefined
        
        if (isScheduled && parsed.scheduled_at) {
            // Validate the scheduled date
            const scheduledDate = new Date(parsed.scheduled_at)
            if (isNaN(scheduledDate.getTime())) {
                return { message: "Invalid scheduled date format" }
            }
            if (scheduledDate <= new Date()) {
                return { message: "Scheduled date must be in the future" }
            }
            scheduledAt = scheduledDate.toISOString()
        }

        const bulkSendRequest: BulkSendRequest = {
            name: parsed.broadcast_name,
            messageTemplate: parsed.message_template,
            language: parsed.language,
            contactTags: contactTags,
            isScheduled,
            scheduledAt
        }

        console.log('Bulk send request:', bulkSendRequest)

        // Validate all required fields are present
        if (!bulkSendRequest.name || !bulkSendRequest.messageTemplate || !bulkSendRequest.language) {
            return { message: "All fields are required: name, template, and language" }
        }

        const supabase = createServerClient()
        
        // Check if user is authenticated and get session
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('Authentication error:', authError)
            return { message: "Authentication required. Please log in again." }
        }

        // Get the session to access the access token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session?.access_token) {
            console.error('Session error:', sessionError)
            return { message: "Session expired. Please log in again." }
        }

        console.log('Authenticated user:', user.email)
        console.log('Invoking bulk-send edge function with data:', JSON.stringify(bulkSendRequest, null, 2))

        // Call Edge Function with proper authentication
        const { data, error } = await supabase.functions.invoke('bulk-send', {
            body: bulkSendRequest,
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        })
        
        console.log('Edge function response:', { data, error })
        
        if (error) {
            console.error('Edge function error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                status: error.status,
                statusText: error.statusText
            })
            
            // Try to extract more meaningful error from the response
            let errorMessage = 'Unknown error'
            if (error.message) {
                errorMessage = error.message
            } else if (error.details) {
                errorMessage = error.details
            } else if (error.hint) {
                errorMessage = error.hint
            }
            
            return { message: `Failed to initiate bulk send: ${errorMessage}` }
        }

        console.log('Bulk send successful, response data:', data)
        
        // Redirect based on whether campaign was scheduled or sent immediately
        if (data && data.scheduled) {
            // For scheduled campaigns, redirect to scheduled campaigns page
            revalidatePath('/scheduled-campaigns', 'page');
            redirect('/scheduled-campaigns');
        } else {
            // For immediate campaigns, redirect to bulk-send page
            revalidatePath('/bulk-send', 'page');
            redirect('/bulk-send');
        }
    } catch (error) {
        console.error('Bulk send error:', error)
        if (error instanceof Error) {
            return { message: `Error: ${error.message}` }
        }
        return { message: "An unexpected error occurred" }
    }
}
