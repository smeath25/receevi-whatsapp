import { SupabaseClient } from "@supabase/supabase-js";
import { ContactTagRepository } from "./ContactTagRepository";
import { ContactTagRepositorySupabaseImpl } from "./ContactTagRepositorySupabaseImpl";
import { createClient as createBrowserClient } from "@/utils/supabase-browser";
import { Database } from "@/lib/database.types";

export default class ContactTagBrowserFactory {
    private static _instance: ContactTagRepository;
    public static getInstance(supabase: SupabaseClient<Database>): ContactTagRepository {
        if (!ContactTagBrowserFactory._instance) {
            ContactTagBrowserFactory._instance = new ContactTagRepositorySupabaseImpl(supabase)
        }
        return ContactTagBrowserFactory._instance
    }
}
