import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Public anonymous-leaderboard backend. The anon key is designed to be shipped in
// client apps — the data is protected by row-level security on the server, so these
// defaults are safe to commit. An env var (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
// overrides them when present.
const DEFAULT_URL = 'https://pwwatepcfphaeeitrenm.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3d2F0ZXBjZnBoYWVlaXRyZW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNjg5NzUsImV4cCI6MjA5Nzk0NDk3NX0.0i76oTYX-vKe8r2X9rMYDULowyVdmiq3rR4VJx-MQdg';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_ANON_KEY;

export const supabase: SupabaseClient | null =
    url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;

export const isSupabaseConfigured = !!supabase;
