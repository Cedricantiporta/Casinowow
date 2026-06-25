// Leaderboard data layer.
//
// When Supabase is configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY) this
// upserts the local device's stats and reads the live top players. When it is not
// configured, it falls back to a deterministic seeded board so the UI always works.
import { supabase } from './supabaseClient';

// Ranking metrics the board can be sorted by.
export type LeaderboardMetric = 'score' | 'totalWon' | 'maxJackpot' | 'maxWin';

// Maps a metric to its Supabase column.
const METRIC_COLUMN: Record<LeaderboardMetric, string> = {
    score: 'score',
    totalWon: 'total_won',
    maxJackpot: 'max_jackpot',
    maxWin: 'max_win',
};

export interface LeaderboardEntry {
    id: string;
    name: string;
    avatar: string; // path under /public, e.g. "/Profile_pic (3).png"
    level: number;
    score: number;       // total coins
    gems: number;        // total gems
    totalWon: number;    // lifetime coins won
    maxJackpot: number;  // biggest jackpot
    maxWin: number;      // biggest single win
    isYou?: boolean;
}

export interface LocalPlayer {
    name: string;
    avatar: string;
    level: number;
    score: number;
    gems: number;
    totalWon: number;
    maxJackpot: number;
    maxWin: number;
}

// A fixed roster of high rollers. Values are large and static so the board feels
// established; the local player is merged in each time it's read. Gems are derived
// from score so the seed stays compact.
const SEED: Omit<LeaderboardEntry, 'isYou' | 'gems'>[] = [
    { id: 's1',  name: 'MidnightAce',  avatar: '/Profile_pic (1).png',  level: 142, score: 8_420_000_000, totalWon: 31_200_000_000, maxJackpot: 1_850_000_000, maxWin: 940_000_000 },
    { id: 's2',  name: 'GoldenTiger',  avatar: '/Profile_pic (5).png',  level: 137, score: 6_910_000_000, totalWon: 27_400_000_000, maxJackpot: 1_620_000_000, maxWin: 880_000_000 },
    { id: 's3',  name: 'LuckyNova',    avatar: '/Profile_pic (9).png',  level: 129, score: 5_730_000_000, totalWon: 23_900_000_000, maxJackpot: 1_410_000_000, maxWin: 760_000_000 },
    { id: 's4',  name: 'VegasQueen',   avatar: '/Profile_pic (2).png',  level: 121, score: 4_880_000_000, totalWon: 20_100_000_000, maxJackpot: 1_180_000_000, maxWin: 690_000_000 },
    { id: 's5',  name: 'HighRoller_X', avatar: '/Profile_pic (7).png',  level: 118, score: 4_120_000_000, totalWon: 17_800_000_000, maxJackpot: 990_000_000,   maxWin: 610_000_000 },
    { id: 's6',  name: 'NeonShark',    avatar: '/Profile_pic (11).png', level: 110, score: 3_540_000_000, totalWon: 15_300_000_000, maxJackpot: 870_000_000,   maxWin: 540_000_000 },
    { id: 's7',  name: 'DiamondHands', avatar: '/Profile_pic (4).png',  level: 104, score: 2_980_000_000, totalWon: 13_100_000_000, maxJackpot: 720_000_000,   maxWin: 480_000_000 },
    { id: 's8',  name: 'SpinSultan',   avatar: '/Profile_pic (8).png',  level: 97,  score: 2_410_000_000, totalWon: 10_800_000_000, maxJackpot: 610_000_000,   maxWin: 410_000_000 },
    { id: 's9',  name: 'JackpotJin',   avatar: '/Profile_pic (12).png', level: 92,  score: 1_960_000_000, totalWon: 9_200_000_000,  maxJackpot: 1_240_000_000, maxWin: 360_000_000 },
    { id: 's10', name: 'WildWolf',     avatar: '/Profile_pic (6).png',  level: 88,  score: 1_540_000_000, totalWon: 7_600_000_000,  maxJackpot: 480_000_000,   maxWin: 320_000_000 },
    { id: 's11', name: 'RubyReels',    avatar: '/Profile_pic (3).png',  level: 83,  score: 1_180_000_000, totalWon: 6_100_000_000,  maxJackpot: 390_000_000,   maxWin: 270_000_000 },
    { id: 's12', name: 'CosmicCash',   avatar: '/Profile_pic (10).png', level: 79,  score: 940_000_000,   totalWon: 4_900_000_000,  maxJackpot: 330_000_000,   maxWin: 230_000_000 },
    { id: 's13', name: 'EmberFox',     avatar: '/Profile_pic (1).png',  level: 74,  score: 720_000_000,   totalWon: 3_800_000_000,  maxJackpot: 280_000_000,   maxWin: 190_000_000 },
    { id: 's14', name: 'SilkSpinner',  avatar: '/Profile_pic (5).png',  level: 69,  score: 560_000_000,   totalWon: 2_900_000_000,  maxJackpot: 220_000_000,   maxWin: 160_000_000 },
    { id: 's15', name: 'TurboTycoon',  avatar: '/Profile_pic (9).png',  level: 64,  score: 430_000_000,   totalWon: 2_200_000_000,  maxJackpot: 180_000_000,   maxWin: 130_000_000 },
    { id: 's16', name: 'PixelPirate',  avatar: '/Profile_pic (2).png',  level: 58,  score: 320_000_000,   totalWon: 1_600_000_000,  maxJackpot: 140_000_000,   maxWin: 98_000_000 },
    { id: 's17', name: 'AmberAce',     avatar: '/Profile_pic (7).png',  level: 52,  score: 240_000_000,   totalWon: 1_150_000_000,  maxJackpot: 110_000_000,   maxWin: 76_000_000 },
    { id: 's18', name: 'FrostByte',    avatar: '/Profile_pic (11).png', level: 47,  score: 175_000_000,   totalWon: 820_000_000,    maxJackpot: 84_000_000,    maxWin: 58_000_000 },
    { id: 's19', name: 'MintMogul',    avatar: '/Profile_pic (4).png',  level: 41,  score: 120_000_000,   totalWon: 540_000_000,    maxJackpot: 61_000_000,    maxWin: 42_000_000 },
    { id: 's20', name: 'CandyKing',    avatar: '/Profile_pic (8).png',  level: 35,  score: 78_000_000,    totalWon: 320_000_000,    maxJackpot: 44_000_000,    maxWin: 29_000_000 },
];

