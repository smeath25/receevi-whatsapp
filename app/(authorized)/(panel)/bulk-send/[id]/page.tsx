import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { BroadcastServerFactory } from "@/lib/repositories/broadcast/BroadcastServerFactory"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import BroadcastContactsClient from "./BroadcastContactsClient"

interface BroadcastDetailPageProps {
    params: { id: string }
    searchParams: { [key: string]: string | string[] | undefined }
}

export default async function BroadcastDetailPage({
    params,
    searchParams,
}: BroadcastDetailPageProps) {
    const broadcastId = params.id;
    const page = parseInt((searchParams.page as string) || '1');

    // Get broadcast details
    const broadcastServer = BroadcastServerFactory.getInstance();
    const broadcasts = await broadcastServer.getAllBroadcasts(1);
    const broadcast = broadcasts.find(b => b.id === broadcastId);

    if (!broadcast) {
        return (
            <div className="m-4 bg-white p-4 rounded-xl">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-red-600">Broadcast Not Found</h2>
                    <p className="text-gray-600 mt-2">The requested broadcast could not be found.</p>
                    <Link href="/bulk-send" className="mt-4 inline-block">
                        <Button variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Broadcasts
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="m-4 bg-white p-4 rounded-xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/bulk-send">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold">{broadcast.name}</h1>
                            <p className="text-gray-600">Broadcast Details</p>
                        </div>
                    </div>
                </div>

                {/* Broadcast Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{broadcast.sent_count}</div>
                        <div className="text-sm text-gray-600">Sent</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{broadcast.delivered_count}</div>
                        <div className="text-sm text-gray-600">Delivered</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{broadcast.read_count}</div>
                        <div className="text-sm text-gray-600">Read</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{broadcast.replied_count}</div>
                        <div className="text-sm text-gray-600">Replied</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{broadcast.failed_count}</div>
                        <div className="text-sm text-gray-600">Failed</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">{broadcast.processed_count}</div>
                        <div className="text-sm text-gray-600">Total</div>
                    </div>
                </div>

                {/* Broadcast Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Template</h3>
                        <p>{broadcast.template_name} ({broadcast.language})</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Tags</h3>
                        <p>{broadcast.contact_tags?.join(', ') || 'No tags'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Created</h3>
                        <p>{new Date(broadcast.created_at).toLocaleString()}</p>
                    </div>
                </div>

                {/* Recipients Table */}
                <div>
                    <h2 className="text-xl font-bold mb-4">Individual Recipients</h2>
                    <BroadcastContactsClient broadcastId={broadcastId} initialPage={page} />
                </div>
            </div>
        </div>
    );
}