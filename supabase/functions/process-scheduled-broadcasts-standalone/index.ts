import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Constants
const PROCESSING_LIMIT = 1000
const PARALLEL_BATCH_COUNT = 3

// Create Supabase client
function createSupabaseClient(authorizationHeader?: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      global: {
        headers: authorizationHeader ? {
          Authorization: authorizationHeader
        } : {}
      }
    }
  )
}

async function markContactsForSend(supabase: any, broadcastId: string, tags: string[]) {
  let from = 0
  let lastFetchedCount;
  let scheduledCount = 0;
  const batches = []
  
  do {
    const batchId = crypto.randomUUID()
    const to = from + PROCESSING_LIMIT - 1
    console.log(`BroadcastId: ${broadcastId} - Analyzing contacts to send message ${from} ${to}...`)
    
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: true })
      .overlaps('tags', tags)
      .range(from, to)
    
    if (error) throw error
    
    if (!contacts || contacts.length === 0) {
      console.log(`BroadcastId: ${broadcastId} - No more contacts found for tags: ${tags.join(', ')}`)
      break
    }
    
    const broadcastContacts = contacts.map((item: any) => {
      return {
        broadcast_id: broadcastId,
        contact_id: item.wa_id,
        batch_id: batchId
      }
    })
    
    const { error: errorContactInsert } = await supabase
      .from('broadcast_contact')
      .insert(broadcastContacts)
    if (errorContactInsert) throw errorContactInsert
    
    batches.push(batchId)
    
    const { error: errorBatchInsert } = await supabase
      .from('broadcast_batch')
      .insert([{
        id: batchId,
        broadcast_id: broadcastId,
        scheduled_count: contacts.length
      }])
    if (errorBatchInsert) throw errorBatchInsert
    
    scheduledCount += contacts.length
    lastFetchedCount = contacts.length
    from = to + 1
  } while (lastFetchedCount === PROCESSING_LIMIT)
  
  return { scheduledCount, batches }
}

async function getMessageTemplate(templateName: string, language: string) {
  const whatsappBusinessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID')
  const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
  
  if (!whatsappBusinessAccountId || !whatsappAccessToken) {
    throw new Error('WhatsApp configuration missing')
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
    throw new Error(`Failed to fetch message template: ${response.status}`)
  }

  const data = await response.json()
  const template = data.data.find((t: any) => 
    t.name === templateName && 
    t.language === language && 
    t.status === 'APPROVED'
  )
  
  if (!template) {
    throw new Error(`Template not found: ${templateName} (${language})`)
  }
  
  return template
}

async function processScheduledBroadcast(supabase: any, broadcast: any) {
  console.log(`Processing scheduled broadcast: ${broadcast.id} - ${broadcast.name}`)
  
  try {
    // Mark broadcast as processing
    const { error: updateError } = await supabase
      .from('broadcast')
      .update({ status: 'processing' })
      .eq('id', broadcast.id)
      .eq('status', 'scheduled')
    
    if (updateError) {
      console.error('Error updating broadcast status to processing:', updateError)
      return false
    }
    
    // Check if contacts are already marked (from scheduling)
    const { data: existingBatches, error: batchError } = await supabase
      .from('broadcast_batch')
      .select('id')
      .eq('broadcast_id', broadcast.id)
    
    if (batchError) {
      console.error('Error checking existing batches:', batchError)
      return false
    }
    
    let batches = []
    
    // If no existing batches, mark contacts for send
    if (!existingBatches || existingBatches.length === 0) {
      console.log(`No existing batches found, marking contacts for broadcast ${broadcast.id}`)
      const contactsMarkedForSent = await markContactsForSend(
        supabase, 
        broadcast.id, 
        broadcast.contact_tags
      )
      
      console.log(`BroadcastId: ${broadcast.id} - ${contactsMarkedForSent.scheduledCount} contacts marked for send`)
      
      if (contactsMarkedForSent.scheduledCount === 0) {
        console.log(`No contacts found for broadcast ${broadcast.id}`)
        await supabase
          .from('broadcast')
          .update({ status: 'failed' })
          .eq('id', broadcast.id)
        return false
      }
      
      // Update scheduled count
      const { error: errorUpdateBroadcastSC } = await supabase
        .from('broadcast')
        .update({ scheduled_count: contactsMarkedForSent.scheduledCount })
        .eq('id', broadcast.id)
      
      if (errorUpdateBroadcastSC) {
        console.error('Error updating broadcast scheduled count:', errorUpdateBroadcastSC)
        return false
      }
      
      batches = contactsMarkedForSent.batches
    } else {
      console.log(`Using existing ${existingBatches.length} batches for broadcast ${broadcast.id}`)
      batches = existingBatches.map(b => b.id)
    }
    
    // Get message template
    let messageTemplate
    try {
      messageTemplate = await getMessageTemplate(broadcast.template_name, broadcast.language)
    } catch (templateError) {
      console.error('Error fetching message template:', templateError)
      await supabase
        .from('broadcast')
        .update({ status: 'failed' })
        .eq('id', broadcast.id)
      return false
    }
    
    // Start batch processing workers
    const workerCount = Math.min(PARALLEL_BATCH_COUNT, batches.length)
    for (let i = 0; i < workerCount; i++) {
      // Don't await these calls - they should run in background
      supabase.functions.invoke('send-message-batch', {
        body: {
          broadcast: broadcast,
          messageTemplate: messageTemplate
        }
      }).catch((workerError: any) => {
        console.error(`Error invoking worker ${i}:`, workerError)
      })
    }
    
    console.log(`Started ${workerCount} workers for broadcast ${broadcast.id}`)
    return true
    
  } catch (error) {
    console.error('Error processing scheduled broadcast:', error)
    
    // Mark as failed
    await supabase
      .from('broadcast')
      .update({ status: 'failed' })
      .eq('id', broadcast.id)
    
    return false
  }
}

serve(async (req: Request) => {
  console.log('Process-scheduled-broadcasts function invoked, method:', req.method)
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authorizationHeader = req.headers.get('Authorization')
    const supabase = createSupabaseClient(authorizationHeader || undefined)
    
    // If there's an authorization header, validate the user
    if (authorizationHeader) {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.log('Authentication failed, but proceeding without user context')
      }
    }
    
    // Get pending scheduled broadcasts
    const { data: scheduledBroadcasts, error } = await supabase
      .from('broadcast')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10) // Process up to 10 broadcasts at a time
    
    if (error) {
      console.error('Error fetching scheduled broadcasts:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch scheduled broadcasts', details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }
    
    if (!scheduledBroadcasts || scheduledBroadcasts.length === 0) {
      console.log('No scheduled broadcasts found')
      return new Response(
        JSON.stringify({ message: 'No scheduled broadcasts to process', processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }
    
    console.log(`Found ${scheduledBroadcasts.length} scheduled broadcasts to process`)
    
    // Process each scheduled broadcast
    const results = []
    for (const broadcast of scheduledBroadcasts) {
      const success = await processScheduledBroadcast(supabase, broadcast)
      results.push({
        broadcastId: broadcast.id,
        name: broadcast.name,
        success: success
      })
    }
    
    const successCount = results.filter(r => r.success).length
    console.log(`Processed ${results.length} broadcasts, ${successCount} successful`)
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Processed ${results.length} scheduled broadcasts`,
        results: results,
        processed: results.length,
        successful: successCount,
        failed: results.length - successCount
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    )
    
  } catch (error) {
    console.error('Error in process-scheduled-broadcasts:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    )
  }
})