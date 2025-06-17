import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl, FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ContactFromDB } from "@/lib/repositories/contacts/ContactRepository"
import ContactBrowserFactory from "@/lib/repositories/contacts/ContactBrowserFactory"
import ContactTagBrowserFactory from "@/lib/repositories/contact-tag/ContactTagBrowserFactory"
import { useSupabase } from "@/components/supabase-provider"
import { zodResolver } from "@hookform/resolvers/zod"
import { ReactNode, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const EditContactSchema = z.object({
    profile_name: z.string().min(1, "Name is required"),
    tags: z.array(z.string()).optional(),
    assigned_to: z.string().optional().nullable(),
})

type EditContactFormData = z.infer<typeof EditContactSchema>

interface EditContactDialogProps {
    children: ReactNode
    contact: ContactFromDB
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onSuccessfulEdit: () => void
}

export function EditContactDialog({ 
    children, 
    contact, 
    isOpen, 
    onOpenChange, 
    onSuccessfulEdit 
}: EditContactDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [availableTags, setAvailableTags] = useState<string[]>([])
    const [availableUsers, setAvailableUsers] = useState<Array<{id: string, email: string}>>([])
    const [tagInput, setTagInput] = useState("")
    const { supabase } = useSupabase()
    
    const form = useForm<EditContactFormData>({
        resolver: zodResolver(EditContactSchema),
        defaultValues: {
            profile_name: contact.profile_name || "",
            tags: contact.tags || [],
            assigned_to: contact.assigned_to,
        }
    })

    const { watch, setValue } = form
    const currentTags = watch("tags") || []

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch available tags
                const contactTagRepo = ContactTagBrowserFactory.getInstance(supabase)
                const tags = await contactTagRepo.getContactTags()
                setAvailableTags(tags)

                // TODO: Fetch available users for assignment
                // For now, we'll leave this empty
                setAvailableUsers([])
            } catch (error) {
                console.error("Error fetching data:", error)
            }
        }
        
        if (isOpen) {
            fetchData()
            // Reset form when dialog opens
            form.reset({
                profile_name: contact.profile_name || "",
                tags: contact.tags || [],
                assigned_to: contact.assigned_to,
            })
        }
    }, [isOpen, contact, form, supabase])

    async function onSubmit(data: EditContactFormData) {
        setIsLoading(true)
        try {
            const contactRepo = ContactBrowserFactory.getInstance(supabase)
            
            const updates = {
                profile_name: data.profile_name,
                tags: data.tags,
                assigned_to: data.assigned_to,
            }

            await contactRepo.updateContact(contact.wa_id, updates)
            
            onSuccessfulEdit()
            onOpenChange(false)
            form.reset()
        } catch (error) {
            console.error("Error updating contact:", error)
            // TODO: Add proper error handling/toast notification
        } finally {
            setIsLoading(false)
        }
    }

    const addTag = (tag: string) => {
        if (tag && !currentTags.includes(tag)) {
            setValue("tags", [...currentTags, tag])
        }
        setTagInput("")
    }

    const removeTag = (tagToRemove: string) => {
        setValue("tags", currentTags.filter(tag => tag !== tagToRemove))
    }

    const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addTag(tagInput.trim())
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Contact</DialogTitle>
                    <DialogDescription>
                        Update contact information and manage tags for {contact.wa_id}.
                    </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Contact Name Field */}
                        <FormField
                            control={form.control}
                            name="profile_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter contact name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* WhatsApp Number (Read-only) */}
                        <div className="space-y-2">
                            <Label>WhatsApp Number</Label>
                            <Input value={contact.wa_id.toString()} disabled />
                        </div>

                        {/* Tags Management */}
                        <div className="space-y-2">
                            <Label>Tags</Label>
                            
                            {/* Current Tags Display */}
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md">
                                {currentTags.length > 0 ? (
                                    currentTags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                            {tag}
                                            <X 
                                                className="h-3 w-3 cursor-pointer" 
                                                onClick={() => removeTag(tag)}
                                            />
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-sm text-muted-foreground">No tags assigned</span>
                                )}
                            </div>

                            {/* Tag Input */}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add new tag..."
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagInputKeyDown}
                                />
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => addTag(tagInput.trim())}
                                    disabled={!tagInput.trim()}
                                >
                                    Add
                                </Button>
                            </div>

                            {/* Available Tags Quick Add */}
                            {availableTags.length > 0 && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Quick add existing tags:</Label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {availableTags
                                            .filter(tag => !currentTags.includes(tag))
                                            .slice(0, 10) // Show max 10 for space
                                            .map((tag) => (
                                                <Button
                                                    key={tag}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 text-xs"
                                                    onClick={() => addTag(tag)}
                                                >
                                                    + {tag}
                                                </Button>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Agent Assignment - TODO: Implement when user management is ready */}
                        {availableUsers.length > 0 && (
                            <FormField
                                control={form.control}
                                name="assigned_to"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assigned Agent</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an agent" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">Unassigned</SelectItem>
                                                {availableUsers.map((user) => (
                                                    <SelectItem key={user.id} value={user.id}>
                                                        {user.email}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Updating..." : "Update Contact"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}