import TWLoader from "@/components/TWLoader"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import {
    Form,
    FormControl, FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useSupabase } from "@/components/supabase-provider"
import { zodResolver } from "@hookform/resolvers/zod"
import { ReactNode, useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Download, FileText, Tag, Users, CheckCircle, AlertCircle } from "lucide-react"

const MAX_FILE_SIZE = 500000;
const ACCEPTED_IMAGE_TYPES = ["text/csv"];

const FormSchema1 = z.object({
    file: z
        .any()
        .refine((file) => file?.length > 0, "CSV file is required.")
        // .refine((file) => file?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
        .refine(
            (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
            "Only .csv files are accepted."
        ),
})

const FormSchema = z.object({
    bulkfile: typeof window === 'undefined' ? z.any() : z.instanceof(FileList).refine((file) => file?.length == 1, 'File is required.')
});

export function AddBulkContactsDialog({ children, onSuccessfulAdd }: { children: ReactNode, onSuccessfulAdd: () => void }) {
    const [isDialogOpen, setDialogOpen] = useState(false);
    const { supabase } = useSupabase()
    const [isLoading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [importStats, setImportStats] = useState<{contacts: number, tags: number} | null>(null);
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
    })

    const fileRef = form.register("bulkfile");

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        setLoading(true)
        setErrorMessage('')
        setSuccessMessage('')
        setImportStats(null)
        
        try {
            const bulkfile = data.bulkfile && data.bulkfile[0]
            if (!bulkfile) {
                throw new Error('No file selected')
            }
            
            let csvData = await bulkfile.text()
            
            // Basic CSV validation
            const lines = csvData.trim().split('\n')
            if (lines.length < 2) {
                throw new Error('CSV must contain at least a header row and one data row')
            }
            
            // Clean phone numbers in the CSV data before sending
            const cleanedLines = lines.map((line: string, index: number) => {
                if (index === 0) return line // Skip header row
                
                const columns = line.split(',')
                if (columns.length >= 2) {
                    // Clean the phone number (second column)
                    columns[1] = columns[1]
                        .trim()
                        .replace(/\s+/g, '')      // Remove all spaces
                        .replace(/-/g, '')        // Remove hyphens
                        .replace(/\(/g, '')       // Remove opening parentheses
                        .replace(/\)/g, '')       // Remove closing parentheses
                        .replace(/\./g, '')       // Remove dots
                }
                return columns.join(',')
            })
            
            // Use cleaned CSV data
            csvData = cleanedLines.join('\n')
            
            console.log('Sending cleaned CSV data (first 5 lines):', cleanedLines.slice(0, 5).join('\n'))
            
            const res = await supabase.functions.invoke("insert-bulk-contacts", {
                body: csvData,
            });
            
            // Log the full response for debugging
            console.log('Full Edge Function response:', {
                data: res.data,
                error: res.error,
                errorMessage: res.error?.message,
                status: res.error?.status,
            })
            
            if (res.error) {
                console.error('Error while sending bulk csv', res.error)
                console.error('Response data:', res.data)
                
                // Check if the error contains actual response data
                let errorMessage = 'Failed to import contacts'
                let errorDetails = ''
                
                // First, check if res.data contains error information
                if (res.data && typeof res.data === 'object') {
                    if (res.data.error) {
                        errorMessage = res.data.error
                        if (res.data.details) {
                            errorDetails = res.data.details
                        }
                    } else if (res.data.message) {
                        errorMessage = res.data.message
                    }
                }
                
                // If we still have the generic message, try to parse the error
                if (errorMessage === 'Failed to import contacts' && res.error.message) {
                    // Try to parse the error message if it's JSON
                    try {
                        const errorData = JSON.parse(res.error.message)
                        errorMessage = errorData.error || errorData.message || res.error.message
                        if (errorData.details) {
                            errorDetails = errorData.details
                        }
                    } catch (parseError) {
                        console.error('Failed to parse error message:', parseError)
                        // If parsing fails, use the raw message
                        errorMessage = res.error.message
                    }
                }
                
                // Combine message and details
                const finalErrorMessage = errorDetails 
                    ? `${errorMessage}: ${errorDetails}`
                    : errorMessage
                
                console.error('Final error message:', finalErrorMessage)
                throw new Error(finalErrorMessage)
            }
            
            // Parse response for stats
            const responseData = res.data
            if (responseData && typeof responseData === 'object') {
                setImportStats({
                    contacts: responseData.contacts_processed || 0,
                    tags: responseData.tags_created || 0
                })
                
                // Build detailed success message
                let message = `Successfully imported ${responseData.contacts_processed || 0} contacts!`
                if (responseData.duplicates_skipped > 0) {
                    message += ` (${responseData.duplicates_skipped} duplicates skipped)`
                }
                if (responseData.invalid_numbers_skipped > 0) {
                    message += ` (${responseData.invalid_numbers_skipped} invalid numbers skipped)`
                }
                
                setSuccessMessage(message)
            } else {
                setSuccessMessage(`Successfully imported contacts!`)
            }
            
            // Trigger success callback and close dialog after showing success message
            onSuccessfulAdd()
            setTimeout(() => {
                setDialogOpen(false)
                setSuccessMessage('')
                setImportStats(null)
                form.reset()
            }, 3000)
            
        } catch (error) {
            console.error('Import error:', error)
            // Show more detailed error for debugging
            if (error instanceof Error) {
                setErrorMessage(error.message)
                // Also show a hint about checking the browser console
                if (error.message.includes('Upload failed')) {
                    setErrorMessage(error.message + ' (Check browser console for details)')
                }
            } else {
                setErrorMessage('Something went wrong during import')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Import Contacts from CSV
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to import multiple contacts with tags at once.
                    </DialogDescription>
                </DialogHeader>
                
                {/* CSV Format Instructions */}
                <div className="space-y-4">
                    <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertDescription>
                            <div className="space-y-2">
                                <p className="font-medium">Required CSV Format:</p>
                                <div className="bg-gray-100 p-2 rounded text-sm font-mono">
                                    Name,Number (with country code),Tags (Comma separated)
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Tag className="h-3 w-3" />
                                    <span>Tags should be separated by commas (e.g., &quot;Customer, VIP, Sales&quot;)</span>
                                </div>
                            </div>
                        </AlertDescription>
                    </Alert>
                    
                    {/* Download Sample Button */}
                    <div className="flex justify-center">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            asChild
                            className="gap-2"
                        >
                            <a href="/assets/example-bulk-contacts.csv" download="sample-contacts.csv">
                                <Download className="h-4 w-4" />
                                Download Sample CSV
                            </a>
                        </Button>
                    </div>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="bulkfile"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Select CSV File</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="file" 
                                            {...fileRef} 
                                            accept="text/csv,.csv" 
                                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        {/* Success Message */}
                        {successMessage && (
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    <div className="space-y-1">
                                        <p>{successMessage}</p>
                                        {importStats && (
                                            <div className="text-sm">
                                                <p>• {importStats.contacts} contacts processed</p>
                                                {importStats.tags > 0 && <p>• {importStats.tags} unique tags created</p>}
                                            </div>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        {/* Error Message */}
                        {errorMessage && (
                            <Alert className="border-red-200 bg-red-50">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800">
                                    {errorMessage}
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        <DialogFooter>
                            <div className="flex items-center gap-3">
                                {isLoading && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <TWLoader className="w-5 h-5"/>
                                        <span>Processing contacts...</span>
                                    </div>
                                )}
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => {
                                        setDialogOpen(false)
                                        setErrorMessage('')
                                        setSuccessMessage('')
                                        setImportStats(null)
                                        form.reset()
                                    }}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                {!isLoading && !successMessage && (
                                    <Button type="submit">
                                        Import Contacts
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
