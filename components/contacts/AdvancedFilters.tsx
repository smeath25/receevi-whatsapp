"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Filter, X, Download } from "lucide-react"
import { useState } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export interface AdvancedFilterOptions {
    name?: string
    tags?: string[]
    dateRange?: {
        from?: Date
        to?: Date
    }
    activityStatus?: 'all' | 'active' | 'inactive' | 'untagged'
    lastMessageRange?: {
        from?: Date
        to?: Date
    }
    assignedTo?: string
}

interface AdvancedFiltersProps {
    filters: AdvancedFilterOptions
    onFiltersChange: (filters: AdvancedFilterOptions) => void
    onExport: () => void
    onSaveFilter: (name: string, filters: AdvancedFilterOptions) => void
    availableTags?: string[]
    availableAgents?: Array<{ id: string, name: string }>
}

export function AdvancedFilters({
    filters,
    onFiltersChange,
    onExport,
    onSaveFilter,
    availableTags = [],
    availableAgents = []
}: AdvancedFiltersProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [saveFilterName, setSaveFilterName] = useState("")
    const [showSaveDialog, setShowSaveDialog] = useState(false)

    const updateFilter = (key: keyof AdvancedFilterOptions, value: any) => {
        onFiltersChange({ ...filters, [key]: value })
    }

    const clearFilters = () => {
        onFiltersChange({})
    }

    const hasActiveFilters = Object.keys(filters).some(key => {
        const value = filters[key as keyof AdvancedFilterOptions]
        if (key === 'activityStatus') return value && value !== 'all'
        if (key === 'dateRange' || key === 'lastMessageRange') {
            const dateRange = value as { from?: Date; to?: Date } | undefined
            return dateRange && (dateRange.from || dateRange.to)
        }
        return value && (Array.isArray(value) ? value.length > 0 : true)
    })

    const handleSaveFilter = () => {
        if (saveFilterName.trim()) {
            onSaveFilter(saveFilterName.trim(), filters)
            setSaveFilterName("")
            setShowSaveDialog(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="h-10">
                            <Filter className="h-4 w-4 mr-2" />
                            Advanced Filters
                            {hasActiveFilters && (
                                <span className="ml-2 bg-blue-500 text-white rounded-full px-2 py-1 text-xs">
                                    Active
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-4" align="start">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium">Advanced Filters</h4>
                                {hasActiveFilters && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={clearFilters}
                                        className="h-8 px-2"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Clear
                                    </Button>
                                )}
                            </div>

                            {/* Name Filter */}
                            <div className="space-y-2">
                                <Label htmlFor="name-filter">Contact Name</Label>
                                <Input
                                    id="name-filter"
                                    placeholder="Search by name..."
                                    value={filters.name || ""}
                                    onChange={(e) => updateFilter('name', e.target.value)}
                                />
                            </div>

                            {/* Activity Status */}
                            <div className="space-y-2">
                                <Label>Activity Status</Label>
                                <Select 
                                    value={filters.activityStatus || 'all'} 
                                    onValueChange={(value) => updateFilter('activityStatus', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Contacts</SelectItem>
                                        <SelectItem value="active">Active (24h)</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="untagged">Untagged</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Tags Filter */}
                            {availableTags.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Tags</Label>
                                    <Select 
                                        value={filters.tags?.[0] || ""} 
                                        onValueChange={(value) => updateFilter('tags', value ? [value] : [])}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select tag" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">No filter</SelectItem>
                                            {availableTags.map(tag => (
                                                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Assigned Agent */}
                            {availableAgents.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Assigned Agent</Label>
                                    <Select 
                                        value={filters.assignedTo || ""} 
                                        onValueChange={(value) => updateFilter('assignedTo', value || undefined)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select agent" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All agents</SelectItem>
                                            {availableAgents.map(agent => (
                                                <SelectItem key={agent.id} value={agent.id}>
                                                    {agent.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Date Range */}
                            <div className="space-y-2">
                                <Label>Created Date Range</Label>
                                <div className="flex gap-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !filters.dateRange?.from && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.dateRange?.from ? (
                                                    format(filters.dateRange.from, "PPP")
                                                ) : (
                                                    "From date"
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={filters.dateRange?.from}
                                                onSelect={(date) => 
                                                    updateFilter('dateRange', { 
                                                        ...filters.dateRange, 
                                                        from: date 
                                                    })
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !filters.dateRange?.to && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {filters.dateRange?.to ? (
                                                    format(filters.dateRange.to, "PPP")
                                                ) : (
                                                    "To date"
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={filters.dateRange?.to}
                                                onSelect={(date) => 
                                                    updateFilter('dateRange', { 
                                                        ...filters.dateRange, 
                                                        to: date 
                                                    })
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* Save Filter */}
                            <div className="pt-2 border-t">
                                {!showSaveDialog ? (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setShowSaveDialog(true)}
                                        disabled={!hasActiveFilters}
                                        className="w-full"
                                    >
                                        Save Filter
                                    </Button>
                                ) : (
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="Filter name..."
                                            value={saveFilterName}
                                            onChange={(e) => setSaveFilterName(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <Button 
                                                size="sm" 
                                                onClick={handleSaveFilter}
                                                disabled={!saveFilterName.trim()}
                                            >
                                                Save
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => {
                                                    setShowSaveDialog(false)
                                                    setSaveFilterName("")
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                <Button 
                    variant="outline" 
                    onClick={onExport}
                    className="h-10"
                >
                    <Download className="h-4 w-4 mr-2" />
                    Export {hasActiveFilters ? 'Filtered' : 'All'}
                </Button>
            </div>
        </div>
    )
}