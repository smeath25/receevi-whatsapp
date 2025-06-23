'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play } from "lucide-react";

export default function ScheduledCampaignsClient() {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleProcessScheduled = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch('/api/process-scheduled-campaigns', {
                method: 'POST',
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Scheduled campaigns processed:', result);
                // Refresh the page to show updated status
                window.location.reload();
            } else {
                console.error('Failed to process scheduled campaigns');
            }
        } catch (error) {
            console.error('Error processing scheduled campaigns:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
            <div>
                <h3 className="font-medium text-blue-900">Process Scheduled Campaigns</h3>
                <p className="text-sm text-blue-700">
                    Manually trigger processing of campaigns that are due to be sent
                </p>
            </div>
            <Button 
                onClick={handleProcessScheduled}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
            >
                {isProcessing ? (
                    <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <Play className="w-4 h-4 mr-2" />
                        Process Now
                    </>
                )}
            </Button>
        </div>
    );
}