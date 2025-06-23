import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { BroadcastServerFactory } from "@/lib/repositories/broadcast/BroadcastServerFactory"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import PaginationButton from "./PaginationButton"
import WatchForChanges from "./WatchForChanges"

export default async function BulkSendPage({
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
        if (!isNaN(page)) {
            page = parsedPage;
        }
    }

    const broadcastServer = BroadcastServerFactory.getInstance()
    const broadcasts = await broadcastServer.getAllBroadcasts(page)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'immediate':
                return 'bg-green-100 text-green-800'
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

    return (
        <div className="m-4 bg-white p-4 rounded-xl">
            <WatchForChanges page={page} />
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="space-x-2">
                        <Link href="/scheduled-campaigns">
                            <Button variant="outline">Scheduled Campaigns</Button>
                        </Link>
                    </div>
                    <div className="space-x-2">
                        <Link href="/bulk-send/new-broadcast">
                            <Button>New Campaign</Button>
                        </Link>
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Name</TableHead>
                            <TableHead>Template</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Scheduled/Created</TableHead>
                            <TableHead className="text-right">Sent</TableHead>
                            <TableHead className="text-right">Delivered</TableHead>
                            <TableHead className="text-right">Read</TableHead>
                            <TableHead className="text-right">Replied</TableHead>
                            <TableHead className="text-right">Failed</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {broadcasts.map((broadcast) => (
                            <TableRow key={broadcast.id}>
                                <TableCell className="font-medium">
                                    <Link 
                                        href={`/bulk-send/${broadcast.id}`}
                                        className="text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        {broadcast.name}
                                    </Link>
                                </TableCell>
                                <TableCell>{broadcast.template_name} - {broadcast.language}</TableCell>
                                <TableCell>{broadcast.contact_tags?.join(', ')}</TableCell>
                                <TableCell>
                                    <Badge 
                                        variant="secondary" 
                                        className={getStatusColor(broadcast.status)}
                                    >
                                        {broadcast.status?.charAt(0).toUpperCase() + broadcast.status?.slice(1) || 'Unknown'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {broadcast.scheduled_at ? (
                                        <div>
                                            <div className="text-sm font-medium">
                                                {new Date(broadcast.scheduled_at).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-500">Scheduled</div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="text-sm">
                                                {new Date(broadcast.created_at).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-500">Created</div>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">{broadcast.sent_count}</TableCell>
                                <TableCell className="text-right">{broadcast.delivered_count}</TableCell>
                                <TableCell className="text-right">{broadcast.read_count}</TableCell>
                                <TableCell className="text-right">{broadcast.replied_count}</TableCell>
                                <TableCell className="text-right">{broadcast.failed_count}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="text-right space-x-2">
                    <PaginationButton pagesToAdd={-1}>Previous</PaginationButton>
                    <PaginationButton pagesToAdd={1}>Next</PaginationButton>
                </div>
            </div>
        </div>
    )
}
