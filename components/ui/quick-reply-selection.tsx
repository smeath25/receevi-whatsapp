import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { QuickReply } from "@/types/quick-reply";
import { Dispatch, useCallback, useEffect, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Badge } from "./badge";
import { Search, MessageSquare } from "lucide-react";
import TWLoader from "../TWLoader";

interface QuickReplySelectionProps {
    children: React.ReactElement;
    onQuickReplySelect: Dispatch<string>;
}

export default function QuickReplySelection({ children, onQuickReplySelect }: QuickReplySelectionProps) {
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [filteredQuickReplies, setFilteredQuickReplies] = useState<QuickReply[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedQuickReply, setSelectedQuickReply] = useState<QuickReply | undefined>();

    const fetchQuickReplies = useCallback(async function () {
        try {
            setIsLoading(true);
            const response = await fetch('/api/quick-replies');
            const result = await response.json();
            
            if (result.success) {
                setQuickReplies(result.data);
                setFilteredQuickReplies(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch quick replies:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchCategories = useCallback(async function () {
        try {
            const response = await fetch('/api/quick-replies/categories');
            const result = await response.json();
            
            if (result.success) {
                setCategories(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    }, []);

    useEffect(() => {
        fetchQuickReplies();
        fetchCategories();
    }, [fetchQuickReplies, fetchCategories]);

    // Filter quick replies based on search term and category
    useEffect(() => {
        let filtered = quickReplies;

        if (selectedCategory) {
            filtered = filtered.filter(qr => qr.category === selectedCategory);
        }

        if (searchTerm) {
            filtered = filtered.filter(qr => 
                qr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                qr.content.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredQuickReplies(filtered);
    }, [quickReplies, selectedCategory, searchTerm]);

    const resetDialog = useCallback(() => {
        setSelectedQuickReply(undefined);
        setSearchTerm('');
        setSelectedCategory('');
    }, []);

    const handleQuickReplySelect = useCallback((quickReply: QuickReply) => {
        onQuickReplySelect(quickReply.content);
        resetDialog();
    }, [onQuickReplySelect, resetDialog]);

    const handleCategorySelect = useCallback((category: string) => {
        setSelectedCategory(category === selectedCategory ? '' : category);
    }, [selectedCategory]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Select Quick Reply
                    </DialogTitle>
                    <DialogDescription>
                        Choose a predefined response template to quickly send a message.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Search quick replies..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Categories */}
                    {categories.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Categories:</p>
                            <div className="flex flex-wrap gap-2">
                                {categories.map(category => (
                                    <Badge
                                        key={category}
                                        variant={selectedCategory === category ? "default" : "secondary"}
                                        className="cursor-pointer"
                                        onClick={() => handleCategorySelect(category)}
                                    >
                                        {category}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Replies List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <TWLoader className="w-6 h-6" />
                            </div>
                        ) : filteredQuickReplies.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                {searchTerm || selectedCategory ? 'No quick replies found matching your criteria.' : 'No quick replies available.'}
                            </div>
                        ) : (
                            filteredQuickReplies.map(quickReply => (
                                <div
                                    key={quickReply.id}
                                    className={cn(
                                        "border rounded-lg p-3 cursor-pointer transition-colors hover:bg-gray-50",
                                        selectedQuickReply?.id === quickReply.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                    )}
                                    onClick={() => setSelectedQuickReply(quickReply)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-sm mb-1">{quickReply.title}</h4>
                                            <p className="text-sm text-gray-600 line-clamp-2">{quickReply.content}</p>
                                            {quickReply.category && (
                                                <Badge variant="outline" className="mt-2 text-xs">
                                                    {quickReply.category}
                                                </Badge>
                                            )}
                                        </div>
                                        {quickReply.is_global && (
                                            <Badge variant="secondary" className="ml-2 text-xs">
                                                Global
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button 
                            disabled={!selectedQuickReply}
                            onClick={() => selectedQuickReply && handleQuickReplySelect(selectedQuickReply)}
                        >
                            Use Quick Reply
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}