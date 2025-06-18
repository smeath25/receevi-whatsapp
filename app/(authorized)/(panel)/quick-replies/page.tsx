'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import QuickRepliesClient from './pageClient'

const queryClient = new QueryClient()

export default function QuickReplies() {
    return (
        <QueryClientProvider client={queryClient}>
            <QuickRepliesClient />
        </QueryClientProvider>
    )
}