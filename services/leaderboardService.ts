// Leaderboard data layer.
//
// Right now this serves a deterministic, believable set of "top players" from the
// device so the UI is fully functional with no backend. It is intentionally shaped
// so that wiring a real backend (e.g. Supabase) later is a one-function change:
// replace the body of `fetchTopPlayers` / `submitScore` with network calls and keep
// the same return shapes.

export interface LeaderboardEntry {
    id: string;
    name: string;
    avatar: string; // path under /public, e.g. "/Profile_pic (3).png"
    level: number;
    score: number;  // total coins — the ranking metric
    isYou?: boolean;
}

export interface LocalPlayer {
    name: string;
    avatar: string;
    level: number;
    score: number;
}

// A fixed roster of high rollers. Scores are large and static so the board feels
// established; the local player is merged in by score each time it's read.
const SEED: Omit<LeaderboardEntry, 'isYou'>[] = [
    { id: 's1',  name: 'MidnightAce',   avatar: '/Profile_pic (1).png',  level: 142, score: 8_420_000_000 },
    { id: 's2',  name: 'GoldenTiger',   avatar: '/Profile_pic (5).png',  level: 137, score: 6_910_000_000 },
    { id: 's3',  name: 'LuckyNova',     avatar: '/Profile_pic (9).png',  level: 129, score: 5_730_000_000 },
    { id: 's4',  name: 'VegasQueen',    avatar: '/Profile_pic (2).png',  level: 121, score: 4_880_000_000 },
    { id: 's5',  name: 'HighRoller_X',  avatar: '/Profile_pic (7).png',  level: 118, score: 4_120_000_000 },
    { id: 's6',  name: 'NeonShark',     avatar: '/Profile_pic (11).png', level: 110, score: 3_540_000_000 },
    { id: 's7',  name: 'DiamondHands',  avatar: '/Profile_pic (4).png',  level: 104, score: 2_980_000_000 },
    { id: 's8',  name: 'SpinSultan',    avatar: '/Profile_pic (8).png',  level: 97,  score: 2_410_000_000 },
    { id: 's9',  name: 'JackpotJin',    avatar: '/Profile_pic (12).png', level: 92,  score: 1_960_000_000 },
    { id: 's10', name: 'WildWolf',      avatar: '/Profile_pic (6).png',  level: 88,  score: 1_540_000_000 },
    { id: 's11', name: 'RubyReels',     avatar: '/Profile_pic (3).png',  level: 83,  score: 1_180_000_000 },
    { id: 's12', name: 'CosmicCash',    avatar: '/Profile_pic (10).png', level: 79,  score: 940_000_000 },
    { id: 's13', name: 'EmberFox',      avatar: '/Profile_pic (1).png',  level: 74,  score: 720_000_000 },
    { id: 's14', name: 'SilkSpinner',   avatar: '/Profile_pic (5).png',  level: 69,  score: 560_000_000 },
    { id: 's15', name: 'TurboTycoon',   avatar: '/Profile_pic (9).png',  level: 64,  score: 430_000_000 },
    { id: 's16', name: 'PixelPirate',   avatar: '/Profile_pic (2).png',  level: 58,  score: 320_000_000 },
    { id: 's17', name: 'AmberAce',      avatar: '/Profile_pic (7).png',  level: 52,  score: 240_000_000 },
    { id: 's18', name: 'FrostByte',     avatar: '/Profile_pic (11).png', level: 47,  score: 175_000_000 },
    { id: 's19', name: 'MintMogul',     avatar: '/Profile_pic (4).png',  level: 41,  score: 120_000_000 },
    { id: 's20', name: 'CandyKing',     avatar: '/Profile_pic (8).png',  level: 35,  score: 78_000_000 },
];

const LIMIT = 50;

/**
 * Returns the ranked leaderboard with the local player merged in by score.
 * Async so a network-backed implementation can drop in without touching callers.
 */
export async function fetchTopPlayers(you: LocalPlayer): Promise<LeaderboardEntry[]> {
    const merged: LeaderboardEntry[] = [
        ...SEED.map(e => ({ ...e })),
        { id: 'you', name: you.name || 'You', avatar: you.avatar, level: you.level, score: you.score, isYou: true },
    ];
    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, LIMIT);
}

/**
 * Placeholder for pushing the local player's score to a backend.
 * No-op today; becomes an upsert when a backend is connected.
 */
export async function submitScore(_you: LocalPlayer): Promise<void> {
    return;
}
