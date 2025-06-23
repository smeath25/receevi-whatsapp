import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase-server";
import QuickReplyServerFactory from "@/lib/repositories/quick-replies/QuickReplyServerFactory";
import { UpdateQuickReplyRequest } from "@/types/quick-reply";

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const quickReplyRepository = QuickReplyServerFactory.getInstance();
        const quickReply = await quickReplyRepository.getQuickReplyById(params.id);

        if (!quickReply) {
            return NextResponse.json(
                { success: false, error: 'Quick reply not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: quickReply
        });
    } catch (error) {
        console.error('Error fetching quick reply:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch quick reply' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body: UpdateQuickReplyRequest = await request.json();
        
        const quickReplyRepository = QuickReplyServerFactory.getInstance();
        
        // Check if quick reply exists and user has permission
        const existingQuickReply = await quickReplyRepository.getQuickReplyById(params.id);
        if (!existingQuickReply) {
            return NextResponse.json(
                { success: false, error: 'Quick reply not found' },
                { status: 404 }
            );
        }

        // Check if user owns the quick reply or is admin
        if (existingQuickReply.created_by !== user.id) {
            return NextResponse.json(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            );
        }

        const updatedQuickReply = await quickReplyRepository.updateQuickReply(params.id, body);

        return NextResponse.json({
            success: true,
            data: updatedQuickReply
        });
    } catch (error) {
        console.error('Error updating quick reply:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update quick reply' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const quickReplyRepository = QuickReplyServerFactory.getInstance();
        
        // Check if quick reply exists and user has permission
        const existingQuickReply = await quickReplyRepository.getQuickReplyById(params.id);
        if (!existingQuickReply) {
            return NextResponse.json(
                { success: false, error: 'Quick reply not found' },
                { status: 404 }
            );
        }

        // Check if user owns the quick reply or is admin
        if (existingQuickReply.created_by !== user.id) {
            return NextResponse.json(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            );
        }

        await quickReplyRepository.deleteQuickReply(params.id);

        return NextResponse.json({
            success: true,
            message: 'Quick reply deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting quick reply:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete quick reply' },
            { status: 500 }
        );
    }
}