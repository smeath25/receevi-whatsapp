import { SupabaseClient } from "@supabase/supabase-js"
import { Database } from "@/lib/database.types"
import { ScheduledMessageRepository } from "./ScheduledMessageRepository"
import { ScheduledMessageRepositorySupabaseImpl } from "./ScheduledMessageRepositorySupabaseImpl"

export class ScheduledMessageServerFactory {
    static getInstance(supabaseClient: SupabaseClient<Database>): ScheduledMessageRepository {
        return new ScheduledMessageRepositorySupabaseImpl(supabaseClient)
    }
}

export default ScheduledMessageServerFactory