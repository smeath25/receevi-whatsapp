import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Response } from "https://esm.sh/v133/@supabase/node-fetch@2.6.14/denonext/node-fetch.mjs";
import { SupabaseClientType, createSupabaseClient } from "../_shared/client.ts";
import { PARALLEL_BATCH_COUNT, PROCESSING_LIMIT } from "../_shared/constants.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { getMessageTemplate } from "./get-message-template.ts";

type BulkSendRequest = {
  name: string,
  messageTemplate: string,
  language: string,
  contactTags: string[],
}

async function markContactsForSend(supabase: SupabaseClientType, broadcastId: string, tags: string[]) {
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
    
    const broadcastContacts = contacts.map((item) => {
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
    const { error: errorBatchInsert } = await supabase.from('broadcast_batch').insert({
      'id': batchId,
      'broadcast_id': broadcastId,
      'scheduled_count': contacts.length,
    })
    if (errorBatchInsert) throw errorBatchInsert
    lastFetchedCount = contacts.length
    scheduledCount += contacts.length
    from = from + PROCESSING_LIMIT
  } while (lastFetchedCount == PROCESSING_LIMIT)
  return { scheduledCount, batches }
}

serve(async (req) => {
  console.log('Bulk-send function invoked, method:', req.method)
  
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

    const { data: broadcast, error } = await supabase
      .from('broadcast')
      .insert([
        {
          name: requestData.name,
          template_name: requestData.messageTemplate,
          contact_tags: requestData.contactTags,
          language: requestData.language
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
    console.log(`Broadcast created - ${broadcastId}`)
    
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
      }).catch(workerError => {
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
