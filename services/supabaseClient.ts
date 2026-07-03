import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Public anonymous-leaderboard backend. The anon key is designed to be shipped in
// client apps — the data is protected by row-level security on the server, so these
// defaults are safe to commit. An env var (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
// overrides them when present.
const DEFAULT_URL = 'https://pwwatepcfphaeeitrenm.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3d2F0ZXBjZnBoYWVlaXRyZW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNjg5NzUsImV4cCI6MjA5Nzk0NDk3NX0.0i76oTYX-vKe8r2X9rMYDULowyVdmiq3rR4VJx-MQdg';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_ANON_KEY;

// persistSession/autoRefreshToken must be on so the anonymous auth user (below)
// is stable across reloads — that user's id is the player's server identity.
export const supabase: SupabaseClient | null =
    url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const isSupabaseConfigured = !!supabase;

// Anonymous auth: gives every device a real Supabase user so RLS policies can
// bind rows to auth.uid() and reject writes to other players' data. The uid is
// mirrored into localStorage 'cw_device_id' so the existing getDeviceId()-keyed
// code transparently uses it everywhere. Resolves once and is cached; safe to
// call from many places. Returns null if the backend isn't configured or the
// (offline) sign-in fails, in which case the app falls back to its local id.
let _authIdPromise: Promise<string | null> | null = null;
export function ensureAuthId(): Promise<string | null> {
    if (!supabase) return Promise.resolve(null);
    if (_authIdPromise) return _authIdPromise;
    _authIdPromise = (async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let uid = session?.user?.id ?? null;
            if (!uid) {
                const { data, error } = await supabase.auth.signInAnonymously();
                if (error) return null;
                uid = data.user?.id ?? null;
            }
            if (uid) {
                try { localStorage.setItem('cw_device_id', uid); } catch { /* ignore */ }
            }
            return uid;
        } catch {
            return null;
        }
    })();
    return _authIdPromise;
}
