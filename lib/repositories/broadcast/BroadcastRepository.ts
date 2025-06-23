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

export type BroadcastFromDB = Database['public']['Tables']['broadcast']['Row'];
export type BroadcastContactFromDB = Database['public']['Tables']['broadcast_contact']['Row'];
export type ContactFromDB = Database['public']['Tables']['contacts']['Row'];
export type BroadcastColumnName = string & keyof BroadcastFromDB;
export type BroadcastFilterArray = Array<{ column: BroadcastColumnName, operator: FilterOperator, value: unknown}>

export interface BroadcastContactDetails extends BroadcastContactFromDB {
  contact?: ContactFromDB;
}

export interface BroadcastRepository {
  getAllBroadcasts(page: number): Promise<BroadcastFromDB[]>
  getBroadcastContacts(broadcastId: string, page?: number): Promise<BroadcastContactDetails[]>
  getBroadcastContactsCount(broadcastId: string): Promise<number>
  getScheduledBroadcasts(page: number): Promise<BroadcastFromDB[]>
  getPendingScheduledBroadcasts(): Promise<BroadcastFromDB[]>
  markBroadcastAsProcessing(broadcastId: string): Promise<void>
  markBroadcastAsCompleted(broadcastId: string): Promise<void>
  markBroadcastAsFailed(broadcastId: string): Promise<void>
}

