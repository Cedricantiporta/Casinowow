// Leaderboard data layer.
//
// When Supabase is configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY) this
// upserts the local device's score and reads the live top players. When it is not
// configured, it falls back to a deterministic seeded board so the UI always works.
import { supabase } from './supabaseClient';

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
const TABLE = 'leaderboard';

// Stable anonymous identity for this device.
function getDeviceId(): string {
    try {
        let id = localStorage.getItem('cw_device_id');
        if (!id) {
            id = 'd_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem('cw_device_id', id);
        }
        return id;
    } catch {
        return 'd_anon';
    }
}

function seededBoard(you: LocalPlayer): LeaderboardEntry[] {
    const merged: LeaderboardEntry[] = [
        ...SEED.map(e => ({ ...e })),
        { id: 'you', name: you.name || 'You', avatar: you.avatar, level: you.level, score: you.score, isYou: true },
    ];
    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, LIMIT);
}

/**
 * Upserts this device's score, then returns the live ranked board. Falls back to
 * the seeded board if Supabase is unconfigured or the request fails.
 */
export async function fetchTopPlayers(you: LocalPlayer): Promise<LeaderboardEntry[]> {
    if (!supabase) return seededBoard(you);
    const deviceId = getDeviceId();
    try {
        await submitScore(you);
        const { data, error } = await supabase
            .from(TABLE)
            .select('device_id,name,avatar,level,score')
            .order('score', { ascending: false })
            .limit(LIMIT);
        if (error || !data) return seededBoard(you);
        return data.map(row => ({
            id: row.device_id,
            name: row.name || 'Player',
            avatar: row.avatar || '/Profile_pic (3).png',
            level: row.level ?? 1,
            score: Number(row.score) || 0,
            isYou: row.device_id === deviceId,
        }));
    } catch {
        return seededBoard(you);
    }
}

/**
 * Pushes the local device's score to the backend (no-op when unconfigured).
 */
export async function submitScore(you: LocalPlayer): Promise<void> {
    if (!supabase) return;
    try {
        await supabase.from(TABLE).upsert(
            {
                device_id: getDeviceId(),
                name: you.name || 'Player',
                avatar: you.avatar || '',
                level: you.level,
                score: Math.round(you.score),
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'device_id' },
        );
    } catch {
        // ignore — leaderboard is best-effort
    }
}
