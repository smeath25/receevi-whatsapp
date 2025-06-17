'use client';

import React, { useMemo, useState } from 'react'
import { SelectOption, SingleSelectDropdown, emptyOption } from './SingleSelectDropdown'
import { Label } from '@radix-ui/react-label'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { getTemplateLanguges } from '@/lib/bulk-send';

export default function MessageTemplateWithLanguage({ messageTemplates: messageTemplatesOptions }: { messageTemplates: SelectOption[] }) {
    const [languages, setLanguages] = useState<SelectOption[]>([])
    const [messageTemplate, setMessageTemplate] = React.useState<SelectOption>(emptyOption)
    const [language, setLanguage] = React.useState<SelectOption>(emptyOption)
    const [isLoadingLanguages, setIsLoadingLanguages] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    async function onMessageTemplateChange(messageTemplate: SelectOption) {
        setMessageTemplate(messageTemplate)
        console.log('messageTemplate', messageTemplate.value)
        
        if (messageTemplate.value) {
            setIsLoadingLanguages(true)
            try {
                const languagesFromServer = await getTemplateLanguges(messageTemplate.value)
                setLanguages(languagesFromServer.map(item => {
                    return {
                        value: item,
                        label: item
                    }
                }))
            } catch (error) {
                console.error('Error fetching languages:', error)
                setLanguages([])
            } finally {
                setIsLoadingLanguages(false)
            }
        } else {
            setLanguages([])
        }
        setLanguage(emptyOption)
    }

    async function refreshTemplates() {
        setRefreshing(true)
        try {
            // Call the API to refresh templates from WhatsApp
            await fetch('/api/whatsapp-templates?refresh=true')
            // Reload the page to get fresh data
            window.location.reload()
        } catch (error) {
            console.error('Error refreshing templates:', error)
        } finally {
            setRefreshing(false)
        }
    }
    return (
        <>
            <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="message_template">Message Template</Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={refreshTemplates}
                        disabled={refreshing}
                        className="h-8"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh from WhatsApp'}
                    </Button>
                </div>
                <SingleSelectDropdown name="message_template" displayName="message template"
                    className="w-[20rem]" options={messageTemplatesOptions}
                    value={messageTemplate} onChange={onMessageTemplateChange} />
                {messageTemplatesOptions.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>No templates found. Try refreshing from WhatsApp or check your API configuration.</span>
                    </div>
                )}
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="language">Language</Label>
                <SingleSelectDropdown name="language" displayName="language"
                    className="w-[20rem]" options={languages}
                    value={language} onChange={(value) => setLanguage(value)} 
                    disabled={isLoadingLanguages || !messageTemplate.value} />
                {isLoadingLanguages && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Loading languages...</span>
                    </div>
                )}
                {messageTemplate.value && languages.length === 0 && !isLoadingLanguages && (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>No languages found for this template.</span>
                    </div>
                )}
            </div>
        </>
    )
}
