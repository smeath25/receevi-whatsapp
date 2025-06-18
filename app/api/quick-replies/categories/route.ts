import { NextRequest, NextResponse } from "next/server";
import QuickReplyServerFactory from "@/lib/repositories/quick-replies/QuickReplyServerFactory";

export async function GET(request: NextRequest) {
    try {
        const quickReplyRepository = QuickReplyServerFactory.getInstance();
        const categories = await quickReplyRepository.getCategories();

        return NextResponse.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}