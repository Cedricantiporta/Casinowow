// Avatar unlock system. Each profile picture unlocks through an existing
// progression system (level, VIP, Arena rank) or is Event-exclusive (never
// purchasable — shown locked with an "Event" label only).

export type AvatarUnlock =
    | { type: 'default' }
    | { type: 'level'; level: number }
    | { type: 'vip' }
    | { type: 'arena'; tier: number; rank: string } // tier = tierIndex threshold
    | { type: 'event' };

export interface AvatarDef {
    path: string;
    unlock: AvatarUnlock;
}

// Arena tier thresholds: Master III = 3, Epic III = 9, Legend III = 12, Mythic III = 15.
export const AVATARS: AvatarDef[] = [
    { path: '/profilepicsnew (4).png',  unlock: { type: 'default' } },
    { path: '/profilepicsnew (2).png',  unlock: { type: 'level', level: 10 } },
    { path: '/profilepicsnew (3).png',  unlock: { type: 'level', level: 25 } },
    { path: '/profilepicsnew (5).png',  unlock: { type: 'level', level: 45 } },
    { path: '/profilepicsnew (6).png',  unlock: { type: 'level', level: 70 } },
    { path: '/profilepicsnew (7).png',  unlock: { type: 'vip' } },
    { path: '/profilepicsnew (8).png',  unlock: { type: 'arena', tier: 3,  rank: 'Master' } },
    { path: '/profilepicsnew (9).png',  unlock: { type: 'arena', tier: 9,  rank: 'Epic' } },
    { path: '/profilepicsnew (13).png', unlock: { type: 'arena', tier: 12, rank: 'Legend' } },
    { path: '/profilepicsnew (11).png', unlock: { type: 'arena', tier: 15, rank: 'Mythic' } },
    { path: '/profilepicsnew (12).png', unlock: { type: 'event' } },
    { path: '/profilepicsnew (10).png', unlock: { type: 'event' } },
    { path: '/profilepicsnew (14).png', unlock: { type: 'event' } },
    { path: '/profilepicsnew (15).png', unlock: { type: 'event' } },
    { path: '/profilepicsnew (16).png', unlock: { type: 'event' } },
];

export interface AvatarContext {
    level: number;
    isVip: boolean;
    arenaTier: number;
    unlockedAvatars: string[]; // claimed event-avatar paths
}

export function isAvatarUnlocked(def: AvatarDef, ctx: AvatarContext): boolean {
    switch (def.unlock.type) {
        case 'default': return true;
        case 'level':   return ctx.level >= def.unlock.level;
        case 'vip':     return !!ctx.isVip;
        case 'arena':   return ctx.arenaTier >= def.unlock.tier;
        case 'event':   return ctx.unlockedAvatars.includes(def.path);
    }
}

// Avatars that get a glowing gold ring wherever they're shown publicly (guild
// roster, leaderboard): Legend/Mythic arena tiers and every event-exclusive avatar.
const GLOWING_ARENA_RANKS = new Set(['Legend', 'Mythic']);
export function isGlowingAvatar(path: string): boolean {
    const def = AVATARS.find(a => a.path === path);
    if (!def) return false;
    if (def.unlock.type === 'event') return true;
    if (def.unlock.type === 'arena') return GLOWING_ARENA_RANKS.has(def.unlock.rank);
    return false;
}
export const GLOWING_AVATAR_RING = '0 0 0 2px #ffd24a, 0 0 10px 3px rgba(255,210,74,0.75)';

// Short requirement label for a locked avatar (e.g. "Lvl 25", "VIP", "Master", "Event").
export function avatarRequirementLabel(def: AvatarDef): string {
    switch (def.unlock.type) {
        case 'default': return '';
        case 'level':   return `Lvl ${def.unlock.level}`;
        case 'vip':     return 'VIP';
        case 'arena':   return def.unlock.rank;
        case 'event':   return 'Event';
    }
}
