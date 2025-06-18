import { QuickReplyRepository } from "./QuickReplyRepository";
import { QuickReplyRepositorySupabaseImpl } from "./QuickReplyRepositorySupabaseImpl";
import { createClient as createServerClient } from "@/utils/supabase-server";

export default class QuickReplyServerFactory {
    private static _instance: QuickReplyRepository;
    public static getInstance(): QuickReplyRepository {
        if (!QuickReplyServerFactory._instance) {
            const client = createServerClient();
            QuickReplyServerFactory._instance = new QuickReplyRepositorySupabaseImpl(client)
        }
        return QuickReplyServerFactory._instance
    }
}