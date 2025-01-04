'use client'

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/supabase-provider";
import { DownloadIcon, FileIcon } from "lucide-react";

export default function ReceivedDocumentMessageUI({ message }: { message: DBMessage }) {
    const { supabase } = useSupabase()
    const [documentUrl, setDocumentUrl] = useState<string | null>(null);
    useEffect(() => {
        if (message.media_url) {
            supabase
                .storage
                .from('media')
                .createSignedUrl(message.media_url, 60)
                .then(({ data, error }) => {
                    if (error) throw error
                    setDocumentUrl(data.signedUrl)
                })
        }
    }, [message.media_url, supabase.storage, setDocumentUrl])

    return (
        <div className="bg-[#00000011] p-2 rounded-md flex flex-row gap-2">
            <FileIcon />
            <span>{message.message.document.filename}</span>
            {(() => {
                if (documentUrl) {
                    return <a href={documentUrl} download={message.message.document.filename} target="_blank"><DownloadIcon /></a>
                }
            })()}
        </div>
    )
}
