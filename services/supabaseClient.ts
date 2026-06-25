import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Reads Vite env vars. When they're absent (e.g. local dev before a backend is
// connected) the client is null and the app falls back to seeded leaderboard data.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
    url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;

export const isSupabaseConfigured = !!supabase;
