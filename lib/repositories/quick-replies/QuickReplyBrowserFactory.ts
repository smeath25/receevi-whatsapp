import { Database } from "@/lib/database.types";
import { SupabaseClient } from "@supabase/supabase-js";
import { QuickReplyRepository } from "./QuickReplyRepository";
import { QuickReplyRepositorySupabaseImpl } from "./QuickReplyRepositorySupabaseImpl";

export default class QuickReplyBrowserFactory {
    private static _instance: QuickReplyRepository;
    public static getInstance(supabase: SupabaseClient<Database>): QuickReplyRepository {
        if (!QuickReplyBrowserFactory._instance) {
            QuickReplyBrowserFactory._instance = new QuickReplyRepositorySupabaseImpl(supabase)
        }
        return QuickReplyBrowserFactory._instance
    }
}