// Save/transfer codes — lets a player migrate their full local progress to a
// new device (or after a fresh reinstall, which wipes localStorage) without a
// real account system. Generating a code snapshots every game-state key from
// localStorage and uploads it to Supabase under a short random code; redeeming
// that code elsewhere downloads the snapshot and overwrites local storage.
import { supabase, ensureAuthId } from './supabaseClient';

// Non-localStorage keys smuggled through the same jsonb blob so a redeem can
// also take over the ORIGINAL device's Supabase anonymous-auth session — not
// just its cw_device_id string. Without this, the new device keeps its own
// (different) anon auth user; that user's session silently gets re-mirrored
// into cw_device_id the moment anything calls ensureAuthId() again (e.g. the
// background leaderboard sync), which forks all future leaderboard/guild
// writes onto a second row under the same restored name.
const SESSION_ACCESS_TOKEN_KEY = '__sb_access_token';
const SESSION_REFRESH_TOKEN_KEY = '__sb_refresh_token';

// Every localStorage key the game persists (see App.tsx's setItem/getItem
// calls). Keep this in sync when a new persistent slice is added.
const SAVE_KEYS = [
    'cw_player', 'cw_arena', 'cw_friends', 'cw_pending_friend_reqs', 'cw_missions',
    'cw_decks', 'cw_quest', 'cw_slot_quest', 'cw_login', 'cw_inbox', 'cw_bonus_timers',
    'cw_new_slots', 'cw_saved_game_states', 'cw_coin_gift_count', 'cw_vip_bets',
    'cw_redeemed_codes', 'cw_last_rank', 'cw_last_reward_month', 'cw_treasury_mult',
    'cw_treasury_mult_date', 'cw_welcome_claimed', 'cw_first_fs_done', 'cw_profile_emoji',
    'cw_device_id', 'playerName',
];

function collectSaveData(): Record<string, string> {
    const data: Record<string, string> = {};
    SAVE_KEYS.forEach(k => {
        const v = localStorage.getItem(k);
        if (v !== null) data[k] = v;
    });
    // Per-slot last-used bet amounts (cw_bet_<gameId>) — variable key names.
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('cw_bet_')) {
            const v = localStorage.getItem(k);
            if (v !== null) data[k] = v;
        }
    }
    return data;
}

function applySaveData(data: Record<string, string>) {
    Object.entries(data).forEach(([k, v]) => {
        try { localStorage.setItem(k, v); } catch {}
    });
}

// Unambiguous alphabet — no 0/O or 1/I/L mixups when typing the code by hand.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode(len = 8): string {
    let s = '';
    for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
}

export interface CreateSaveCodeResult {
    code: string | null;
    error?: string;
}

// Snapshots the current device's progress and uploads it under a fresh code.
export async function createSaveCode(): Promise<CreateSaveCodeResult> {
    if (!supabase) return { code: null, error: 'Backend not configured.' };
    const data = collectSaveData();
    try {
        await ensureAuthId(); // guarantee a session exists so it can be embedded below
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token && session?.refresh_token) {
            data[SESSION_ACCESS_TOKEN_KEY] = session.access_token;
            data[SESSION_REFRESH_TOKEN_KEY] = session.refresh_token;
        }
    } catch {}
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode();
        const { error } = await supabase.from('save_codes').insert({ code, data });
        if (!error) return { code };
        // Unique-constraint collision on the code itself — retry with a new one.
        if (!error.message?.toLowerCase().includes('duplicate')) {
            return { code: null, error: error.message };
        }
    }
    return { code: null, error: 'Could not generate a unique code — try again.' };
}

export interface RedeemSaveCodeResult {
    success: boolean;
    error?: string;
}

// Downloads the snapshot for a code and overwrites local storage with it.
// Caller is responsible for confirming with the user (this is destructive)
// and reloading the app afterward so React re-initializes from the new data.
export async function redeemSaveCode(code: string): Promise<RedeemSaveCodeResult> {
    if (!supabase) return { success: false, error: 'Backend not configured.' };
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { success: false, error: 'Enter a code.' };
    try {
        // Exact-code lookup via RPC — the save_codes table is not directly
        // readable (no SELECT policy), so it can't be dumped. The RPC filters
        // out expired codes and returns just the data blob.
        const { data, error } = await supabase.rpc('redeem_save_code', { p_code: normalized });
        if (error) return { success: false, error: 'Could not reach the server.' };
        if (!data) return { success: false, error: 'Code not found or expired.' };
        const blob = { ...(data as Record<string, string>) };
        const accessToken = blob[SESSION_ACCESS_TOKEN_KEY];
        const refreshToken = blob[SESSION_REFRESH_TOKEN_KEY];
        delete blob[SESSION_ACCESS_TOKEN_KEY];
        delete blob[SESSION_REFRESH_TOKEN_KEY];
        // Take over the original device's Supabase identity BEFORE writing
        // local storage, so the restored cw_device_id and the live auth
        // session agree — otherwise the next ensureAuthId() call re-forks them.
        if (accessToken && refreshToken) {
            try { await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }); } catch {}
        }
        applySaveData(blob);
        return { success: true };
    } catch {
        return { success: false, error: 'Could not reach the server.' };
    }
}
