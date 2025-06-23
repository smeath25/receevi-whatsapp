'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ContactTagsClient from './ContactTagsClient'

const queryClient = new QueryClient()

export default function ContactTagsClientWrapper() {
    return (
        <QueryClientProvider client={queryClient}>
            <ContactTagsClient />
        </QueryClientProvider>
    )
}