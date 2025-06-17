// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import { corsHeaders } from '../_shared/cors.ts';
import { parse } from "https://deno.land/std@0.218.2/csv/mod.ts";
import { createSupabaseClient } from "../_shared/client.ts";
import { Database } from "../_shared/database.types.ts";

export type ContactTag = Database['public']['Tables']['contact_tag']['Insert']
export type Contact = Database['public']['Tables']['contacts']['Insert']

type CSVData = {
  name: string,
  number: string,
  tags: string
}

Deno.serve(async (req) => {
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
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'User authentication failed' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    const csvData = await req.text()
    if (!csvData || csvData.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'CSV data is required' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // Parse CSV data
    let contactData: CSVData[]
    try {
      contactData = parse(csvData, {
        skipFirstRow: true,
        strip: true,
        columns: ["name", "number", "tags"],
      })
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid CSV format', details: parseError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    if (contactData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No contact data found in CSV' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // Process contacts and extract unique tags
    const niceData: Contact[] = []
    const uniqueTags: ContactTag[] = []
    const processedNumbers = new Set<string>()
    let duplicatesSkipped = 0
    
    for (const row of contactData) {
      // Skip empty rows
      if (!row.name || !row.number) {
        continue
      }
      
      // Skip duplicate numbers
      if (processedNumbers.has(row.number)) {
        duplicatesSkipped++
        continue
      }
      processedNumbers.add(row.number)
      
      // Process tags
      const tags = row.tags 
        ? row.tags.split(',')
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0)
        : []
      
      const niceRow = {
        profile_name: row.name.trim(),
        wa_id: row.number.trim(),
        tags: tags.length > 0 ? tags : null
      }
      niceData.push(niceRow)
      
      // Collect unique tags
      if (tags.length > 0) {
        tags.forEach((tag: string) => {
          if (!uniqueTags.find((tagItem) => tagItem.name === tag)) {
            uniqueTags.push({ name: tag })
          }
        })
      }
    }

    if (niceData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid contacts found in CSV' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    // Insert unique tags first
    let tagsCreated = 0
    if (uniqueTags.length > 0) {
      const { data: insertedTags, error: contactTagsInsertError } = await supabase
        .from('contact_tag')
        .upsert(uniqueTags, { onConflict: 'name' })
        .select()
      
      if (contactTagsInsertError) {
        console.error('Error inserting tags:', contactTagsInsertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create tags', details: contactTagsInsertError.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        )
      }
      
      tagsCreated = insertedTags?.length || uniqueTags.length
    }

    // Insert contacts
    const { data: insertedContacts, error: contactInsertError } = await supabase
      .from('contacts')
      .upsert(niceData, { onConflict: 'wa_id' })
      .select()

    if (contactInsertError) {
      console.error('Error inserting contacts:', contactInsertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create contacts', details: contactInsertError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      )
    }

    const contactsProcessed = insertedContacts?.length || niceData.length

    // Return success response with statistics
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contacts imported successfully',
        contacts_processed: contactsProcessed,
        tags_created: tagsCreated,
        duplicates_skipped: duplicatesSkipped,
        total_rows_in_csv: contactData.length,
        unique_tags: uniqueTags.map(tag => tag.name)
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    )

  } catch (error) {
    console.error('Import function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message || 'Unknown error occurred'
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    )
  }
})

// To invoke:
// curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
