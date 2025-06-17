"use client"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BookmarkIcon, Trash2 } from "lucide-react"
import { AdvancedFilterOptions } from "./AdvancedFilters"

export interface SavedFilter {
    id: string
    name: string
    filters: AdvancedFilterOptions
    createdAt: Date
}

interface SavedFiltersProps {
    savedFilters: SavedFilter[]
    onLoadFilter: (filters: AdvancedFilterOptions) => void
    onDeleteFilter: (id: string) => void
}

export function SavedFilters({ 
    savedFilters, 
    onLoadFilter, 
    onDeleteFilter 
}: SavedFiltersProps) {
    if (savedFilters.length === 0) {
        return null
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10">
                    <BookmarkIcon className="h-4 w-4 mr-2" />
                    Saved Filters ({savedFilters.length})
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Saved Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {savedFilters.map((savedFilter) => (
                    <div key={savedFilter.id} className="flex items-center">
                        <DropdownMenuItem 
                            className="flex-1 cursor-pointer"
                            onClick={() => onLoadFilter(savedFilter.filters)}
                        >
                            <div className="flex flex-col">
                                <span className="font-medium">{savedFilter.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    {savedFilter.createdAt.toLocaleDateString()}
                                </span>
                            </div>
                        </DropdownMenuItem>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 mr-2"
                            onClick={(e) => {
                                e.stopPropagation()
                                onDeleteFilter(savedFilter.id)
                            }}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}