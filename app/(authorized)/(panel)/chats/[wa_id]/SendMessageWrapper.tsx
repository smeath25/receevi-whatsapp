'use client';

import { useCallback, useState } from "react";
import SendMessageUI, { FileType } from "./SendMessageUI";
import { TemplateRequest } from "@/types/message-template-request";
import { ScheduledMessageFormData } from "@/types/scheduled-message";

export default function SendMessageWrapper({ waId, contactName }: { waId: string, contactName?: string }) {
    const [message, setMessage] = useState<string>('');
    const [fileType, setFileType] = useState<FileType | undefined>();
    const [file, setFile] = useState<File | undefined>();
    const onMessageSend = useCallback(async () => {
        const formData = new FormData();
        formData.set('to', waId);
        formData.set('message', message.trim());
        if (typeof file !== 'undefined' && typeof fileType !== 'undefined') {
            formData.set('fileType', fileType)
            formData.set('file', file)
        }
        const response = await fetch('/api/sendMessage', {
            method: 'POST',
            body: formData,
        })
        if (response.status === 200) {
            setMessage('')
            setFileType(undefined)
            setFile(undefined)
        } else {
            throw new Error(`Request failed with status code ${response.status}`);
        }
    }, [waId, file, fileType, message])

    const onTemplateMessageSend = useCallback(async (req: TemplateRequest) => {
        const formData = new FormData();
        formData.set('to', waId);
        formData.set('template', JSON.stringify(req));
        const response = await fetch('/api/sendMessage', {
            method: 'POST',
            body: formData,
        })
        if (response.status === 200) {
            console.log('successful')
        } else {
            throw new Error(`Request failed with status code ${response.status}`);
        }

    }, [waId])

    const onScheduleMessage = useCallback(async (data: ScheduledMessageFormData) => {
        const formData = new FormData();
        formData.set('to', waId);
        formData.set('scheduledAt', data.scheduledDateTime.toISOString());
        
        if (data.message?.trim()) {
            formData.set('message', data.message.trim());
        }
        
        if (data.file && data.fileType) {
            formData.set('fileType', data.fileType);
            formData.set('file', data.file);
        }
        
        if (data.template) {
            formData.set('template', JSON.stringify(data.template));
        }

        const response = await fetch('/api/scheduleMessage', {
            method: 'POST',
            body: formData,
        });

        if (response.status === 200) {
            // Clear form on successful scheduling
            setMessage('');
            setFileType(undefined);
            setFile(undefined);
            
            // TODO: Show success toast
            console.log('Message scheduled successfully');
        } else {
            const errorText = await response.text();
            throw new Error(`Failed to schedule message: ${errorText}`);
        }
    }, [waId]);

    return (
        <SendMessageUI 
            message={message} 
            file={file} 
            fileType={fileType} 
            setMessage={setMessage} 
            setFileType={setFileType} 
            setFile={setFile} 
            onMessageSend={onMessageSend} 
            onTemplateMessageSend={onTemplateMessageSend}
            onScheduleMessage={onScheduleMessage}
            contactName={contactName}
            waId={waId}
        />
    )
}