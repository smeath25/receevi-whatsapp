import { NextRequest, NextResponse } from "next/server"
export const dynamic = 'force-dynamic'
import { createClient } from "@/utils/supabase-server"
import { z } from "zod"

const UpdateContactSchema = z.object({
    profile_name: z.string().optional(),
    tags: z.array(z.string()).optional(),
    assigned_to: z.string().nullable().optional(),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: { wa_id: string } }
) {
    try {
        // Authenticate user
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Parse and validate request body
        const body = await request.json()
        const validation = UpdateContactSchema.safeParse(body)
        
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request data', details: validation.error.issues },
                { status: 400 }
            )
        }

        const wa_id = parseInt(params.wa_id)
        if (isNaN(wa_id)) {
            return NextResponse.json(
                { error: 'Invalid contact ID' },
                { status: 400 }
            )
        }

        // Update contact
        const { data, error } = await supabase
            .from('contacts')
            .update(validation.data)
            .eq('wa_id', wa_id)
            .select()
            .single()

        if (error) {
            console.error('Error updating contact:', error)
            return NextResponse.json(
                { error: 'Failed to update contact' },
                { status: 500 }
            )
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Contact not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ contact: data })

    } catch (error) {
        console.error('Contact update API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: { wa_id: string } }
) {
    try {
        // Authenticate user
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const wa_id = parseInt(params.wa_id)
        if (isNaN(wa_id)) {
            return NextResponse.json(
                { error: 'Invalid contact ID' },
                { status: 400 }
            )
        }

        // Get contact
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('wa_id', wa_id)
            .single()

        if (error) {
            console.error('Error fetching contact:', error)
            return NextResponse.json(
                { error: 'Failed to fetch contact' },
                { status: 500 }
            )
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Contact not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ contact: data })

    } catch (error) {
        console.error('Contact fetch API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}