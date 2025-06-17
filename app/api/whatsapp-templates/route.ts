import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase-server"

interface WhatsAppTemplate {
  id: string
  name: string
  category: string
  status: string
  language: string
  components: any[]
}

interface WhatsAppTemplateResponse {
  data: WhatsAppTemplate[]
  paging?: {
    next?: string
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get environment variables
    const whatsappBusinessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
    const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN
    
    if (!whatsappBusinessAccountId || !whatsappAccessToken) {
      return new NextResponse('WhatsApp configuration missing', { status: 500 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === 'true'
    
    let templates: WhatsAppTemplate[] = []
    
    if (refresh) {
      // Fetch fresh templates from WhatsApp API
      const fetchLimit = 100
      let next = `https://graph.facebook.com/v17.0/${whatsappBusinessAccountId}/message_templates?limit=${fetchLimit}`
      
      while (next) {
        console.log(`Fetching templates from: ${next}`)
        
        const response = await fetch(next, {
          headers: {
            'Authorization': `Bearer ${whatsappAccessToken}`
          }
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('WhatsApp API error:', response.status, errorText)
          return new NextResponse(`WhatsApp API error: ${response.status}`, { status: 500 })
        }
        
        const jsonResponse: WhatsAppTemplateResponse = await response.json()
        templates = [...templates, ...jsonResponse.data]
        
        next = jsonResponse.paging?.next || null
      }
      
      // Optionally sync to local database (if you want to keep local copy)
      if (templates.length > 0) {
        const databaseInput = templates.map((template) => ({
          id: template.id,
          name: template.name,
          category: template.category,
          status: template.status,
          language: template.language,
          components: template.components,
          updated_at: new Date().toISOString(),
        }))
        
        // Insert/update in local database for caching
        const { error } = await supabase
          .from('message_template')
          .upsert(databaseInput)
        
        if (error) {
          console.error('Error syncing templates to database:', error)
          // Don't fail the request, just log the error
        }
      }
    } else {
      // Use cached templates from database (faster)
      const { data: cachedTemplates, error } = await supabase
        .from('message_template')
        .select('*')
        .eq('status', 'APPROVED') // Only get approved templates
        .order('name')
      
      if (error) {
        console.error('Error fetching cached templates:', error)
        return new NextResponse('Error fetching templates', { status: 500 })
      }
      
      templates = cachedTemplates || []
    }

    // Filter only approved templates and format response
    const approvedTemplates = templates
      .filter(template => template.status === 'APPROVED')
      .map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        language: template.language,
        components: template.components
      }))

    // Group templates by name for easier UI handling
    const templatesByName = approvedTemplates.reduce((acc, template) => {
      if (!acc[template.name]) {
        acc[template.name] = []
      }
      acc[template.name].push(template)
      return acc
    }, {} as Record<string, typeof approvedTemplates>)

    const uniqueTemplateNames = Object.keys(templatesByName).sort()

    return NextResponse.json({
      templates: approvedTemplates,
      templatesByName,
      uniqueTemplateNames,
      totalCount: approvedTemplates.length,
      fromCache: !refresh
    })

  } catch (error) {
    console.error('Error in whatsapp-templates API:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}