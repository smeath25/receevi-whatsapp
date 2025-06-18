import { QuickReply, CreateQuickReplyRequest, UpdateQuickReplyRequest, QuickReplyFilters } from "@/types/quick-reply";
import { Database } from "@/lib/database.types";

type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'is'
  | 'in'
  | 'cs'
  | 'cd'
  | 'sl'
  | 'sr'
  | 'nxl'
  | 'nxr'
  | 'adj'
  | 'ov'
  | 'fts'
  | 'plfts'
  | 'phfts'
  | 'wfts'

export type QuickReplyFromDB = Database['public']['Tables']['quick_replies']['Row'];
export type QuickReplyColumnName = string & keyof QuickReplyFromDB;
export type QuickReplyFilterArray = Array<{ column: QuickReplyColumnName, operator: FilterOperator, value: unknown}>

export interface QuickReplyRepository {
    getQuickReplies(
        filters?: QuickReplyFilters,
        paginationOptions?: { limit: number, offset: number},
        fetchCount?: boolean,
    ): Promise<{ rows: QuickReply[], itemsCount: number | null }>

    getQuickReplyById(id: string): Promise<QuickReply | null>
    
    createQuickReply(quickReply: CreateQuickReplyRequest): Promise<QuickReply>
    
    updateQuickReply(id: string, updates: UpdateQuickReplyRequest): Promise<QuickReply>
    
    deleteQuickReply(id: string): Promise<boolean>
    
    getCategories(): Promise<string[]>
}