import { Contact } from "@/types/contact"

export function exportContactsToCSV(contacts: Contact[], filename: string = 'contacts-export.csv') {
    if (contacts.length === 0) {
        throw new Error('No contacts to export')
    }

    // Define CSV headers
    const headers = [
        'WhatsApp ID',
        'Profile Name', 
        'Tags',
        'Created At',
        'Last Message At',
        'Last Message Received At',
        'Unread Count',
        'Assigned To',
        'In Chat'
    ]

    // Convert contacts to CSV rows
    const csvData = contacts.map(contact => [
        contact.wa_id.toString(),
        contact.profile_name || '',
        (contact.tags || []).join('; '),
        contact.created_at || '',
        contact.last_message_at || '',
        contact.last_message_received_at || '',
        contact.unread_count?.toString() || '0',
        contact.assigned_to || '',
        contact.in_chat ? 'Yes' : 'No'
    ])

    // Combine headers and data
    const allRows = [headers, ...csvData]

    // Convert to CSV string
    const csvContent = allRows
        .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
        .join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }
}

export function generateExportFilename(filterSummary: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const cleanFilterSummary = filterSummary
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 50)
    
    return `contacts-${cleanFilterSummary}-${timestamp}.csv`
}