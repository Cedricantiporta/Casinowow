// Guild data layer — mirrors leaderboardService.ts's pattern: real rows in Supabase
// when configured, graceful no-op/local fallback when it isn't.
import { supabase, ensureAuthId } from './supabaseClient';
import { getDeviceId } from './leaderboardService';
import { Guild, GuildMember, GuildRole, GuildSummary } from '../types';

const GUILDS_TABLE = 'guilds';
const MEMBERS_TABLE = 'guild_members';

export { getDeviceId };

// Crest artwork (uploaded assets) — full standalone icons, no background
// container/color chip behind them. Only 5 of the uploaded crests are offered
// as selections.
export const GUILD_ICONS: { icon: string }[] = [
    { icon: '/crest.png' },
    { icon: '/crest (1).png' },
    { icon: '/crest (2).png' },
    { icon: '/crest (3).png' },
    { icon: '/crest (4).png' },
];

export const GUILD_CREATE_COST_GEMS = 500;
export const GUILD_MAX_MEMBERS = 50;
export const GUILD_MAX_LEVEL = 10;
export const GUILD_DONATIONS_PER_DAY = 2;
export const GUILD_DONATE_GEMS = 100;
export const GUILD_DONATE_BET_PCT = 0.10;
export const GUILD_DONATE_CONTRIBUTION = 100;
export const GUILD_TASK_REFRESH_BASE_COST = 10;
export const GUILD_TASK_REFRESH_MAX_MULT = 5; // cost caps at 500% of base (6x total)

// Level N requires 1000 * 1.35^(N-1) cumulative XP — smooth, unbounded curve.
export function guildXpForNextLevel(level: number): number {
    return Math.round(1000 * Math.pow(1.35, level - 1));
}

// Monthly top-10 guild rewards, granted per-member. Durations are hours so every
// field composes the same way against the existing boost end-time fields.
export interface GuildRewardTier {
    betMult: number;
    gems: number;
    collectHours: number;
    xpHours: number;
    missionHours: number;
    arenaHours: number;
}
export const GUILD_MONTHLY_REWARDS: Record<number, GuildRewardTier> = {
    1: { betMult: 50, gems: 3000, collectHours: 240, xpHours: 168, missionHours: 72, arenaHours: 24 },
    2: { betMult: 30, gems: 2000, collectHours: 168, xpHours: 72,  missionHours: 48, arenaHours: 12 },
    3: { betMult: 15, gems: 1000, collectHours: 72,  xpHours: 48,  missionHours: 24, arenaHours: 6  },
};
export const GUILD_MONTHLY_REWARD_4_TO_10: GuildRewardTier = { betMult: 5, gems: 500, collectHours: 24, xpHours: 24, missionHours: 12, arenaHours: 0 };
export function rewardTierForRank(rank1Based: number): GuildRewardTier | null {
    if (rank1Based <= 3) return GUILD_MONTHLY_REWARDS[rank1Based];
    if (rank1Based <= 10) return GUILD_MONTHLY_REWARD_4_TO_10;
    return null;
}

function rowToSummary(row: any): GuildSummary {
    return {
        id: row.id,
        name: row.name,
        description: row.description || '',
        icon: row.icon || GUILD_ICONS[0].icon,
        color: row.color || 'from-indigo-500 via-violet-600 to-purple-900',
        isOpen: row.is_open ?? true,
        level: row.level ?? 1,
        xp: Number(row.xp) || 0,
        contributionPoints: Number(row.contribution_points) || 0,
        memberCount: row.member_count ?? 1,
    };
}

function memberRowToMember(row: any): GuildMember {
    return {
        deviceId: row.device_id,
        name: row.name || 'Player',
        avatar: row.avatar || '',
        role: (row.role || 'MEMBER') as GuildRole,
        contribution: Number(row.contribution) || 0,
        joinedAt: row.joined_at ? new Date(row.joined_at).getTime() : Date.now(),
    };
}

export async function getTopGuildsByLevel(limit = 10): Promise<GuildSummary[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from(GUILDS_TABLE).select('*')
            .order('level', { ascending: false }).order('xp', { ascending: false }).limit(limit);
        if (error || !data) return [];
        return data.map(rowToSummary);
    } catch {
        return [];
    }
}

