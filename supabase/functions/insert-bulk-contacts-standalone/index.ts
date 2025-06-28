// Standalone version of insert-bulk-contacts to avoid import issues
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parse } from "https://deno.land/std@0.218.2/csv/mod.ts"

// Define CORS headers inline
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Type definitions
type ContactTag = {
  name: string
}

type Contact = {
  profile_name: string
  wa_id: string
  tags: string[] | null
}

type CSVData = {
  name: string
  number: string
  tags: string
}

function createSupabaseClient(authorizationHeader: string) {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { global: { headers: { Authorization: authorizationHeader } } }
    )
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
      }) as CSVData[]
    } catch (parseError: any) {
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
    let invalidNumbersSkipped = 0
    
    for (const row of contactData) {
      // Skip empty rows
      if (!row.name || !row.number) {
        continue
      }
      
      // Sanitize phone number early for duplicate checking
      const sanitizedNumber = row.number.trim()
        .replace(/\s+/g, '')      // Remove all spaces
        .replace(/-/g, '')        // Remove hyphens
        .replace(/\(/g, '')       // Remove opening parentheses
        .replace(/\)/g, '')       // Remove closing parentheses
        .replace(/\./g, '')       // Remove dots
      
      // Validate phone number format (must start with + and contain only digits)
      if (!sanitizedNumber.startsWith('+') || !/^\+\d+$/.test(sanitizedNumber)) {
        console.log(`Skipping invalid phone number: ${row.number} (sanitized: ${sanitizedNumber})`)
        invalidNumbersSkipped++
        continue
      }
      
      // Skip duplicate numbers (check with sanitized number)
      if (processedNumbers.has(sanitizedNumber)) {
        duplicatesSkipped++
        continue
      }
      processedNumbers.add(sanitizedNumber)
      
      // Process tags
      const tags = row.tags 
        ? row.tags.split(',')
            .map((tag: string) => tag.trim())
            .filter((tag: string) => tag.length > 0)
        : []
      
      const niceRow = {
        profile_name: row.name.trim(),
        wa_id: sanitizedNumber,  // Using the already sanitized number
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
        invalid_numbers_skipped: invalidNumbersSkipped,
        total_rows_in_csv: contactData.length,
        unique_tags: uniqueTags.map(tag => tag.name)
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    )

  } catch (error: any) {
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