import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase-server";
import QuickReplyServerFactory from "@/lib/repositories/quick-replies/QuickReplyServerFactory";
import { CreateQuickReplyRequest } from "@/types/quick-reply";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || undefined;
        const search = searchParams.get('search') || undefined;
        const is_global = searchParams.get('is_global');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const quickReplyRepository = QuickReplyServerFactory.getInstance();
        
        const filters = {
            category,
            search,
            is_global: is_global ? is_global === 'true' : undefined,
        };

        const result = await quickReplyRepository.getQuickReplies(
            filters,
            { limit, offset },
            true
        );

        return NextResponse.json({
            success: true,
            data: result.rows,
            total: result.itemsCount
        });
    } catch (error) {
        console.error('Error fetching quick replies:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch quick replies' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body: CreateQuickReplyRequest = await request.json();
        
        // Validate required fields
        if (!body.title || !body.content) {
            return NextResponse.json(
                { success: false, error: 'Title and content are required' },
                { status: 400 }
            );
        }

        const quickReplyRepository = QuickReplyServerFactory.getInstance();
        const quickReply = await quickReplyRepository.createQuickReply(body);

        return NextResponse.json({
            success: true,
            data: quickReply
        });
    } catch (error) {
        console.error('Error creating quick reply:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create quick reply' },
            { status: 500 }
        );
    }
}