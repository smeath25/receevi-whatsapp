import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import ContactTagServerFactory from "@/lib/repositories/contact-tag/ContactTagServerFactory"
import MessageTemplateWithLanguage from "./MessageTemplateWithLanguage"
import { MultiSelectDropdown } from "./MultiSelectDropdown"
import NewBroadcastPageForm from "./NewBroadcastPageForm"
import { SubmitButton } from "./SubmitButton"

function convertToOptions(value: string): { value: string; label: string } {
    return {
        value: value,
        label: value,
    }
}

async function fetchWhatsAppTemplates(): Promise<string[]> {
    try {
        // For server-side rendering, we'll use the WhatsApp API directly
        const whatsappBusinessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
        const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN
        
        if (!whatsappBusinessAccountId || !whatsappAccessToken) {
            console.error('WhatsApp configuration missing')
            return []
        }

        const response = await fetch(
            `https://graph.facebook.com/v17.0/${whatsappBusinessAccountId}/message_templates?limit=100`,
            {
                headers: {
                    'Authorization': `Bearer ${whatsappAccessToken}`
                },
                // Add cache control for server-side fetching
                next: { revalidate: 300 } // Revalidate every 5 minutes
            }
        )

        if (!response.ok) {
            console.error('Failed to fetch templates from WhatsApp API:', response.status)
            return []
        }

        const data = await response.json()
        const approvedTemplates = data.data.filter((template: any) => template.status === 'APPROVED')
        
        // Get unique template names
        const uniqueNames = [...new Set(approvedTemplates.map((template: any) => template.name))].sort()
        
        return uniqueNames
    } catch (error) {
        console.error('Error fetching WhatsApp templates:', error)
        return []
    }
}

export default async function NewBroadcastPage() {
    // Fetch templates from WhatsApp API and contact tags from database
    const [whatsappTemplateNames, contactTags] = await Promise.all([
        fetchWhatsAppTemplates(),
        ContactTagServerFactory.getInstance().getContactTags()
    ])
    
    const messageTemplates = whatsappTemplateNames.map(convertToOptions)
    const contactTagOptions = contactTags.map(convertToOptions)
    return (
        <div className="p-4 m-4 bg-white rounded-xl">
            <NewBroadcastPageForm>
                <div className="grid gap-1.5">
                    <Label htmlFor="broadcast_name">Name</Label>
                    <Input className="w-[20rem]" name="broadcast_name" />
                </div>
                <MessageTemplateWithLanguage messageTemplates={messageTemplates} />
                <div className="grid gap-1.5">
                    <Label htmlFor="contact_tags">Contact Tags</Label>
                    <MultiSelectDropdown name="contact_tags" displayName="tag" className="w-[20rem]" options={contactTagOptions} />
                </div>
                <SubmitButton/>
            </NewBroadcastPageForm>
        </div>
    )
}