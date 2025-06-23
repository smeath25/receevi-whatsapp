import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase-server"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const supabase = createClient()
        
        // Get the most recent broadcast
        const { data: broadcasts, error: broadcastError } = await supabase
            .from('broadcast')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5)
        
        if (broadcastError) {
            return NextResponse.json({ error: broadcastError.message }, { status: 500 })
        }

        // Get broadcast contacts for the latest broadcast
        const latestBroadcast = broadcasts?.[0]
        let contactStatus = null
        let batchStatus = null
        
        if (latestBroadcast) {
            const { data: contacts, error: contactError } = await supabase
                .from('broadcast_contact')
                .select('*')
                .eq('broadcast_id', latestBroadcast.id)
                .order('created_at', { ascending: false })
                .limit(10)
            
            const { data: batches, error: batchError } = await supabase
                .from('broadcast_batch')
                .select('*')
                .eq('broadcast_id', latestBroadcast.id)
                .order('created_at', { ascending: false })
            
            contactStatus = contacts
            batchStatus = batches
        }

        return NextResponse.json({
            success: true,
            data: {
                broadcasts: broadcasts,
                latestBroadcastContacts: contactStatus,
                latestBroadcastBatches: batchStatus
            }
        })
        
    } catch (error) {
        console.error('Broadcast status check error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}