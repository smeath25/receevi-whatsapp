'use client'

import { Label } from "@/components/ui/label"
import { MultiSelectDropdown } from "./MultiSelectDropdown"
import { TagSeeder } from "./TagSeeder"
import { useQuery } from '@tanstack/react-query'
import ContactTagBrowserFactory from "@/lib/repositories/contact-tag/ContactTagBrowserFactory"
import { useSupabase } from "@/components/supabase-provider"
import { useEffect } from "react"

function convertToOptions(value: string): { value: string; label: string } {
    return {
        value: value,
        label: value,
    }
}

async function fetchContactTags(supabase: any) {
    const contactTagRepo = ContactTagBrowserFactory.getInstance(supabase)
    
    try {
        let contactTags = await contactTagRepo.getContactTags()
        console.log('Contact tags fetched:', contactTags)
        
        // If no tags found in contact_tag table, try to get unique tags from contacts
        if (contactTags.length === 0) {
            console.log('No tags in contact_tag table, fetching unique tags from contacts...')
            try {
                const { data: contacts, error } = await supabase
                    .from('contacts')
                    .select('tags')
                    .not('tags', 'is', null)
                
                if (!error && contacts) {
                    const allTags = contacts.flatMap((contact: any) => contact.tags || [])
                    contactTags = [...new Set(allTags as string[])].sort()
                    console.log('Unique tags from contacts:', contactTags)
                }
            } catch (fallbackError) {
                console.error('Error fetching tags from contacts:', fallbackError)
            }
        }
        
        return contactTags
    } catch (error) {
        console.error('Error fetching contact tags:', error)
        return []
    }
}

export default function ContactTagsClient() {
    const { supabase } = useSupabase()
    
    const { data: contactTags = [], isLoading, refetch } = useQuery({
        queryKey: ['contact-tags'],
        queryFn: () => fetchContactTags(supabase),
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
    })
    
    // Set up real-time subscription for contact_tag changes
    useEffect(() => {
        const channel = supabase
            .channel('contact-tags-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'contact_tag',
                },
                () => {
                    console.log('Contact tags changed, refetching...')
                    refetch()
                }
            )
            .on(
                'postgres_changes', 
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'contacts',
                },
                () => {
                    console.log('Contact updated, refetching tags...')
                    refetch()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, refetch])
    
    const contactTagOptions = contactTags.map(convertToOptions)
    
    if (isLoading) {
        return (
            <div className="grid gap-1.5">
                <Label htmlFor="contact_tags">Contact Tags</Label>
                <div className="w-[20rem] h-10 bg-gray-100 rounded animate-pulse" />
                <p className="text-xs text-gray-500">Loading tags...</p>
            </div>
        )
    }
    
    return (
        <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
                <Label htmlFor="contact_tags">Contact Tags</Label>
                <TagSeeder hasNoTags={contactTagOptions.length === 0} />
            </div>
            <MultiSelectDropdown 
                name="contact_tags" 
                displayName="tag" 
                className="w-[20rem]" 
                options={contactTagOptions} 
            />
            {contactTagOptions.length === 0 && (
                <p className="text-sm text-amber-600">
                    No tags available. Click &quot;Create Sample Tags&quot; above or add tags to contacts first.
                </p>
            )}
            {contactTagOptions.length > 0 && (
                <p className="text-xs text-gray-500">
                    {contactTagOptions.length} tag(s) available for selection.
                </p>
            )}
        </div>
    )
}