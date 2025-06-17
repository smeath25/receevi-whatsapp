'use server';

import { createClient as createServerClient } from '@/utils/supabase-server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import MessageTemplateServerFactory from '../repositories/message-template/MessageTemplateServerFactory';

const schema = z.object({
    broadcast_name: z.string(),
    message_template: z.string(),
    language: z.string(),
    contact_tags: z.string(),
});

type BulkSendRequest = {
    name: string,
    messageTemplate: string,
    language: string,
    contactTags: string[],
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
            .map((template: any) => template.language)
        
        // Remove duplicates and sort
        return [...new Set(languages)].sort()
        
    } catch (error) {
        console.error('Error fetching template languages from WhatsApp API:', error)
        // Fallback to database
        const messageTemplateRepo = MessageTemplateServerFactory.getInstance()
        return await messageTemplateRepo.getMessageTemplateLanguages(templateName)
    }
}

export async function bulkSend(prevState: {message: string}, formData: FormData) {
    const parsed = schema.parse({
        broadcast_name: formData.get('broadcast_name'),
        message_template: formData.get('message_template'),
        contact_tags: formData.get('contact_tags'),
        language: formData.get('language'),
    });
    const bulkSendRequest: BulkSendRequest = {
        name: parsed.broadcast_name,
        messageTemplate: parsed.message_template,
        language: parsed.language,
        contactTags: JSON.parse(parsed.contact_tags)
    }
    const supabase = createServerClient()
    const { error } = await supabase.functions.invoke('bulk-send', {
        body: bulkSendRequest
    })
    if (error) {
        console.error('error while initiating bulk send', error)
        return { message: "something went wrong" }
    }
    revalidatePath('/bulk-send', 'page');
    redirect('/bulk-send');
}
