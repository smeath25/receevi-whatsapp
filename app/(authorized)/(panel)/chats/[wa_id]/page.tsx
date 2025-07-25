'use client'

import { DBTables } from "@/lib/enums/Tables";
import ChatHeader from "./ChatHeader";
import MessageListClient from "./MessageListClient";
import SendMessageWrapper from "./SendMessageWrapper";
import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";
import ContactBrowserFactory from "@/lib/repositories/contacts/ContactBrowserFactory";
import { Contact } from "@/types/contact";
import { Button } from "@/components/ui/button";
import TemplateSelection from "@/components/ui/template-selection";
import { TemplateRequest } from "@/types/message-template-request";
import TWLoader from "@/components/TWLoader";
import { CircleAlertIcon } from "lucide-react";
import { UPDATE_CURRENT_CONTACT, useCurrentContactDispatch } from "../CurrentContactContext";
import { isLessThanADay } from "@/lib/time-utils";

export const revalidate = 0

export default function ContactChat({ params }: { params: { wa_id: string } }) {
    const [isChatWindowOpen, setChatWindowOpen] = useState<boolean | undefined>()
    const [lastMessageReceivedAt, setLastMessageReceivedAt] = useState<Date | undefined>()
    const { supabase } = useSupabase()
    const [contactRepository] = useState(() => ContactBrowserFactory.getInstance(supabase))
    const [messageTemplateSending, setMessageTemplateSending] = useState<boolean>(false);
    const [contact, setContact] = useState<Contact | undefined>();
    const setCurrentContact = useCurrentContactDispatch()

    useEffect(() => {
        contactRepository.getContactById(params.wa_id).then((contact) => {
            if (contact) {
                setContact(contact)
                setLastMessageReceivedAt(contact.last_message_received_at ? new Date(contact.last_message_received_at) : undefined)
                if (setCurrentContact) {
                    setCurrentContact({ type: UPDATE_CURRENT_CONTACT, contact: contact })
                }
            }
        })
    }, [contactRepository, setChatWindowOpen, params.wa_id, setLastMessageReceivedAt, setContact, setCurrentContact])

    useEffect(() => {
        if (lastMessageReceivedAt) {
            const isChatWindowOpen = isLessThanADay(lastMessageReceivedAt)
            setChatWindowOpen(isChatWindowOpen)
        } else {
            setChatWindowOpen(false)
        }
    }, [lastMessageReceivedAt, setChatWindowOpen])

    useEffect(() => {
        const channel = supabase
            .channel('last-message-received-channel')
            .on<Contact>('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'contacts',
                filter: `wa_id=eq.${params.wa_id}`
            }, payload => {
                if (payload.new.last_message_received_at) {
                    setLastMessageReceivedAt(new Date(payload.new.last_message_received_at))
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [supabase, params.wa_id])

    const onTemplateSubmit = useCallback(async (req: TemplateRequest) => {
        setMessageTemplateSending(true)
        const formData = new FormData();
        formData.set('to', params.wa_id);
        formData.set('template', JSON.stringify(req));
        try {
            const response = await fetch('/api/sendMessage', {
                method: 'POST',
                body: formData,
            })
            if (response.status === 200) {
                console.log('successful')
            } else {
                throw new Error(`Request failed with status code ${response.status}`);
            }
        } finally {
            setMessageTemplateSending(false)
        }
    }, [params.wa_id, setMessageTemplateSending])

    return (
        <div className="h-full flex flex-row">
            <div className="bg-conversation-panel-background h-full relative flex-grow">
                <div className="bg-chat-img h-full w-full absolute bg-[length:412.5px_749.25px] opacity-40"></div>
                <div className="h-full relative flex flex-col">
                    {(() => {
                        if (contact) {
                            return (
                                <>
                                    <ChatHeader contact={contact} />
                                    <MessageListClient from={params.wa_id} />
                                    {(() => {
                                        if (typeof isChatWindowOpen !== 'undefined' && typeof contact !== 'undefined') {
                                            if (isChatWindowOpen) {
                                                return <SendMessageWrapper waId={params.wa_id} contactName={contact.profile_name || undefined} />
                                            } else {
                                                return (
                                                    <div className="p-4 bg-white flex flex-row gap-4 items-center">
                                                        <span className="text-sm">You can only send a message within 24 hours of the last customer interaction. Please wait until the customer reaches out to you again or send a template message. <a className="text-blue-500" href="https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#customer-service-windows" target="_blank" rel="noopener noreferrer">Read more</a></span>
                                                        <TemplateSelection onTemplateSubmit={onTemplateSubmit}>
                                                            <Button disabled={messageTemplateSending} className="min-w-fit">
                                                                {messageTemplateSending && <><TWLoader className="w-5 h-5" /> &nbsp;&nbsp; </>}
                                                                Send template message
                                                            </Button>
                                                        </TemplateSelection>
                                                    </div>
                                                )
                                            }
                                        }
                                        return <></>
                                    })()}
                                </>
                            )
                        } else {
                            return (
                                <div className="flex flex-col justify-center items-center h-full gap-2">
                                    <CircleAlertIcon/>
                                    <span className="text-lg">Chat does not exists</span>
                                </div>
                            )
                        }
                    })()}
                </div>
            </div>
            {/* <div className="w-72 flex-shrink-0 p-4">
                <div>
                    <h3 className="font-bold">Assign Chat to Agent</h3>
                    <div className="mt-2">No agent has been assigned to this chat. Please assign an agent for further interaction.</div>
                    <Button className="mt-2">Assign to Agent</Button>
                </div>
            </div> */}
        </div>
    )
}