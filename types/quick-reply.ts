export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category?: string;
  created_by: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateQuickReplyRequest {
  title: string;
  content: string;
  category?: string;
  is_global?: boolean;
}

export interface UpdateQuickReplyRequest {
  title?: string;
  content?: string;
  category?: string;
  is_global?: boolean;
}

export interface QuickReplyFilters {
  category?: string;
  search?: string;
  is_global?: boolean;
  created_by?: string;
}