'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ScheduledMessagesClient from './pageClient'

const queryClient = new QueryClient()

export default function ScheduledMessages() {
    return (
        <QueryClientProvider client={queryClient}>
            <ScheduledMessagesClient />
        </QueryClientProvider>
    )
}