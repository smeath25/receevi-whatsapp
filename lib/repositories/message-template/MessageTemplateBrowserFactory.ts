import { Database } from "@/lib/database.types";
import { MessageTemplateRepository } from "./MessageTemplateRepository";
import { MessageTemplateRepositorySupabaseImpl } from "./MessageTemplateRepositorySupabaseImpl";
import { createClient as createBrowserClient } from "@/utils/supabase-browser";
import { SupabaseClient } from "@supabase/supabase-js";

export default class MessageTemplateBrowserFactory {
    private static _instance: MessageTemplateRepository;
    public static getInstance(supabase: SupabaseClient<Database>): MessageTemplateRepository {
        if (!MessageTemplateBrowserFactory._instance) {
            MessageTemplateBrowserFactory._instance = new MessageTemplateRepositorySupabaseImpl(supabase)
        }
        return MessageTemplateBrowserFactory._instance
    }
}
