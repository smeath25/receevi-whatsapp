"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Tag } from "lucide-react"
import { AdvancedFilterOptions } from "./AdvancedFilters"

interface SmartListsProps {
    onSelectSmartList: (filters: AdvancedFilterOptions, name: string) => void
    contactCounts?: {
        total: number
        active: number
        inactive: number
        untagged: number
    }
}

export function SmartLists({ onSelectSmartList, contactCounts }: SmartListsProps) {
    const smartLists = [
        {
            name: "All Contacts",
            icon: Users,
            filters: {},
            count: contactCounts?.total,
            description: "All contacts in your database"
        },
        {
            name: "Active (24h)",
            icon: UserCheck,
            filters: { activityStatus: 'active' as const },
            count: contactCounts?.active,
            description: "Contacts active in the last 24 hours"
        },
        {
            name: "Inactive",
            icon: UserX,
            filters: { activityStatus: 'inactive' as const },
            count: contactCounts?.inactive,
            description: "Contacts with no recent activity"
        },
        {
            name: "Untagged",
            icon: Tag,
            filters: { activityStatus: 'untagged' as const },
            count: contactCounts?.untagged,
            description: "Contacts without any tags"
        }
    ]

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Smart Lists</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {smartLists.map((list) => {
                    const Icon = list.icon
                    return (
                        <Button
                            key={list.name}
                            variant="outline"
                            className="h-auto p-3 flex flex-col items-start text-left"
                            onClick={() => onSelectSmartList(list.filters, list.name)}
                        >
                            <div className="flex items-center w-full mb-2">
                                <Icon className="h-4 w-4 mr-2" />
                                <span className="font-medium text-sm">{list.name}</span>
                                {list.count !== undefined && (
                                    <Badge variant="secondary" className="ml-auto text-xs">
                                        {list.count}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {list.description}
                            </span>
                        </Button>
                    )
                })}
            </div>
        </div>
    )
}