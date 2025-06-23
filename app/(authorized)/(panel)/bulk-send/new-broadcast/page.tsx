import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import MessageTemplateServerFactory from "@/lib/repositories/message-template/MessageTemplateServerFactory"
import MessageTemplateWithLanguage from "./MessageTemplateWithLanguage"
import NewBroadcastPageForm from "./NewBroadcastPageForm"
import { SubmitButton } from "./SubmitButton"
import SchedulingSection from "./SchedulingSection"
import ContactTagsClientWrapper from "./ContactTagsClientWrapper"

function convertToOptions(value: string): { value: string; label: string } {
    return {
        value: value,
        label: value,
    }
}

async function fetchWhatsAppTemplates(): Promise<string[]> {
    try {
        const messageTemplateRepository = MessageTemplateServerFactory.getInstance()
        const templateNames = await messageTemplateRepository.getMessageTemplateUniqueNames()
        return templateNames
    } catch (error) {
        console.error("Error in message template fetching:", error)
        return []
    }
}

export default async function NewBroadcastPage() {
    // Fetch templates from WhatsApp API 
    let whatsappTemplateNames: string[] = []
    
    try {
        whatsappTemplateNames = await fetchWhatsAppTemplates()
    } catch (error) {
        console.error('Error fetching WhatsApp templates:', error)
    }
    
    const messageTemplates = whatsappTemplateNames.map(convertToOptions)
    
    return (
        <div className="p-4 m-4 bg-white rounded-xl">
            <NewBroadcastPageForm>
                <div className="grid gap-1.5">
                    <Label htmlFor="broadcast_name">Name</Label>
                    <Input className="w-[20rem]" name="broadcast_name" />
                </div>
                <MessageTemplateWithLanguage messageTemplates={messageTemplates} />
                <ContactTagsClientWrapper />
                <SchedulingSection />
                <SubmitButton/>
            </NewBroadcastPageForm>
        </div>
    )
}