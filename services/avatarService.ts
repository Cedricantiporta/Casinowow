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
    { path: '/Profile_pic (3).png',  unlock: { type: 'default' } },
    { path: '/Profile_pic (1).png',  unlock: { type: 'level', level: 10 } },
    { path: '/Profile_pic (2).png',  unlock: { type: 'level', level: 25 } },
    { path: '/Profile_pic (4).png',  unlock: { type: 'level', level: 45 } },
    { path: '/Profile_pic (5).png',  unlock: { type: 'level', level: 70 } },
    { path: '/Profile_pic (6).png',  unlock: { type: 'vip' } },
    { path: '/Profile_pic (7).png',  unlock: { type: 'arena', tier: 3,  rank: 'Master' } },
    { path: '/Profile_pic (8).png',  unlock: { type: 'arena', tier: 9,  rank: 'Epic' } },
    { path: '/Profile_pic (9).png',  unlock: { type: 'arena', tier: 12, rank: 'Legend' } },
    { path: '/Profile_pic (10).png', unlock: { type: 'arena', tier: 15, rank: 'Mythic' } },
    { path: '/Profile_pic (11).png', unlock: { type: 'gems', cost: 5000 } },
    { path: '/Profile_pic (12).png', unlock: { type: 'gems', cost: 12000 } },
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
