"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  flexRender,
} from "@tanstack/react-table"
import { MoreHorizontal, Clock, MessageSquare, X, CheckCircle, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScheduledMessage } from "@/types/scheduled-message"

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
}

const statusIcons = {
  pending: Clock,
  sent: CheckCircle,
  failed: AlertCircle,
  cancelled: X,
}

export default function ScheduledMessagesClient() {
  const [sorting, setSorting] = useState<SortingState>([])
  const queryClient = useQueryClient()

  // Fetch scheduled messages
  const { data: scheduledMessages = [], isLoading } = useQuery({
    queryKey: ['scheduled-messages'],
    queryFn: async () => {
      const response = await fetch('/api/scheduleMessage')
      if (!response.ok) {
        throw new Error('Failed to fetch scheduled messages')
      }
      const data = await response.json()
      return data.scheduledMessages as ScheduledMessage[]
    },
  })

  // Cancel scheduled message mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch('/api/scheduleMessage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'cancel' }),
      })
      if (!response.ok) {
        throw new Error('Failed to cancel message')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-messages'] })
    },
  })

  const columns: ColumnDef<ScheduledMessage>[] = [
    {
      accessorKey: "to",
      header: "Contact",
      cell: ({ row }) => (
        <div className="font-medium">+{row.getValue("to")}</div>
      ),
    },
    {
      accessorKey: "message_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("message_type") as string
        return (
          <Badge variant="outline" className="capitalize">
            {type}
          </Badge>
        )
      },
    },
    {
      accessorKey: "message_content",
      header: "Content",
      cell: ({ row }) => {
        const content = row.getValue("message_content") as string
        const type = row.original.message_type
        
        if (type === 'template' && row.original.template_data) {
          return (
            <div className="max-w-[200px] truncate">
              Template: {row.original.template_data.name}
            </div>
          )
        }
        
        if (type !== 'text' && row.original.file_data) {
          return (
            <div className="max-w-[200px] truncate">
              {row.original.file_data.filename}
            </div>
          )
        }
        
        return (
          <div className="max-w-[200px] truncate">
            {content || 'No content'}
          </div>
        )
      },
    },
    {
      accessorKey: "scheduled_at",
      header: "Scheduled For",
      cell: ({ row }) => {
        const date = new Date(row.getValue("scheduled_at"))
        return (
          <div>
            <div className="font-medium">
              {format(date, "MMM d, yyyy")}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(date, "h:mm a")}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as keyof typeof statusColors
        const StatusIcon = statusIcons[status]
        
        return (
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            <Badge className={statusColors[status]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return (
          <div className="text-sm text-muted-foreground">
            {format(date, "MMM d, h:mm a")}
          </div>
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const message = row.original
        const canCancel = message.status === 'pending' && new Date(message.scheduled_at) > new Date()

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
              {canCancel && (
                <DropdownMenuItem
                  onClick={() => cancelMutation.mutate(message.id)}
                  disabled={cancelMutation.isPending}
                  className="text-red-600"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel Message
                </DropdownMenuItem>
              )}
              {message.error_message && (
                <DropdownMenuItem disabled>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  View Error
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: scheduledMessages,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  })

  if (isLoading) {
    return (
      <div className="m-4 bg-white rounded-xl p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>Loading scheduled messages...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="m-4 bg-white rounded-xl p-4">
      <div className="flex items-center justify-between py-4">
        <div>
          <h1 className="text-2xl font-bold">Scheduled Messages</h1>
          <p className="text-muted-foreground">
            Manage and monitor your scheduled WhatsApp messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <span className="text-sm font-medium">
            {scheduledMessages.length} total messages
          </span>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                    <span>No scheduled messages found.</span>
                    <span className="text-sm text-muted-foreground">
                      Schedule messages from the chat interface to see them here.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
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
    </div>
  )
}