'use client';

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { addMinutes } from "date-fns";

export default function SchedulingSection() {
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
        addMinutes(new Date(), 15) // Default to 15 minutes from now
    );

    const handleScheduledChange = (checked: boolean) => {
        setIsScheduled(checked);
        if (!checked) {
            // Reset the date when unchecked
            setScheduledDate(addMinutes(new Date(), 15));
        }
    };

    return (
        <div className="grid gap-3">
            <div className="flex items-center space-x-2">
                <Checkbox 
                    id="schedule_campaign" 
                    checked={isScheduled}
                    onCheckedChange={handleScheduledChange}
                />
                <Label htmlFor="schedule_campaign" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Schedule this campaign for later
                </Label>
            </div>
            
            {isScheduled && (
                <div className="grid gap-1.5 ml-6">
                    <Label htmlFor="scheduled_at">Scheduled Date & Time</Label>
                    <DateTimePicker
                        date={scheduledDate}
                        setDate={setScheduledDate}
                        placeholder="Select date and time"
                        className="w-[20rem]"
                        minDate={new Date()} // Prevent scheduling in the past
                    />
                    <p className="text-xs text-gray-500">
                        Campaign will be sent at the specified time. Make sure your timezone is correct.
                    </p>
                </div>
            )}
            
            {!isScheduled && (
                <div className="ml-6">
                    <p className="text-xs text-gray-500">
                        Campaign will be sent immediately after creation.
                    </p>
                </div>
            )}
            
            {/* Always present hidden inputs - no duplicates */}
            <input 
                type="hidden" 
                name="scheduled_at" 
                value={isScheduled && scheduledDate ? scheduledDate.toISOString() : ''} 
            />
            <input 
                type="hidden" 
                name="is_scheduled" 
                value={isScheduled ? 'true' : 'false'} 
            />
        </div>
    );
}