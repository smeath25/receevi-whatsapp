import { MessageTemplateResponse } from "../setup/message_template.ts";

export async function getMessageTemplate(name: string, language: string) {
    const whatsappBusinessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID')
    if (!whatsappBusinessAccountId) {
        throw new Error("WHATSAPP_BUSINESS_ACCOUNT_ID environment variable is not set")
    }
    
    const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    if (!token) {
        throw new Error("WHATSAPP_ACCESS_TOKEN environment variable is not set")
    }
    
    const url = `https://graph.facebook.com/v17.0/${whatsappBusinessAccountId}/message_templates`;
    const params = new URLSearchParams();
    params.set('name', name);
    params.set('language', language);
    
    console.log(`Fetching template: ${name} in language: ${language}`)
    
    const response = await fetch(url + '?' + params, {
        headers: {
            'authorization': `Bearer ${token}`
        }
    })
    
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`WhatsApp API error: ${response.status} - ${errorText}`)
    }
    
    let jsonResponse: MessageTemplateResponse
    try {
        jsonResponse = await response.json()
    } catch (parseError) {
        throw new Error(`Failed to parse WhatsApp API response: ${parseError.message}`)
    }
    
    if (!jsonResponse.data || jsonResponse.data.length === 0) {
        throw new Error(`No template found with name: ${name} and language: ${language}`)
    }
    
    const messageTemplate = jsonResponse.data[0]
    console.log(`Template found: ${messageTemplate.name} (${messageTemplate.language})`)
    return messageTemplate;
}