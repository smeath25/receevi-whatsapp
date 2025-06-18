"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from "react"
import { Plus, Edit, Trash2, Search, MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { QuickReply, CreateQuickReplyRequest, UpdateQuickReplyRequest } from "@/types/quick-reply"
import TWLoader from "@/components/TWLoader"

export default function QuickRepliesClient() {
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null)
    
    // Form state
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [category, setCategory] = useState("none")
    const [isGlobal, setIsGlobal] = useState(false)

    // Fetch quick replies
    const { data: quickReplies = [], isLoading } = useQuery({
        queryKey: ['quick-replies', searchTerm, selectedCategory],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (searchTerm) params.append('search', searchTerm)
            if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory)
            
            const response = await fetch(`/api/quick-replies?${params}`)
            const result = await response.json()
            
            if (!result.success) {
                throw new Error(result.error)
            }
            
            return result.data
        }
    })

    // Fetch categories
    const { data: categories = [] } = useQuery({
        queryKey: ['quick-reply-categories'],
        queryFn: async () => {
            const response = await fetch('/api/quick-replies/categories')
            const result = await response.json()
            
            if (!result.success) {
                throw new Error(result.error)
            }
            
            return result.data
        }
    })

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: CreateQuickReplyRequest) => {
            const response = await fetch('/api/quick-replies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            
            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error)
            }
            
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quick-replies'] })
            queryClient.invalidateQueries({ queryKey: ['quick-reply-categories'] })
            resetForm()
            setIsCreateDialogOpen(false)
        }
    })

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: UpdateQuickReplyRequest }) => {
            const response = await fetch(`/api/quick-replies/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            
            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error)
            }
            
            return result.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quick-replies'] })
            queryClient.invalidateQueries({ queryKey: ['quick-reply-categories'] })
            resetForm()
            setEditingQuickReply(null)
        }
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/quick-replies/${id}`, {
                method: 'DELETE'
            })
            
            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error)
            }
            
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quick-replies'] })
            queryClient.invalidateQueries({ queryKey: ['quick-reply-categories'] })
        }
    })

    const resetForm = () => {
        setTitle("")
        setContent("")
        setCategory("none")
        setIsGlobal(false)
    }

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault()
        createMutation.mutate({
            title: title.trim(),
            content: content.trim(),
            category: category.trim() && category !== 'none' ? category.trim() : undefined,
            is_global: isGlobal
        })
    }

    const handleEdit = (quickReply: QuickReply) => {
        setEditingQuickReply(quickReply)
        setTitle(quickReply.title)
        setContent(quickReply.content)
        setCategory(quickReply.category || "none")
        setIsGlobal(quickReply.is_global)
    }

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingQuickReply) return
        
        updateMutation.mutate({
            id: editingQuickReply.id,
            data: {
                title: title.trim(),
                content: content.trim(),
                category: category.trim() && category !== 'none' ? category.trim() : undefined,
                is_global: isGlobal
            }
        })
    }

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this quick reply?')) {
            deleteMutation.mutate(id)
        }
    }

    return (
        <div className="m-4 bg-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MessageSquare className="h-6 w-6" />
                        Quick Replies
                    </h1>
                    <p className="text-gray-600 mt-1">Manage your predefined response templates</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Quick Reply
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <form onSubmit={handleCreate}>
                            <DialogHeader>
                                <DialogTitle>Create Quick Reply</DialogTitle>
                                <DialogDescription>
                                    Create a new predefined response template
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter a descriptive title"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="content">Content *</Label>
                                    <Textarea
                                        id="content"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Enter the message content"
                                        rows={4}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No category</SelectItem>
                                            {categories.map((cat: string) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        className="mt-2"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        placeholder="Or type a new category"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="is_global"
                                        checked={isGlobal}
                                        onCheckedChange={(checked) => setIsGlobal(!!checked)}
                                    />
                                    <Label htmlFor="is_global">
                                        Make this a global quick reply (accessible to all users)
                                    </Label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending && <TWLoader className="w-4 h-4 mr-2" />}
                                    Create
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search quick replies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((cat: string) => (
                            <SelectItem key={cat} value={cat}>
                                {cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Quick Replies Grid */}
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <TWLoader className="w-6 h-6" />
                </div>
            ) : quickReplies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No quick replies found</p>
                    <p className="text-sm">Create your first quick reply to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickReplies.map((quickReply: QuickReply) => (
                        <Card key={quickReply.id} className="relative group">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-lg line-clamp-1">{quickReply.title}</CardTitle>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleEdit(quickReply)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(quickReply.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {quickReply.category && (
                                        <Badge variant="secondary" className="text-xs">
                                            {quickReply.category}
                                        </Badge>
                                    )}
                                    {quickReply.is_global && (
                                        <Badge variant="outline" className="text-xs">
                                            Global
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 line-clamp-3">{quickReply.content}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingQuickReply} onOpenChange={(open) => !open && setEditingQuickReply(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Edit Quick Reply</DialogTitle>
                            <DialogDescription>
                                Update your quick reply template
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="edit-title">Title *</Label>
                                <Input
                                    id="edit-title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter a descriptive title"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-content">Content *</Label>
                                <Textarea
                                    id="edit-content"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Enter the message content"
                                    rows={4}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-category">Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No category</SelectItem>
                                        {categories.map((cat: string) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    className="mt-2"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="Or type a new category"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="edit-is_global"
                                    checked={isGlobal}
                                    onCheckedChange={(checked) => setIsGlobal(!!checked)}
                                />
                                <Label htmlFor="edit-is_global">
                                    Make this a global quick reply (accessible to all users)
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingQuickReply(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending && <TWLoader className="w-4 h-4 mr-2" />}
                                Update
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}