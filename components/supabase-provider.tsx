'use client'

import { createContext, useContext, useState } from 'react'
import { createClient } from '@/utils/supabase-browser'

import type { Database } from '@/lib/database.types'
import { SupabaseClient } from '@supabase/supabase-js'

type SupabaseContext = {
    supabase: SupabaseClient<Database>
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({ children, supabaseUrl, supabaseAnonKey }: { children: React.ReactNode, supabaseUrl: string, supabaseAnonKey: string  }) {
    const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey))

    return (
        <Context.Provider value={{ supabase }}>
            <>{children}</>
        </Context.Provider>
    )
}

export const useSupabase = () => {
    let context = useContext(Context);
    if (context === undefined) {
        throw new Error("useSupabase must be used inside SupabaseProvider");
    } else {
        return context;
    }
}