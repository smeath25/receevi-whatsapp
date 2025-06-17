"use client"

import * as React from "react"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
  date?: Date
  setDate: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date
}

export function DateTimePicker({
  date,
  setDate,
  placeholder = "Pick a date and time",
  className,
  disabled = false,
  minDate = new Date()
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [timeValue, setTimeValue] = React.useState(
    date ? format(date, "HH:mm") : "09:00"
  )

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Combine date with time
      const [hours, minutes] = timeValue.split(":").map(Number)
      const newDateTime = new Date(selectedDate)
      newDateTime.setHours(hours, minutes, 0, 0)
      setDate(newDateTime)
    } else {
      setDate(undefined)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTimeValue(newTime)
    
    if (date) {
      const [hours, minutes] = newTime.split(":").map(Number)
      const newDateTime = new Date(date)
      newDateTime.setHours(hours, minutes, 0, 0)
      setDate(newDateTime)
    }
  }

  const isDateDisabled = (testDate: Date) => {
    if (minDate) {
      // Check if the date is before minDate (ignoring time)
      const testDateOnly = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate())
      const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
      return testDateOnly < minDateOnly
    }
    return false
  }

  const isTimeValid = () => {
    if (!date || !minDate) return true
    
    const selectedDateTime = new Date(date)
    const [hours, minutes] = timeValue.split(":").map(Number)
    selectedDateTime.setHours(hours, minutes, 0, 0)
    
    return selectedDateTime >= minDate
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP 'at' HH:mm") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            disabled={isDateDisabled}
            initialFocus
          />
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <Label htmlFor="time">Time</Label>
            </div>
            <div className="mt-2">
              <Input
                id="time"
                type="time"
                value={timeValue}
                onChange={handleTimeChange}
                className={cn(
                  "w-full",
                  !isTimeValid() && "border-destructive"
                )}
              />
              {!isTimeValid() && (
                <p className="text-sm text-destructive mt-1">
                  Time must be in the future
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}