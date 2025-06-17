"use client"

import { useState } from "react"
import { Calendar, Clock, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { ScheduledMessageFormData } from "@/types/scheduled-message"
import { TemplateRequest } from "@/types/message-template-request"

interface ScheduleMessageDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSchedule: (data: ScheduledMessageFormData) => Promise<void>
  message?: string
  file?: File
  fileType?: 'image' | 'video' | 'document'
  template?: TemplateRequest
  contactName?: string
}

export function ScheduleMessageDialog({
  isOpen,
  onOpenChange,
  onSchedule,
  message,
  file,
  fileType,
  template,
  contactName
}: ScheduleMessageDialogProps) {
  const [scheduledDateTime, setScheduledDateTime] = useState<Date>()
  const [isLoading, setIsLoading] = useState(false)

  const handleSchedule = async () => {
    if (!scheduledDateTime) return

    setIsLoading(true)
    try {
      await onSchedule({
        message,
        file,
        fileType,
        template,
        scheduledDateTime
      })
      onOpenChange(false)
      setScheduledDateTime(undefined)
    } catch (error) {
      console.error('Failed to schedule message:', error)
      // TODO: Show error toast
    } finally {
      setIsLoading(false)
    }
  }

  const getMessagePreview = () => {
    if (template) {
      return `Template message: ${template.name}`
    }
    if (file) {
      return `${fileType} file: ${file.name}${message ? ` with caption: "${message}"` : ''}`
    }
    return message || 'Empty message'
  }

  const isValidDateTime = scheduledDateTime && scheduledDateTime > new Date()

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Message
          </DialogTitle>
          <DialogDescription>
            Schedule a message to be sent to {contactName || 'this contact'} at a specific date and time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Message Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Message Preview</h4>
            <div className="p-3 rounded-lg bg-muted text-sm">
              {getMessagePreview()}
            </div>
          </div>

          {/* Date Time Picker */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Schedule For</h4>
            <DateTimePicker
              date={scheduledDateTime}
              setDate={setScheduledDateTime}
              placeholder="Select date and time"
              minDate={new Date()}
            />
          </div>

          {/* Schedule Info */}
          {scheduledDateTime && (
            <div className="p-3 rounded-lg bg-blue-50 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Message will be sent on{' '}
                  <strong>
                    {scheduledDateTime.toLocaleDateString()} at{' '}
                    {scheduledDateTime.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!isValidDateTime || isLoading}
          >
            {isLoading ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Schedule Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}