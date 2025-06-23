'use client';

import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download, RefreshCw } from "lucide-react";

interface Contact {
    wa_id: number;
    profile_name: string | null;
    tags: string[] | null;
}

interface BroadcastContact {
    id: string;
    contact_id: number;
    sent_at: string | null;
    delivered_at: string | null;
    read_at: string | null;
    replied_at: string | null;
    failed_at: string | null;
    wam_id: string | null;
    contact?: Contact;
}

interface ApiResponse {
    success: boolean;
    data: {
        contacts: BroadcastContact[];
        pagination: {
            page: number;
            totalCount: number;
            pageSize: number;
            totalPages: number;
        };
    };
}

interface BroadcastContactsClientProps {
    broadcastId: string;
    initialPage: number;
}

const getStatusDisplay = (contact: BroadcastContact): { status: string; color: string; timestamp: string | null } => {
    // Priority order: Failed > Replied > Read > Delivered > Sent > Pending
    if (contact.failed_at) {
        return { status: 'Failed', color: 'bg-red-100 text-red-800', timestamp: contact.failed_at };
    }
    if (contact.replied_at) {
        return { status: 'Replied', color: 'bg-green-100 text-green-800', timestamp: contact.replied_at };
    }
    if (contact.read_at) {
        return { status: 'Read', color: 'bg-blue-100 text-blue-800', timestamp: contact.read_at };
    }
    if (contact.delivered_at) {
        return { status: 'Delivered', color: 'bg-yellow-100 text-yellow-800', timestamp: contact.delivered_at };
    }
    if (contact.sent_at) {
        return { status: 'Sent', color: 'bg-gray-100 text-gray-800', timestamp: contact.sent_at };
    }
    return { status: 'Pending', color: 'bg-gray-100 text-gray-500', timestamp: null };
};

export default function BroadcastContactsClient({ broadcastId, initialPage }: BroadcastContactsClientProps) {
    const [contacts, setContacts] = useState<BroadcastContact[]>([]);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchContacts = async (page: number) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/broadcast/${broadcastId}?page=${page}`);
            const data: ApiResponse = await response.json();

            if (data.success) {
                setContacts(data.data.contacts);
                setCurrentPage(data.data.pagination.page);
                setTotalPages(data.data.pagination.totalPages);
                setTotalCount(data.data.pagination.totalCount);
            }
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts(currentPage);
    }, [broadcastId, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredContacts = contacts.filter(contact => {
        const matchesSearch = !searchTerm || 
            contact.contact?.profile_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.contact?.wa_id.toString().includes(searchTerm);
        
        if (statusFilter === 'all') return matchesSearch;
        
        const { status } = getStatusDisplay(contact);
        return matchesSearch && status.toLowerCase() === statusFilter.toLowerCase();
    });

    const exportContacts = () => {
        const csvContent = [
            ['Contact Name', 'Phone Number', 'Status', 'Sent At', 'Delivered At', 'Read At', 'Replied At', 'Failed At', 'WhatsApp Message ID'].join(','),
            ...filteredContacts.map(contact => {
                const { status } = getStatusDisplay(contact);
                return [
                    contact.contact?.profile_name || 'Unknown',
                    contact.contact?.wa_id || '',
                    status,
                    contact.sent_at || '',
                    contact.delivered_at || '',
                    contact.read_at || '',
                    contact.replied_at || '',
                    contact.failed_at || '',
                    contact.wam_id || ''
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `broadcast-${broadcastId}-contacts.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search contacts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="read">Read</SelectItem>
                            <SelectItem value="replied">Replied</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchContacts(currentPage)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportContacts}>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="text-sm text-gray-600">
                Showing {filteredContacts.length} of {totalCount} recipients
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Contact Name</TableHead>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Sent At</TableHead>
                            <TableHead>Delivered At</TableHead>
                            <TableHead>Read At</TableHead>
                            <TableHead>Replied At</TableHead>
                            <TableHead>Failed At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8">
                                    <div className="flex items-center justify-center">
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                        Loading contacts...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredContacts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8">
                                    No contacts found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredContacts.map((contact) => {
                                const { status, color } = getStatusDisplay(contact);
                                return (
                                    <TableRow key={contact.id}>
                                        <TableCell className="font-medium">
                                            {contact.contact?.profile_name || 'Unknown'}
                                        </TableCell>
                                        <TableCell>+{contact.contact?.wa_id}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={color}>
                                                {status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{contact.sent_at ? new Date(contact.sent_at).toLocaleString() : '-'}</TableCell>
                                        <TableCell>{contact.delivered_at ? new Date(contact.delivered_at).toLocaleString() : '-'}</TableCell>
                                        <TableCell>{contact.read_at ? new Date(contact.read_at).toLocaleString() : '-'}</TableCell>
                                        <TableCell>{contact.replied_at ? new Date(contact.replied_at).toLocaleString() : '-'}</TableCell>
                                        <TableCell>{contact.failed_at ? new Date(contact.failed_at).toLocaleString() : '-'}</TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}