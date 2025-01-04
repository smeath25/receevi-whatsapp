import { SupabaseClient } from "@supabase/supabase-js";
import { BroadcastRepository } from "./BroadcastRepository";
import { BroadcastRepositorySupabaseImpl } from "./BroadcastRepositorySupabaseImpl";
import { Database } from "@/lib/database.types";

export default class BroadcastBrowserFactory {
    private static _instance: BroadcastRepository;
    public static getInstance(supabase: SupabaseClient<Database>): BroadcastRepository {
        if (!BroadcastBrowserFactory._instance) {
            BroadcastBrowserFactory._instance = new BroadcastRepositorySupabaseImpl(supabase)
        }
        return BroadcastBrowserFactory._instance
    }
}