// Contribution points (from donations + CONTRIBUTION-kind tasks) are what monthly
// rank rewards are based on — a guild doesn't need to be high-level to place, so
// every guild has a real shot regardless of how long it's existed.
export async function getTopGuildsByContribution(limit = 10): Promise<GuildSummary[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.from(GUILDS_TABLE).select('*')
            .order('contribution_points', { ascending: false }).limit(limit);
        if (error) { console.warn('[guild] top-by-contribution read failed — run supabase/guilds.sql?', error.message); return []; }
        if (!data) return [];
        return data.map(rowToSummary);
    } catch (e) {
        console.warn('[guild] getTopGuildsByContribution exception:', e);
        return [];
    }
}

export async function searchGuilds(query: string, limit = 30): Promise<GuildSummary[]> {
    if (!supabase) return [];
    try {
        let q = supabase.from(GUILDS_TABLE).select('*').order('xp', { ascending: false }).limit(limit);
        if (query.trim()) q = q.ilike('name', `%${query.trim()}%`);
        const { data, error } = await q;
        if (error || !data) return [];
        return data.map(rowToSummary);
    } catch {
        return [];
    }
}

// Public read-only lookup — for viewing any guild's profile (members, leader,
// level, contribution) from Browse/Search/Rankings, not just your own.
export async function getGuildById(guildId: string): Promise<Guild | null> {
    if (!supabase) return null;
    try {
        const { data: guildRow, error: gErr } = await supabase.from(GUILDS_TABLE).select('*').eq('id', guildId).maybeSingle();
        if (gErr || !guildRow) return null;
        const { data: members } = await supabase
            .from(MEMBERS_TABLE).select('*').eq('guild_id', guildId).order('joined_at', { ascending: true });
        return {
            ...rowToSummary(guildRow),
            leaderId: guildRow.leader_id,
            members: (members || []).map(memberRowToMember),
        };
    } catch {
        return null;
    }
}

export async function getMyGuild(deviceId: string = getDeviceId()): Promise<Guild | null> {
    if (!supabase) return null;
    try {
        const { data: memberRow, error: mErr } = await supabase
            .from(MEMBERS_TABLE).select('*').eq('device_id', deviceId).maybeSingle();
        if (mErr || !memberRow) return null;
        const { data: guildRow, error: gErr } = await supabase
            .from(GUILDS_TABLE).select('*').eq('id', memberRow.guild_id).maybeSingle();
        if (gErr || !guildRow) return null;
        const { data: members } = await supabase
            .from(MEMBERS_TABLE).select('*').eq('guild_id', memberRow.guild_id).order('joined_at', { ascending: true });
        return {
            ...rowToSummary(guildRow),
            leaderId: guildRow.leader_id,
            members: (members || []).map(memberRowToMember),
        };
    } catch {
        return null;
    }
}

// All guild MUTATIONS go through SECURITY DEFINER RPCs (see supabase/guilds.sql)
// that verify the caller's auth.uid() and role server-side — the tables are not
// directly writable by clients. Each awaits ensureAuthId() so the session exists.
// A friendlier message is mapped from the RPC's raised-exception text.

const GUILD_ERR: Record<string, string> = {
    'already in a guild': 'You are already in a guild.',
    'guild full': 'That guild is full.',
    'leader must transfer or disband': 'Delegate leadership to another member before leaving, or disband the guild.',
    'not the leader': 'Only the leader can do that.',
    'insufficient rank': 'You do not have permission to do that.',
};
function guildError(msg: string | undefined, fallback: string): string {
    if (!msg) return fallback;
    if (msg.includes('duplicate') || msg.includes('unique') || msg.toLowerCase().includes('guilds_name')) return 'That name is taken.';
    for (const key of Object.keys(GUILD_ERR)) if (msg.includes(key)) return GUILD_ERR[key];
    return fallback;
}

export async function createGuild(
    name: string, description: string, icon: string, color: string, isOpen: boolean,
    you: { deviceId: string; name: string; avatar: string },
): Promise<{ guild?: Guild; error?: string }> {
    if (!supabase) return { error: 'Guilds are unavailable right now.' };
    await ensureAuthId();
    try {
        const { data: gid, error } = await supabase.rpc('guild_create', {
            p_name: name.trim(), p_description: description.trim(), p_icon: icon, p_color: color,
            p_is_open: isOpen, p_player_name: you.name, p_avatar: you.avatar,
        });
        if (error || !gid) return { error: guildError(error?.message, 'Could not create guild.') };
        const guild = await getGuildById(gid as string);
        return guild ? { guild } : { error: 'Could not create guild.' };
    } catch {
        return { error: 'Could not create guild.' };
    }
}

