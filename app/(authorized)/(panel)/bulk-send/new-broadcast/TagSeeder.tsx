'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface TagSeederProps {
    hasNoTags: boolean
}

export function TagSeeder({ hasNoTags }: TagSeederProps) {
    const [isSeeding, setIsSeeding] = useState(false)

    const handleSeedTags = async () => {
        setIsSeeding(true)
        try {
            const response = await fetch('/api/seed-tags', { method: 'POST' })
            if (response.ok) {
                const result = await response.json()
                console.log('Seeding result:', result)
                // Reload to refresh the server component with new tags
                window.location.reload()
            } else {
                const error = await response.json()
                console.error('Failed to seed tags:', error)
                alert('Failed to create sample tags. Please try again.')
            }
        } catch (error) {
            console.error('Error seeding tags:', error)
            alert('Error creating sample tags. Please try again.')
        } finally {
            setIsSeeding(false)
        }
    }

    if (!hasNoTags) {
        return null
    }

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSeedTags}
            disabled={isSeeding}
            className="h-8"
        >
            {isSeeding ? 'Creating...' : 'Create Sample Tags'}
        </Button>
    )
}