import { Database } from "@/lib/database.types";
import { SupabaseClient } from "@supabase/supabase-js";
import { ContactRepository } from "./ContactRepository";
import { ContactRepositorySupabaseImpl } from "./ContactRepositorySupabaseImpl";

export default class ContactBrowserFactory {
    private static _instance: ContactRepository;
    public static getInstance(supabase: SupabaseClient<Database>): ContactRepository {
        if (!ContactBrowserFactory._instance) {
            ContactBrowserFactory._instance = new ContactRepositorySupabaseImpl(supabase)
        }
        return ContactBrowserFactory._instance
    }
}
