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

export const GUILD_CREATE_COST = 500_000;
export const GUILD_MAX_MEMBERS = 30;

// Level N requires 1000 * 1.35^(N-1) cumulative XP — smooth, unbounded curve.
export function guildXpForNextLevel(level: number): number {
    return Math.round(1000 * Math.pow(1.35, level - 1));
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
        const { error } = await supabase.from(MEMBERS_TABLE).insert({
            guild_id: guildId, device_id: you.deviceId, name: you.name, avatar: you.avatar, role: 'MEMBER',
        });
        if (error) return { error: 'Could not join guild — it may be full or you already belong to one.' };
        const { data: g } = await supabase.from(GUILDS_TABLE).select('member_count').eq('id', guildId).maybeSingle();
        await supabase.from(GUILDS_TABLE).update({ member_count: (g?.member_count ?? 1) + 1 }).eq('id', guildId);
        return {};
    } catch {
        return { error: 'Could not join guild.' };
    }
}

export async function leaveGuild(guildId: string, deviceId: string): Promise<void> {
    if (!supabase) return;
    try {
        const { data: members } = await supabase.from(MEMBERS_TABLE).select('*').eq('guild_id', guildId);
        const me = members?.find(m => m.device_id === deviceId);
        const rest = (members || []).filter(m => m.device_id !== deviceId);
        await supabase.from(MEMBERS_TABLE).delete().eq('guild_id', guildId).eq('device_id', deviceId);
        if (rest.length === 0) {
            await supabase.from(GUILDS_TABLE).delete().eq('id', guildId);
            return;
        }
        await supabase.from(GUILDS_TABLE).update({ member_count: rest.length }).eq('id', guildId);
        // Leadership passes to the longest-standing officer, or member, so the guild
        // is never left leaderless.
        if (me?.role === 'LEADER') {
            const next = rest.find(m => m.role === 'OFFICER') || rest[0];
            await supabase.from(MEMBERS_TABLE).update({ role: 'LEADER' }).eq('guild_id', guildId).eq('device_id', next.device_id);
            await supabase.from(GUILDS_TABLE).update({ leader_id: next.device_id }).eq('id', guildId);
        }
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

export async function setMemberRole(guildId: string, targetDeviceId: string, role: GuildRole): Promise<void> {
    if (!supabase) return;
    try {
        await supabase.from(MEMBERS_TABLE).update({ role }).eq('guild_id', guildId).eq('device_id', targetDeviceId);
        if (role === 'LEADER') await supabase.from(GUILDS_TABLE).update({ leader_id: targetDeviceId }).eq('id', guildId);
    } catch { /* best-effort */ }
}

export async function disbandGuild(guildId: string): Promise<void> {
    if (!supabase) return;
    try { await supabase.from(GUILDS_TABLE).delete().eq('id', guildId); } catch { /* best-effort */ }
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
        while (xp >= guildXpForNextLevel(level)) { xp -= guildXpForNextLevel(level); level++; }
        await supabase.from(GUILDS_TABLE).update({ xp, level }).eq('id', guildId);
        const { data: memberRow } = await supabase.from(MEMBERS_TABLE).select('contribution').eq('guild_id', guildId).eq('device_id', deviceId).maybeSingle();
        await supabase.from(MEMBERS_TABLE).update({ contribution: (Number(memberRow?.contribution) || 0) + amount }).eq('guild_id', guildId).eq('device_id', deviceId);
        return level > (guildRow.level ?? 1) ? level : null;
    } catch {
        return null;
    }
}
