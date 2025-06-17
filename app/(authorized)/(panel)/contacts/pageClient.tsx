"use client"

import {
    ColumnDef, getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel, PaginationState, SortingState, useReactTable, VisibilityState
} from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from "react"
import { Contact } from "@/types/contact"
import Loading from "../../../loading"
import { AddContactDialog } from "./AddContactDialog"
import { EditContactDialog } from "./EditContactDialog"
import { ContactsTable } from "./ContactsTable"
import { fetchData, getContactCounts, itemsPerPage } from "./fetchData"
import { AddBulkContactsDialog } from "./AddBulkContactsDialog"
import { useSupabase } from "@/components/supabase-provider"
import { AdvancedFilters, AdvancedFilterOptions } from "@/components/contacts/AdvancedFilters"
import { SavedFilters, SavedFilter } from "@/components/contacts/SavedFilters"
import { SmartLists } from "@/components/contacts/SmartLists"
import { getFilterDisplayText } from "@/lib/contacts/filterUtils"
import { exportContactsToCSV, generateExportFilename } from "@/lib/contacts/exportUtils"

export default function ContactsClient() {
    const { supabase } = useSupabase()
    const columns = useMemo<ColumnDef<Contact>[]>(
        () => [
            // {
            //     id: "select",
            //     size: 40,
            //     header: ({ table }) => (
            //         <Checkbox
            //             checked={table.getIsAllPageRowsSelected()}
            //             onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            //             aria-label="Select all"
            //         />
            //     ),
            //     cell: ({ row }) => (
            //         <Checkbox
            //             checked={row.getIsSelected()}
            //             onCheckedChange={(value) => row.toggleSelected(!!value)}
            //             aria-label="Select row"
            //         />
            //     ),
            //     enableSorting: false,
            //     enableHiding: false,
            // },
            {
                accessorKey: "wa_id",
                header: "Number",
                size: 160,
                cell: ({ row }) => (
                    <div>{row.getValue("wa_id")}</div>
                ),
            },
            {
                accessorKey: "profile_name",
                header: 'Name',
                size: 280,
                cell: ({ row }) => <div>{row.getValue("profile_name")}</div>,
            },
            {
                accessorKey: "created_at",
                header: 'Created At',
                size: 280,
                cell: ({ row }) => <div>{row.getValue("created_at")}</div>,
            },
            {
                accessorKey: "tags",
                header: 'Tags',
                size: 280,
                cell: ({ row }) => <div>{(row.getValue('tags') as unknown as string[])?.join(", ")}</div>,
            },
            {
                id: "actions",
                size: 40,
                enableHiding: false,
                cell: ({ row }) => {
                    const contact = row.original
                    
                    const handleEditContact = () => {
                        setEditingContact(contact)
                        setIsEditDialogOpen(true)
                    }
                    
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleEditContact}>
                                    Edit Contact
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(contact.wa_id.toString())}>
                                    Copy WhatsApp Number
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                },
            },
        ],
        []
    )

    const [{ pageIndex, pageSize }, setPagination] =
        React.useState<PaginationState>({
            pageIndex: 0,
            pageSize: itemsPerPage,
        })
    const [searchFilter, setSearchFilter] = useState("")
    const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterOptions>({})
    const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
    const [currentFilterName, setCurrentFilterName] = useState<string>("")
    const [editingContact, setEditingContact] = useState<Contact | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    const fetchDataOptions = {
        pageIndex,
        pageSize,
        searchFilter,
        advancedFilters
    }

    const dataQuery = useQuery({
        queryKey: ['data', fetchDataOptions],
        queryFn: () => fetchData(supabase, fetchDataOptions),
        placeholderData: keepPreviousData
    })
    
    const countsQuery = useQuery({
        queryKey: ['contact-counts'],
        queryFn: () => getContactCounts(supabase),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
    
    const defaultData = React.useMemo(() => [], [])

    const pagination = React.useMemo(
        () => ({
            pageIndex,
            pageSize,
        }),
        [pageIndex, pageSize]
    )

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    // Handler functions
    const handleFiltersChange = (newFilters: AdvancedFilterOptions) => {
        setAdvancedFilters(newFilters)
        setPagination(prev => ({ ...prev, pageIndex: 0 })) // Reset to first page
        setCurrentFilterName("") // Clear current filter name when manually changing
    }

    const handleSaveFilter = (name: string, filters: AdvancedFilterOptions) => {
        const newFilter: SavedFilter = {
            id: Date.now().toString(),
            name,
            filters,
            createdAt: new Date()
        }
        setSavedFilters(prev => [...prev, newFilter])
        setCurrentFilterName(name)
    }

    const handleLoadFilter = (filters: AdvancedFilterOptions) => {
        setAdvancedFilters(filters)
        setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }

    const handleDeleteFilter = (id: string) => {
        setSavedFilters(prev => prev.filter(f => f.id !== id))
    }

    const handleExport = async () => {
        try {
            // Fetch all matching contacts (without pagination) for export
            const exportData = await fetchData(supabase, {
                pageIndex: 0,
                pageSize: 10000, // Large number to get all results
                searchFilter,
                advancedFilters
            })
            
            if (exportData.rows.length === 0) {
                alert('No contacts match the current filters.')
                return
            }
            
            const filterSummary = getFilterDisplayText(advancedFilters)
            const filename = generateExportFilename(filterSummary)
            
            exportContactsToCSV(exportData.rows, filename)
            
            // Show success message
            alert(`Successfully exported ${exportData.rows.length} contacts to ${filename}`)
        } catch (error) {
            console.error('Export failed:', error)
            alert('Export failed. Please try again.')
        }
    }

    const handleSmartListSelect = (filters: AdvancedFilterOptions, name: string) => {
        setAdvancedFilters(filters)
        setCurrentFilterName(name)
        setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }

    const table = useReactTable<Contact>({
        data: dataQuery.data?.rows ?? defaultData,
        columns,
        manualPagination: true,
        pageCount: dataQuery.data?.pageCount ?? -1,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: setPagination,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            pagination,
        },
    })

    return (
        <div className="m-4 bg-white rounded-xl p-4">
            {/* Smart Lists */}
            <div className="mb-6">
                <SmartLists 
                    onSelectSmartList={handleSmartListSelect}
                    contactCounts={countsQuery.data}
                />
            </div>

            {/* Filter Controls */}
            <div className="space-y-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <AdvancedFilters
                        filters={advancedFilters}
                        onFiltersChange={handleFiltersChange}
                        onExport={handleExport}
                        onSaveFilter={handleSaveFilter}
                        availableTags={[]} // TODO: Get from API
                        availableAgents={[]} // TODO: Get from API
                    />
                    <SavedFilters
                        savedFilters={savedFilters}
                        onLoadFilter={handleLoadFilter}
                        onDeleteFilter={handleDeleteFilter}
                    />
                </div>
                
                {/* Current filter display */}
                {(Object.keys(advancedFilters).length > 0 || currentFilterName) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">
                            {currentFilterName ? `"${currentFilterName}"` : 'Active filters:'}
                        </span>
                        <span>{getFilterDisplayText(advancedFilters)}</span>
                    </div>
                )}
            </div>

            {/* Legacy Search - keeping for quick name search */}
            <div className="flex justify-between items-center py-4">
                <Input
                    placeholder="Quick search name..."
                    value={searchFilter}
                    onChange={(event) => setSearchFilter(event.target.value) }
                    className="max-w-sm"
                />
                <div className="space-x-2">
                    <AddBulkContactsDialog onSuccessfulAdd={dataQuery.refetch}>
                        <Button className="ml-auto">Add Bulk Contacts via CSV</Button>
                    </AddBulkContactsDialog>
                    <AddContactDialog onSuccessfulAdd={dataQuery.refetch}>
                        <Button className="ml-auto">Add Contact</Button>
                    </AddContactDialog>
                </div>
            </div>
            <div className="rounded-md border relative">
                {dataQuery.isLoading && <div className="absolute block w-full h-full bg-gray-500 opacity-30">
                    <Loading/>
                </div>}
                <ContactsTable table={table} totalColumns={columns.length} />
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                {/* <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected
                </div> */}
                {table.getPageCount() != -1 && <div className="text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </div>}
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
            
            {/* Edit Contact Dialog */}
            {editingContact && (
                <EditContactDialog
                    contact={editingContact}
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onSuccessfulEdit={() => {
                        dataQuery.refetch()
                        setEditingContact(null)
                    }}
                >
                    <div />
                </EditContactDialog>
            )}
        </div>
    )
}