export async function joinGuild(guildId: string, you: { deviceId: string; name: string; avatar: string }): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Guilds are unavailable right now.' };
    await ensureAuthId();
    try {
        const { error } = await supabase.rpc('guild_join', { p_guild_id: guildId, p_player_name: you.name, p_avatar: you.avatar });
        if (error) return { error: guildError(error.message, 'Could not join guild — it may be full or you already belong to one.') };
        return {};
    } catch {
        return { error: 'Could not join guild.' };
    }
}

// The leader can't just walk away and leave the guild leaderless — the RPC
// blocks it unless they've transferred leadership or are the last member.
export async function leaveGuild(guildId: string, _deviceId: string): Promise<{ error?: string }> {
    if (!supabase) return {};
    await ensureAuthId();
    try {
        const { error } = await supabase.rpc('guild_leave', { p_guild_id: guildId });
        if (error) return { error: guildError(error.message, 'Could not leave guild.') };
        return {};
    } catch {
        return { error: 'Could not leave guild.' };
    }
}

// Leader-only (enforced server-side): hand leadership to another member,
// demoting the outgoing leader to Officer.
export async function transferLeadership(guildId: string, _fromDeviceId: string, toDeviceId: string): Promise<void> {
    if (!supabase) return;
    await ensureAuthId();
    try { await supabase.rpc('guild_transfer_leadership', { p_guild_id: guildId, p_to: toDeviceId }); } catch { /* best-effort */ }
}

export async function kickMember(guildId: string, targetDeviceId: string): Promise<void> {
    if (!supabase) return;
    await ensureAuthId();
    try { await supabase.rpc('guild_kick', { p_guild_id: guildId, p_target: targetDeviceId }); } catch { /* best-effort */ }
}

// Promote/demote between Officer and Member only (leader-only, server-enforced).
export async function setMemberRole(guildId: string, targetDeviceId: string, role: 'OFFICER' | 'MEMBER'): Promise<void> {
    if (!supabase) return;
    await ensureAuthId();
    try { await supabase.rpc('guild_set_role', { p_guild_id: guildId, p_target: targetDeviceId, p_role: role }); } catch { /* best-effort */ }
}

export async function disbandGuild(guildId: string): Promise<void> {
    if (!supabase) return;
    await ensureAuthId();
    try { await supabase.rpc('guild_disband', { p_guild_id: guildId }); } catch { /* best-effort */ }
}

// The description doubles as an announcement banner — Leader/Officers can edit it.
export async function updateGuildDescription(guildId: string, description: string): Promise<void> {
    if (!supabase) return;
    await ensureAuthId();
    try { await supabase.rpc('guild_update_description', { p_guild_id: guildId, p_description: description.slice(0, 200) }); } catch { /* best-effort */ }
}

// Adds XP to the guild's LEVEL (capped at GUILD_MAX_LEVEL server-side). Returns
// the guild's new level if it leveled up, else null.
export async function contributeGuildXp(guildId: string, amount: number): Promise<number | null> {
    if (!supabase || amount <= 0) return null;
    await ensureAuthId();
    try {
        const { data, error } = await supabase.rpc('guild_contribute_xp', { p_guild_id: guildId, p_amount: amount });
        if (error) { console.warn('[guild] contribute_xp failed — run supabase/guilds.sql?', error.message); return null; }
        return (typeof data === 'number') ? data : null;
    } catch {
        return null;
    }
}

// Adds to the guild's CONTRIBUTION POINTS pool (separate from level XP) and this
// member's own contribution total. This is what monthly rank rewards use.
export async function contributeGuildPoints(guildId: string, _deviceId: string, amount: number): Promise<void> {
    if (!supabase || amount <= 0) return;
    await ensureAuthId();
    try {
        const { error } = await supabase.rpc('guild_contribute_points', { p_guild_id: guildId, p_amount: amount });
        if (error) console.warn('[guild] contribute_points failed — run supabase/guilds.sql?', error.message);
    } catch (e) {
        console.warn('[guild] contributeGuildPoints exception:', e);
    }
}
