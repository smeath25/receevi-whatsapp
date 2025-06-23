import { NextRequest, NextResponse } from "next/server";
import { BroadcastServerFactory } from "@/lib/repositories/broadcast/BroadcastServerFactory";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const broadcastId = params.id;
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        
        if (!broadcastId) {
            return NextResponse.json(
                { error: 'Broadcast ID is required' },
                { status: 400 }
            );
        }

        const broadcastRepository = BroadcastServerFactory.getBroadcastRepository();
        
        // Get both contacts and total count
        const [contacts, totalCount] = await Promise.all([
            broadcastRepository.getBroadcastContacts(broadcastId, page),
            broadcastRepository.getBroadcastContactsCount(broadcastId)
        ]);

        return NextResponse.json({
            success: true,
            data: {
                contacts,
                pagination: {
                    page,
                    totalCount,
                    pageSize: 50,
                    totalPages: Math.ceil(totalCount / 50)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching broadcast contacts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch broadcast contacts' },
            { status: 500 }
        );
    }
}