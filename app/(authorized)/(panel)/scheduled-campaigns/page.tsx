import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BroadcastServerFactory } from "@/lib/repositories/broadcast/BroadcastServerFactory"
import Link from "next/link"
import { Calendar, Clock, Users, Tag } from "lucide-react"
import ScheduledCampaignsClient from "./ScheduledCampaignsClient"

export default async function ScheduledCampaignsPage({
    params,
    searchParams,
}: {
    params: { slug: string }
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const pageString = searchParams['page']
    let page = 1;
    if (pageString && typeof pageString === 'string') {
        const parsedPage = parseInt(pageString)
        if (!isNaN(parsedPage)) {
            page = parsedPage;
        }
    }

    const broadcastServer = BroadcastServerFactory.getInstance()
    const scheduledBroadcasts = await broadcastServer.getScheduledBroadcasts(page)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled':
                return 'bg-blue-100 text-blue-800'
            case 'processing':
                return 'bg-yellow-100 text-yellow-800'
            case 'completed':
                return 'bg-green-100 text-green-800'
            case 'failed':
                return 'bg-red-100 text-red-800'
            case 'cancelled':
                return 'bg-gray-100 text-gray-800'
            default:
                return 'bg-gray-100 text-gray-600'
        }
    }

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString()
    }

    return (
        <div className="m-4 bg-white p-4 rounded-xl">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Scheduled Campaigns</h1>
                        <p className="text-gray-600">Manage your scheduled broadcast campaigns</p>
                    </div>
                    <div className="space-x-2">
                        <Link href="/bulk-send">
                            <Button variant="outline">All Campaigns</Button>
                        </Link>
                        <Link href="/bulk-send/new-broadcast">
                            <Button>New Campaign</Button>
                        </Link>
                    </div>
                </div>

                {/* Client-side functionality */}
                <ScheduledCampaignsClient />

                {/* Scheduled Campaigns Table */}
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campaign Name</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead>Scheduled For</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scheduledBroadcasts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <div className="flex flex-col items-center space-y-2">
                                            <Calendar className="w-8 h-8 text-gray-400" />
                                            <p className="text-gray-500">No scheduled campaigns found</p>
                                            <Link href="/bulk-send/new-broadcast">
                                                <Button variant="outline" size="sm">
                                                    Create Your First Scheduled Campaign
                                                </Button>
                                            </Link>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                scheduledBroadcasts.map((broadcast) => (
                                    <TableRow key={broadcast.id}>
                                        <TableCell className="font-medium">
                                            <Link 
                                                href={`/bulk-send/${broadcast.id}`}
                                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                {broadcast.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center space-x-1">
                                                <span>{broadcast.template_name}</span>
                                                <span className="text-sm text-gray-500">({broadcast.language})</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {broadcast.contact_tags?.slice(0, 2).map((tag, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                        <Tag className="w-3 h-3 mr-1" />
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {broadcast.contact_tags && broadcast.contact_tags.length > 2 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        +{broadcast.contact_tags.length - 2} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {broadcast.scheduled_at ? (
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm">
                                                        {formatDateTime(broadcast.scheduled_at)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="secondary" 
                                                className={getStatusColor(broadcast.status)}
                                            >
                                                {broadcast.status.charAt(0).toUpperCase() + broadcast.status.slice(1)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-500">
                                                {formatDateTime(broadcast.created_at)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end space-x-2">
                                                <Link href={`/bulk-send/${broadcast.id}`}>
                                                    <Button variant="ghost" size="sm">
                                                        View
                                                    </Button>
                                                </Link>
                                                {broadcast.status === 'scheduled' && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-800"
                                                        onClick={() => {
                                                            // TODO: Implement cancel functionality
                                                            console.log('Cancel campaign:', broadcast.id)
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {scheduledBroadcasts.length > 0 && (
                    <div className="flex justify-center space-x-2">
                        <Link href={`/scheduled-campaigns?page=${Math.max(1, page - 1)}`}>
                            <Button variant="outline" size="sm" disabled={page <= 1}>
                                Previous
                            </Button>
                        </Link>
                        <span className="flex items-center px-4 py-2 text-sm text-gray-600">
                            Page {page}
                        </span>
                        <Link href={`/scheduled-campaigns?page=${page + 1}`}>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={scheduledBroadcasts.length < 10}
                            >
                                Next
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}