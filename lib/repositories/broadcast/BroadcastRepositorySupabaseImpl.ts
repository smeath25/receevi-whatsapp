import { BroadcastFromDB, BroadcastRepository, BroadcastContactDetails } from "./BroadcastRepository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

type SupabaseClientType = SupabaseClient<Database>

export class BroadcastRepositorySupabaseImpl implements BroadcastRepository {
    private client;
    constructor(client: SupabaseClientType) {
        this.client = client;
    }

    async getAllBroadcasts(page: number): Promise<BroadcastFromDB[]> {
        const pageSize = 10;
        const pageIndex = page - 1;
        let { data, error } = await this.client
            .from('broadcast')
            .select('*')
            .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data || [];
    }

    async getBroadcastContacts(broadcastId: string, page: number = 1): Promise<BroadcastContactDetails[]> {
        const pageSize = 50;
        const pageIndex = page - 1;
        
        // Get broadcast_contact records first
        let { data: broadcastContacts, error: bcError } = await this.client
            .from('broadcast_contact')
            .select('*')
            .eq('broadcast_id', broadcastId)
            .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1)
            .order('created_at', { ascending: false })
        
        if (bcError) throw bcError
        if (!broadcastContacts || broadcastContacts.length === 0) {
            return [];
        }

        // Get unique contact IDs
        const contactIds = [...new Set(broadcastContacts.map(bc => bc.contact_id))];
        
        // Get contact details
        let { data: contacts, error: contactsError } = await this.client
            .from('contacts')
            .select('*')
            .in('wa_id', contactIds)
        
        if (contactsError) throw contactsError

        // Create a map for quick contact lookup
        const contactMap = new Map();
        contacts?.forEach(contact => {
            contactMap.set(contact.wa_id, contact);
        });

        // Combine the data
        const result: BroadcastContactDetails[] = broadcastContacts.map(bc => ({
            ...bc,
            contact: contactMap.get(bc.contact_id) || null
        }));

        return result;
    }

    async getBroadcastContactsCount(broadcastId: string): Promise<number> {
        let { count, error } = await this.client
            .from('broadcast_contact')
            .select('*', { count: 'exact', head: true })
            .eq('broadcast_id', broadcastId)
        
        if (error) throw error
        return count || 0;
    }

    async getScheduledBroadcasts(page: number): Promise<BroadcastFromDB[]> {
        const pageSize = 10;
        const pageIndex = page - 1;
        let { data, error } = await this.client
            .from('broadcast')
            .select('*')
            .eq('status', 'scheduled')
            .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1)
            .order('scheduled_at', { ascending: true })
        
        if (error) throw error
        return data || [];
    }

    async getPendingScheduledBroadcasts(): Promise<BroadcastFromDB[]> {
        let { data, error } = await this.client
            .from('broadcast')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true })
        
        if (error) throw error
        return data || [];
    }

    async markBroadcastAsProcessing(broadcastId: string): Promise<void> {
        let { error } = await this.client
            .from('broadcast')
            .update({ status: 'processing' })
            .eq('id', broadcastId)
            .eq('status', 'scheduled')
        
        if (error) throw error
    }

    async markBroadcastAsCompleted(broadcastId: string): Promise<void> {
        let { error } = await this.client
            .from('broadcast')
            .update({ status: 'completed' })
            .eq('id', broadcastId)
            .eq('status', 'processing')
        
        if (error) throw error
    }

    async markBroadcastAsFailed(broadcastId: string): Promise<void> {
        let { error } = await this.client
            .from('broadcast')
            .update({ status: 'failed' })
            .eq('id', broadcastId)
            .in('status', ['scheduled', 'processing'])
        
        if (error) throw error
    }
}