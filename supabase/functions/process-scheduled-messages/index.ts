import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ScheduledMessage {
  id: string
  to: number
  message_content?: string
  message_type: string
  file_data?: any
  template_data?: any
  scheduled_at: string
  created_by: string
  retry_count: number
}

interface WhatsAppMessage {
  messaging_product: "whatsapp"
  recipient_type: "individual"
  to: string
  type?: "text" | "template" | "image" | "video" | "document"
  text?: { body: string }
  template?: any
  image?: { id: string, caption?: string }
  video?: { id: string, caption?: string }
  document?: { id: string, filename?: string, caption?: string }
}

async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<{ id: string }> {
  const WHATSAPP_API_URL = `https://graph.facebook.com/v20.0/${Deno.env.get('WHATSAPP_API_PHONE_NUMBER_ID')}/messages`
  
  const response = await fetch(WHATSAPP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`
    },
    body: JSON.stringify(message)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`WhatsApp API error: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  return { id: result.messages[0].id }
}

async function processScheduledMessage(supabase: any, scheduledMessage: ScheduledMessage) {
  try {
    console.log(`Processing scheduled message ${scheduledMessage.id}`)

    // Build WhatsApp message payload
    const whatsappMessage: WhatsAppMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: scheduledMessage.to.toString()
    }

    switch (scheduledMessage.message_type) {
      case 'text':
        whatsappMessage.type = 'text'
        whatsappMessage.text = { body: scheduledMessage.message_content || '' }
        break
      
      case 'template':
        whatsappMessage.type = 'template'
        whatsappMessage.template = scheduledMessage.template_data
        break
      
      // Note: File uploads would require additional processing
      // For now, we'll handle text and template messages
      default:
        throw new Error(`Unsupported message type: ${scheduledMessage.message_type}`)
    }

    // Send message via WhatsApp API
    const result = await sendWhatsAppMessage(whatsappMessage)

    // Mark as sent in database
    const { error: updateError } = await supabase
      .rpc('mark_scheduled_message_sent', {
        message_id: scheduledMessage.id,
        whatsapp_message_id: result.id
      })

    if (updateError) {
      console.error('Failed to mark message as sent:', updateError)
      throw updateError
    }

    // Store in messages table for chat history
    const messageForDB = { ...whatsappMessage }
    delete messageForDB.messaging_product
    messageForDB['id'] = result.id

    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        message: messageForDB,
        wam_id: result.id,
        chat_id: scheduledMessage.to,
        is_received: false,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Failed to insert message to chat history:', insertError)
      // Don't throw here - message was sent successfully
    }

    // Update contact's last message timestamp
    const { error: contactUpdateError } = await supabase
      .from('contacts')
      .update({ last_message_at: new Date().toISOString() })
      .eq('wa_id', scheduledMessage.to)

    if (contactUpdateError) {
      console.error('Failed to update contact timestamp:', contactUpdateError)
    }

    console.log(`Successfully sent scheduled message ${scheduledMessage.id}`)

  } catch (error) {
    console.error(`Failed to process scheduled message ${scheduledMessage.id}:`, error)

    // Mark as failed and increment retry count
    const { error: failError } = await supabase
      .rpc('mark_scheduled_message_failed', {
        message_id: scheduledMessage.id,
        error_msg: error.message || 'Unknown error'
      })

    if (failError) {
      console.error('Failed to mark message as failed:', failError)
    }

    throw error
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending scheduled messages
    const { data: scheduledMessages, error } = await supabase
      .rpc('get_pending_scheduled_messages', { limit_count: 50 })

    if (error) {
      console.error('Failed to fetch scheduled messages:', error)
      throw error
    }

    console.log(`Found ${scheduledMessages?.length || 0} pending scheduled messages`)

    let processedCount = 0
    let errorCount = 0

    // Process each message
    for (const scheduledMessage of scheduledMessages || []) {
      try {
        await processScheduledMessage(supabase, scheduledMessage)
        processedCount++
      } catch (error) {
        console.error(`Error processing message ${scheduledMessage.id}:`, error)
        errorCount++
      }
    }

    const result = {
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: scheduledMessages?.length || 0
    }

    console.log('Batch processing complete:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        } 
      }
    )

  } catch (error) {
    console.error('Process scheduled messages error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        } 
      }
    )
  }
})