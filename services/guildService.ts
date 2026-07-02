// Guild data layer — mirrors leaderboardService.ts's pattern: real rows in Supabase
// when configured, graceful no-op/local fallback when it isn't.
import { supabase } from './supabaseClient';
import { getDeviceId } from './leaderboardService';
import { Guild, GuildMember, GuildRole, GuildSummary } from '../types';

const GUILDS_TABLE = 'guilds';
const MEMBERS_TABLE = 'guild_members';

export { getDeviceId };

export const GUILD_ICONS: { icon: string; color: string }[] = [
    { icon: 'ti-shield',        color: 'from-indigo-500 via-violet-600 to-purple-900' },
    { icon: 'ti-sword',         color: 'from-red-500 via-rose-600 to-red-950' },
    { icon: 'ti-crown',         color: 'from-yellow-500 via-amber-600 to-orange-900' },
    { icon: 'ti-flame',         color: 'from-orange-500 via-red-600 to-rose-950' },
    { icon: 'ti-skull',         color: 'from-slate-500 via-slate-700 to-slate-950' },
    { icon: 'ti-diamond',       color: 'from-cyan-400 via-sky-600 to-indigo-900' },
    { icon: 'ti-paw',           color: 'from-lime-500 via-green-600 to-emerald-900' },
    { icon: 'ti-bolt',          color: 'from-fuchsia-500 via-purple-600 to-indigo-900' },
];

export const GUILD_CREATE_COST_GEMS = 500;
export const GUILD_MAX_MEMBERS = 50;
export const GUILD_MAX_LEVEL = 100;
export const GUILD_DONATIONS_PER_DAY = 2;
export const GUILD_DONATE_GEMS = 100;
export const GUILD_DONATE_BET_PCT = 0.10;
export const GUILD_DONATE_XP = 100;
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
    1: { betMult: 100, gems: 3000, collectHours: 240, xpHours: 168, missionHours: 72, arenaHours: 24 },
    2: { betMult: 60,  gems: 2000, collectHours: 168, xpHours: 72,  missionHours: 48, arenaHours: 12 },
    3: { betMult: 30,  gems: 1000, collectHours: 72,  xpHours: 48,  missionHours: 24, arenaHours: 6  },
};
export const GUILD_MONTHLY_REWARD_4_TO_10: GuildRewardTier = { betMult: 10, gems: 500, collectHours: 24, xpHours: 24, missionHours: 12, arenaHours: 0 };
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
        icon: row.icon || 'ti-shield',
        color: row.color || GUILD_ICONS[0].color,
        isOpen: row.is_open ?? true,
        level: row.level ?? 1,
        xp: Number(row.xp) || 0,
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