const LIMIT = 50;
const TABLE = 'leaderboard';

const metricValue = (e: { score: number; totalWon: number; maxJackpot: number; maxWin: number }, m: LeaderboardMetric) =>
    m === 'totalWon' ? e.totalWon : m === 'maxJackpot' ? e.maxJackpot : m === 'maxWin' ? e.maxWin : e.score;

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

function seededBoard(you: LocalPlayer, metric: LeaderboardMetric): LeaderboardEntry[] {
    const merged: LeaderboardEntry[] = [
        ...SEED.map(e => ({ ...e, gems: Math.floor(e.score / 4000) })),
        { id: 'you', name: you.name || 'You', avatar: you.avatar, level: you.level, score: you.score, gems: you.gems, totalWon: you.totalWon, maxJackpot: you.maxJackpot, maxWin: you.maxWin, isYou: true },
    ];
    merged.sort((a, b) => metricValue(b, metric) - metricValue(a, metric));
    return merged.slice(0, LIMIT);
}

/**
 * Upserts this device's stats, then returns the live board ranked by `metric`.
 * Falls back to the seeded board if Supabase is unconfigured or the request fails.
 */
export async function fetchTopPlayers(you: LocalPlayer, metric: LeaderboardMetric = 'score'): Promise<LeaderboardEntry[]> {
    if (!supabase) return seededBoard(you, metric);
    const deviceId = getDeviceId();
    try {
        await submitScore(you);
        // select('*') survives schema drift — missing metric columns just read as 0
        // instead of failing the whole query.
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .order(METRIC_COLUMN[metric], { ascending: false })
            .limit(LIMIT);
        if (error) {
            console.warn('[leaderboard] read failed — run supabase/leaderboard.sql?', error.message);
            return seededBoard(you, metric);
        }
        if (!data || data.length === 0) return seededBoard(you, metric);
        return data.map(row => ({
            id: row.device_id,
            name: row.name || 'Player',
            avatar: row.avatar || '/Profile_pic (3).png',
            level: row.level ?? 1,
            score: Number(row.score) || 0,
            gems: Number(row.gems) || 0,
            totalWon: Number(row.total_won) || 0,
            maxJackpot: Number(row.max_jackpot) || 0,
            maxWin: Number(row.max_win) || 0,
            isYou: row.device_id === deviceId,
        }));
    } catch (e) {
        console.warn('[leaderboard] read exception:', e);
        return seededBoard(you, metric);
    }
}

/**
 * Pushes the local device's stats to the backend (no-op when unconfigured).
 */
export async function submitScore(you: LocalPlayer): Promise<void> {
    if (!supabase) return;
    const deviceId = getDeviceId();
    const core = {
        device_id: deviceId,
        name: you.name || 'Player',
        avatar: you.avatar || '',
        level: you.level,
        score: Math.round(you.score),
        updated_at: new Date().toISOString(),
    };
    const full = {
        ...core,
        gems: Math.round(you.gems),
        total_won: Math.round(you.totalWon),
        max_jackpot: Math.round(you.maxJackpot),
        max_win: Math.round(you.maxWin),
    };
    try {
        const { error } = await supabase.from(TABLE).upsert(full, { onConflict: 'device_id' });
        if (error) {
            // Most likely the new columns aren't in the table yet — retry with the core
            // columns so at least name/level/score still update, and surface the reason.
            console.warn('[leaderboard] write failed — run supabase/leaderboard.sql?', error.message);
            const { error: e2 } = await supabase.from(TABLE).upsert(core, { onConflict: 'device_id' });
            if (e2) console.warn('[leaderboard] core write also failed:', e2.message);
        }
    } catch (e) {
        console.warn('[leaderboard] write exception:', e);
    }
}
