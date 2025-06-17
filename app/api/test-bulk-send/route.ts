import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase-server"

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized', details: authError?.message },
                { status: 401 }
            )
        }

        // Parse request body
        const requestBody = await request.json()
        console.log('Test bulk send request:', JSON.stringify(requestBody, null, 2))

        // Test Edge Function call
        const { data, error } = await supabase.functions.invoke('bulk-send', {
            body: requestBody
        })

        console.log('Edge function response:', { data, error })

        if (error) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Edge function error',
                    details: {
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        code: error.code,
                        status: error.status,
                        statusText: error.statusText,
                        fullError: error
                    }
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Edge function called successfully',
            data: data
        })

    } catch (error) {
        console.error('Test bulk send API error:', error)
        return NextResponse.json(
            { 
                success: false,
                error: 'Internal server error', 
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}