export async function getTopGuilds(limit = 10): Promise<GuildSummary[]> {
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

export async function createGuild(
    name: string, description: string, icon: string, color: string, isOpen: boolean,
    you: { deviceId: string; name: string; avatar: string },
): Promise<{ guild?: Guild; error?: string }> {
    if (!supabase) return { error: 'Guilds are unavailable right now.' };
    try {
        const { data: guildRow, error } = await supabase
            .from(GUILDS_TABLE)
            .insert({ name: name.trim(), description: description.trim(), icon, color, is_open: isOpen, leader_id: you.deviceId, member_count: 1 })
            .select('*').single();
        if (error || !guildRow) return { error: error?.code === '23505' ? 'That name is taken.' : 'Could not create guild.' };
        const { error: mErr } = await supabase.from(MEMBERS_TABLE).insert({
            guild_id: guildRow.id, device_id: you.deviceId, name: you.name, avatar: you.avatar, role: 'LEADER',
        });
        if (mErr) return { error: 'Could not join your own guild.' };
        return { guild: { ...rowToSummary(guildRow), leaderId: you.deviceId, members: [{ deviceId: you.deviceId, name: you.name, avatar: you.avatar, role: 'LEADER', contribution: 0, joinedAt: Date.now() }] } };
    } catch {
        return { error: 'Could not create guild.' };
    }
}

export async function joinGuild(guildId: string, you: { deviceId: string; name: string; avatar: string }): Promise<{ error?: string }> {
    if (!supabase) return { error: 'Guilds are unavailable right now.' };
    try {
        const { data: g } = await supabase.from(GUILDS_TABLE).select('member_count').eq('id', guildId).maybeSingle();
        if ((g?.member_count ?? 0) >= GUILD_MAX_MEMBERS) return { error: 'That guild is full.' };
        const { error } = await supabase.from(MEMBERS_TABLE).insert({
            guild_id: guildId, device_id: you.deviceId, name: you.name, avatar: you.avatar, role: 'MEMBER',
        });
        if (error) return { error: 'Could not join guild — it may be full or you already belong to one.' };
        await supabase.from(GUILDS_TABLE).update({ member_count: (g?.member_count ?? 1) + 1 }).eq('id', guildId);
        return {};
    } catch {
        return { error: 'Could not join guild.' };
    }
}

// The leader can't just walk away and leave the guild leaderless — they must
// delegate leadership to someone else first, or disband the guild outright.
// Solo leaders (last member) can always leave, since that's equivalent to disbanding.
export async function leaveGuild(guildId: string, deviceId: string): Promise<{ error?: string }> {
    if (!supabase) return {};
    try {
        const { data: members } = await supabase.from(MEMBERS_TABLE).select('*').eq('guild_id', guildId);
        const me = members?.find(m => m.device_id === deviceId);
        const rest = (members || []).filter(m => m.device_id !== deviceId);
        if (me?.role === 'LEADER' && rest.length > 0) {
            return { error: 'Delegate leadership to another member before leaving, or disband the guild.' };
        }
        await supabase.from(MEMBERS_TABLE).delete().eq('guild_id', guildId).eq('device_id', deviceId);
        if (rest.length === 0) {
            await supabase.from(GUILDS_TABLE).delete().eq('id', guildId);
            return {};
        }
        await supabase.from(GUILDS_TABLE).update({ member_count: rest.length }).eq('id', guildId);
        return {};
    } catch {
        return { error: 'Could not leave guild.' };
    }
}

// Leader-only: hand leadership to another member, demoting the outgoing leader
// to Officer so there's never more than one LEADER row.
export async function transferLeadership(guildId: string, fromDeviceId: string, toDeviceId: string): Promise<void> {
    if (!supabase) return;
    try {
        await supabase.from(MEMBERS_TABLE).update({ role: 'OFFICER' }).eq('guild_id', guildId).eq('device_id', fromDeviceId);
        await supabase.from(MEMBERS_TABLE).update({ role: 'LEADER' }).eq('guild_id', guildId).eq('device_id', toDeviceId);
        await supabase.from(GUILDS_TABLE).update({ leader_id: toDeviceId }).eq('id', guildId);
    } catch { /* best-effort */ }
}

export async function kickMember(guildId: string, targetDeviceId: string): Promise<void> {
    if (!supabase) return;
    try {
        await supabase.from(MEMBERS_TABLE).delete().eq('guild_id', guildId).eq('device_id', targetDeviceId);
        const { data: members } = await supabase.from(MEMBERS_TABLE).select('device_id').eq('guild_id', guildId);
        await supabase.from(GUILDS_TABLE).update({ member_count: members?.length ?? 0 }).eq('id', guildId);
    } catch { /* best-effort */ }
}

// Promote/demote between Officer and Member only — leadership changes go
// through transferLeadership so there's never more than one LEADER row.
export async function setMemberRole(guildId: string, targetDeviceId: string, role: 'OFFICER' | 'MEMBER'): Promise<void> {
    if (!supabase) return;
    try {
        await supabase.from(MEMBERS_TABLE).update({ role }).eq('guild_id', guildId).eq('device_id', targetDeviceId);
    } catch { /* best-effort */ }
}

export async function disbandGuild(guildId: string): Promise<void> {
    if (!supabase) return;
    try { await supabase.from(GUILDS_TABLE).delete().eq('id', guildId); } catch { /* best-effort */ }
}

// The description doubles as an announcement banner — Leader/Officers can edit it.
export async function updateGuildDescription(guildId: string, description: string): Promise<void> {
    if (!supabase) return;
    try { await supabase.from(GUILDS_TABLE).update({ description: description.slice(0, 200) }).eq('id', guildId); } catch { /* best-effort */ }
}

// Adds XP to the guild and this member's lifetime contribution, returning the
// guild's new level so the caller can show a level-up celebration.
export async function contributeGuildXp(guildId: string, deviceId: string, amount: number): Promise<number | null> {
    if (!supabase || amount <= 0) return null;
    try {
        const { data: guildRow } = await supabase.from(GUILDS_TABLE).select('xp, level').eq('id', guildId).maybeSingle();
        if (!guildRow) return null;
        let xp = (Number(guildRow.xp) || 0) + amount;
        let level = guildRow.level ?? 1;
        while (level < GUILD_MAX_LEVEL && xp >= guildXpForNextLevel(level)) { xp -= guildXpForNextLevel(level); level++; }
        if (level >= GUILD_MAX_LEVEL) { level = GUILD_MAX_LEVEL; xp = 0; }
        await supabase.from(GUILDS_TABLE).update({ xp, level }).eq('id', guildId);
        const { data: memberRow } = await supabase.from(MEMBERS_TABLE).select('contribution').eq('guild_id', guildId).eq('device_id', deviceId).maybeSingle();
        await supabase.from(MEMBERS_TABLE).update({ contribution: (Number(memberRow?.contribution) || 0) + amount }).eq('guild_id', guildId).eq('device_id', deviceId);
        return level > (guildRow.level ?? 1) ? level : null;
    } catch {
        return null;
    }
}
