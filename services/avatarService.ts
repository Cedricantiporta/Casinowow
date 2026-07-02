// Avatar unlock system. Each of the 12 profile pictures unlocks through an
// existing progression system (level, VIP, Arena rank) or can be bought with
// gems. Purchased avatars are stored in PlayerState.unlockedAvatars.

export type AvatarUnlock =
    | { type: 'default' }
    | { type: 'level'; level: number }
    | { type: 'vip' }
    | { type: 'arena'; tier: number; rank: string } // tier = tierIndex threshold
    | { type: 'gems'; cost: number };

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
    { path: '/profilepicsnew (10).png',  unlock: { type: 'arena', tier: 12, rank: 'Legend' } },
    { path: '/profilepicsnew (11).png', unlock: { type: 'arena', tier: 15, rank: 'Mythic' } },
    { path: '/profilepicsnew (12).png', unlock: { type: 'gems', cost: 5000 } },
    { path: '/profilepicsnew (13).png', unlock: { type: 'gems', cost: 12000 } },
    { path: '/profilepicsnew (14).png', unlock: { type: 'gems', cost: 20000 } },
    { path: '/profilepicsnew (15).png', unlock: { type: 'gems', cost: 30000 } },
    { path: '/profilepicsnew (16).png', unlock: { type: 'gems', cost: 45000 } },
];

export interface AvatarContext {
    level: number;
    isVip: boolean;
    arenaTier: number;
    unlockedAvatars: string[]; // gem-purchased / claimed paths
}

export function isAvatarUnlocked(def: AvatarDef, ctx: AvatarContext): boolean {
    switch (def.unlock.type) {
        case 'default': return true;
        case 'level':   return ctx.level >= def.unlock.level;
        case 'vip':     return !!ctx.isVip;
        case 'arena':   return ctx.arenaTier >= def.unlock.tier;
        case 'gems':    return ctx.unlockedAvatars.includes(def.path);
    }
}

// Short requirement label for a locked avatar (e.g. "Lvl 25", "VIP", "Master", "5K").
export function avatarRequirementLabel(def: AvatarDef): string {
    switch (def.unlock.type) {
        case 'default': return '';
        case 'level':   return `Lvl ${def.unlock.level}`;
        case 'vip':     return 'VIP';
        case 'arena':   return def.unlock.rank;
        case 'gems':    return def.unlock.cost >= 1000 ? `${def.unlock.cost / 1000}K` : `${def.unlock.cost}`;
    }
}
