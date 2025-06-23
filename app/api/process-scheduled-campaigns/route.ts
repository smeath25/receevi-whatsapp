import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase-server";

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerClient();
        
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Get the session to access the access token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
            return NextResponse.json(
                { error: 'Session expired' },
                { status: 401 }
            );
        }

        console.log('Manually triggering scheduled campaigns processor...');

        // Call the standalone Edge Function to process scheduled campaigns
        const { data, error } = await supabase.functions.invoke('process-scheduled-broadcasts-standalone', {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        });

        if (error) {
            console.error('Error calling process-scheduled-broadcasts function:', error);
            return NextResponse.json(
                { error: 'Failed to process scheduled campaigns', details: error.message },
                { status: 500 }
            );
        }

        console.log('Scheduled campaigns processor response:', data);

        return NextResponse.json({
            success: true,
            message: 'Scheduled campaigns processing triggered successfully',
            data: data
        });

    } catch (error) {
        console.error('Error in process-scheduled-campaigns API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}