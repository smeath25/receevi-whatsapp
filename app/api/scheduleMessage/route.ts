import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase-server"
import { createServiceClient } from "@/lib/supabase/service-client"
import ScheduledMessageServerFactory from "@/lib/repositories/scheduled-messages/ScheduledMessageServerFactory"
import { CreateScheduledMessageRequest, ScheduledMessageType } from "@/types/scheduled-message"
import { TemplateRequest } from "@/types/message-template-request"

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Parse form data
        const formData = await request.formData()
        const to = formData.get('to')?.toString()
        const scheduledAt = formData.get('scheduledAt')?.toString()
        const message = formData.get('message')?.toString()
        const fileType = formData.get('fileType')?.toString()
        const file = formData.get('file') as File | null
        const templateJson = formData.get('template')?.toString()

        // Validate required fields
        if (!to || !scheduledAt) {
            return new NextResponse('Missing required fields: to, scheduledAt', { status: 400 })
        }

        // Validate scheduled time is in the future
        const scheduledDate = new Date(scheduledAt)
        if (scheduledDate <= new Date()) {
            return new NextResponse('Scheduled time must be in the future', { status: 400 })
        }

        // Determine message type and prepare data
        let messageType: ScheduledMessageType = 'text'
        let fileData = undefined
        let templateData: TemplateRequest | undefined = undefined

        if (templateJson) {
            messageType = 'template'
            templateData = JSON.parse(templateJson)
        } else if (file && fileType) {
            switch (fileType) {
                case 'image':
                    messageType = 'image'
                    break
                case 'video':
                    messageType = 'video'
                    break
                default:
                    messageType = 'document'
            }
            
            // Store file data for later processing
            fileData = {
                filename: file.name,
                type: file.type,
                size: file.size
            }
            
            // TODO: Upload file to temporary storage or encode as base64
            // For now, we'll store file info and handle upload during sending
        }

        // Validate message content
        if (!message && !file && !templateData) {
            return new NextResponse('Message content, file, or template is required', { status: 400 })
        }

        // Create scheduled message
        const serviceSupabase = createServiceClient()
        const scheduledMessageRepo = ScheduledMessageServerFactory.getInstance(serviceSupabase)
        
        const createRequest: CreateScheduledMessageRequest = {
            to: parseInt(to),
            message_content: message || undefined,
            message_type: messageType,
            file_data: fileData,
            template_data: templateData,
            scheduled_at: scheduledDate.toISOString()
        }

        const scheduledMessage = await scheduledMessageRepo.create(createRequest)

        return NextResponse.json({ 
            success: true, 
            scheduledMessage: {
                id: scheduledMessage.id,
                scheduled_at: scheduledMessage.scheduled_at,
                status: scheduledMessage.status
            }
        })

    } catch (error) {
        console.error('Error scheduling message:', error)
        return new NextResponse('Internal server error', { status: 500 })
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

        // Get query parameters
        const { searchParams } = new URL(request.url)
        const contactId = searchParams.get('contactId')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = parseInt(searchParams.get('offset') || '0')

        // Get scheduled messages
        const serviceSupabase = createServiceClient()
        const scheduledMessageRepo = ScheduledMessageServerFactory.getInstance(serviceSupabase)
        
        let scheduledMessages
        if (contactId) {
            scheduledMessages = await scheduledMessageRepo.getByContact(parseInt(contactId), limit)
        } else {
            scheduledMessages = await scheduledMessageRepo.getByUser(user.id, limit, offset)
        }

        return NextResponse.json({ scheduledMessages })

    } catch (error) {
        console.error('Error fetching scheduled messages:', error)
        return new NextResponse('Internal server error', { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        // Authenticate user
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Parse request body
        const { id, action } = await request.json()
        
        if (!id || !action) {
            return new NextResponse('Missing required fields: id, action', { status: 400 })
        }

        // Update scheduled message
        const serviceSupabase = createServiceClient()
        const scheduledMessageRepo = ScheduledMessageServerFactory.getInstance(serviceSupabase)
        
        if (action === 'cancel') {
            await scheduledMessageRepo.cancel(id)
        } else {
            return new NextResponse('Invalid action', { status: 400 })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error updating scheduled message:', error)
        return new NextResponse('Internal server error', { status: 500 })
    }
}