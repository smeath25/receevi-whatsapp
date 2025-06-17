import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase-server"

const SAMPLE_TAGS = [
    'Customer',
    'Lead',
    'VIP',
    'Support',
    'Sales',
    'Marketing',
    'Follow-up',
    'Inquiry',
    'Complaint',
    'Feedback',
    'New',
    'Active',
    'Inactive',
    'Prospect',
    'Returning'
]

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Check if tags already exist
        const { data: existingTags, error: fetchError } = await supabase
            .from('contact_tag')
            .select('name')

        if (fetchError) {
            console.error('Error fetching existing tags:', fetchError)
            return NextResponse.json(
                { error: 'Failed to check existing tags' },
                { status: 500 }
            )
        }

        const existingTagNames = existingTags?.map(tag => tag.name) || []
        const newTags = SAMPLE_TAGS.filter(tag => !existingTagNames.includes(tag))

        if (newTags.length === 0) {
            return NextResponse.json({
                message: 'All sample tags already exist',
                existingTags: existingTagNames
            })
        }

        // Insert new tags
        const { data, error } = await supabase
            .from('contact_tag')
            .insert(newTags.map(name => ({ name })))
            .select()

        if (error) {
            console.error('Error inserting tags:', error)
            return NextResponse.json(
                { error: 'Failed to create tags' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: `Successfully created ${newTags.length} tags`,
            createdTags: newTags,
            totalTags: existingTagNames.length + newTags.length
        })

    } catch (error) {
        console.error('Seed tags API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
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

        // Get all tags
        const { data: tags, error } = await supabase
            .from('contact_tag')
            .select('*')
            .order('name')

        if (error) {
            console.error('Error fetching tags:', error)
            return NextResponse.json(
                { error: 'Failed to fetch tags' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            tags: tags || [],
            count: tags?.length || 0
        })

    } catch (error) {
        console.error('Get tags API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}