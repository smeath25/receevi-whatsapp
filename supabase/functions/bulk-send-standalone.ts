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
function createSupabaseClient(authorizationHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: authorizationHeader
        }
      }
    }
  )
}

type BulkSendRequest = {
  name: string,
  messageTemplate: string,
  language: string,
  contactTags: string[],
  isScheduled?: boolean,
  scheduledAt?: string,
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

serve(async (req: Request) => {
  console.log('Bulk-send function invoked, method:', req.method)
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authorizationHeader = req.headers.get('Authorization')!
    if (!authorizationHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    const supabase = createSupabaseClient(authorizationHeader)

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'User authentication failed' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    let requestData: BulkSendRequest
    try {
      const rawBody = await req.text()
      console.log('Raw request body:', rawBody)
      requestData = JSON.parse(rawBody)
      console.log('Parsed request data:', JSON.stringify(requestData, null, 2))
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // Validate required fields
    if (!requestData.name || !requestData.messageTemplate || !requestData.language) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, messageTemplate, and language are required' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    if (!requestData.contactTags || requestData.contactTags.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one contact tag must be selected' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // Determine broadcast status and scheduled_at based on scheduling
    const status = requestData.isScheduled ? 'scheduled' : 'immediate'
    const scheduled_at = requestData.isScheduled && requestData.scheduledAt 
      ? requestData.scheduledAt 
      : null

    console.log(`Creating broadcast with status: ${status}, scheduled_at: ${scheduled_at}`)

    const { data: broadcast, error } = await supabase
      .from('broadcast')
      .insert([
        {
          name: requestData.name,
          template_name: requestData.messageTemplate,
          contact_tags: requestData.contactTags,
          language: requestData.language,
          status: status,
          scheduled_at: scheduled_at
        },
      ])
      .select()
    
    if (error) {
      console.error('Error creating broadcast:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create broadcast', details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }
    
    if (!broadcast || broadcast.length <= 0) {
      return new Response(
        JSON.stringify({ error: `Failed to create broadcast. name: ${requestData.name} template_name: ${requestData.messageTemplate}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }
    
    const broadcastId: string = broadcast[0].id
    console.log(`Broadcast created - ${broadcastId} (Status: ${status})`)
    
    // For scheduled campaigns, populate the recipient list but don't send yet
    if (requestData.isScheduled) {
      console.log(`Campaign scheduled for: ${requestData.scheduledAt}`)
      
      let contactsMarkedForScheduling
      try {
        contactsMarkedForScheduling = await markContactsForSend(supabase, broadcastId, requestData.contactTags)
        console.log(`BroadcastId: ${broadcastId} - ${contactsMarkedForScheduling.scheduledCount} contacts marked for scheduled send`)
        
        if (contactsMarkedForScheduling.scheduledCount === 0) {
          return new Response(
            JSON.stringify({ 
              error: 'No contacts found', 
              details: `No contacts found with the selected tags: ${requestData.contactTags.join(', ')}. Please check your tag selection or add contacts with these tags.`
            }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          )
        }
        
        // Update the broadcast with scheduled count
        const { error: errorUpdateBroadcastSC } = await supabase
          .from('broadcast')
          .update({ scheduled_count: contactsMarkedForScheduling.scheduledCount })
          .eq('id', broadcastId)
        
        if (errorUpdateBroadcastSC) {
          console.error('Error updating broadcast scheduled count:', errorUpdateBroadcastSC)
        }
        
      } catch (markError) {
        console.error('Error marking contacts for scheduled send:', markError)
        return new Response(
          JSON.stringify({ error: 'Failed to process contacts for scheduling', details: markError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          broadcastId,
          message: `Campaign "${requestData.name}" has been scheduled for ${new Date(requestData.scheduledAt!).toLocaleString()}`,
          scheduled: true,
          scheduledAt: requestData.scheduledAt,
          contactsScheduled: contactsMarkedForScheduling.scheduledCount
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }
    
    // For immediate campaigns, continue with the existing logic
    let contactsMarkedForSent
    try {
      contactsMarkedForSent = await markContactsForSend(supabase, broadcastId, requestData.contactTags)
      console.log(`BroadcastId: ${broadcastId} - ${contactsMarkedForSent.scheduledCount} contacts marked for send`)
      
      if (contactsMarkedForSent.scheduledCount === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No contacts found', 
            details: `No contacts found with the selected tags: ${requestData.contactTags.join(', ')}. Please check your tag selection or add contacts with these tags.`
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        )
      }
    } catch (markError) {
      console.error('Error marking contacts for send:', markError)
      return new Response(
        JSON.stringify({ error: 'Failed to process contacts', details: markError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    const { error: errorUpdateBroadcastSC } = await supabase
      .from('broadcast')
      .update({ scheduled_count: contactsMarkedForSent.scheduledCount })
      .eq('id', broadcastId)
    
    if (errorUpdateBroadcastSC) {
      console.error('Error updating broadcast scheduled count:', errorUpdateBroadcastSC)
      return new Response(
        JSON.stringify({ error: 'Failed to update broadcast count', details: errorUpdateBroadcastSC.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    let messageTemplate
    try {
      messageTemplate = await getMessageTemplate(requestData.messageTemplate, requestData.language)
    } catch (templateError) {
      console.error('Error fetching message template:', templateError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch message template', details: templateError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // Start batch processing workers
    const workerCount = Math.min(PARALLEL_BATCH_COUNT, contactsMarkedForSent.batches.length)
    for (let i = 0; i < workerCount; i++) {
      // Don't await these calls - they should run in background
      supabase.functions.invoke('send-message-batch', {
        body: {
          broadcast: broadcast[0],
          messageTemplate: messageTemplate
        }
      }).catch((workerError: any) => {
        console.error(`Error invoking worker ${i}:`, workerError)
      })
    }
    console.log(`BroadcastId: ${broadcastId} - ${workerCount} workers invoked`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bulk send initiated successfully',
        broadcastId: broadcastId,
        contactsScheduled: contactsMarkedForSent.scheduledCount,
        workersStarted: workerCount
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    )

  } catch (error) {
    console.error('Bulk send function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    )
  }
})