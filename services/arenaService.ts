// Arena Ranking System — client-side seasonal competition.
//
// The Arena runs in repeating timed seasons. Players earn Arena Points while
// spinning; at the end of each season they are promoted, held, or demoted based
// on where they place against a pool of ~69 simulated opponents. Everything runs
// locally and persists to localStorage — there is no server dependency. The AI
// roster for a season is regenerated deterministically from its seasonId, so the
// board is stable across re-renders without storing a large blob.

import { ArenaState } from '../types';

// ── Timing ──
export const SEASON_ACTIVE_MS = 10 * 60 * 1000;     // 10 minutes of competition
export const SEASON_PROCESSING_MS = 3 * 60 * 1000;  // 3 minutes between seasons
export const SEASON_TOTAL_MS = SEASON_ACTIVE_MS + SEASON_PROCESSING_MS;

// ── Ranks & divisions ──
// 6 ranks × 3 divisions = 18 tiers. tierIndex 0 = lowest (Warrior III),
// tierIndex 17 = highest (Mythic I). Future ranks can be appended to RANK_NAMES.
export const RANK_NAMES = ['Warrior', 'Master', 'Grand Master', 'Epic', 'Legend', 'Mythic'];
const DIVISION_LABELS = ['III', 'II', 'I']; // index 0 = lowest division of a rank
export const MAX_TIER = RANK_NAMES.length * 3 - 1;

// Accent colour per rank — used for badges/zones in the UI.
export const RANK_COLORS: Record<string, string> = {
    'Warrior':      '#9ca3af', // steel
    'Master':       '#4ade80', // green
    'Grand Master': '#38bdf8', // cyan
    'Epic':         '#c084fc', // purple
    'Legend':       '#fb923c', // orange
    'Mythic':       '#fbbf24', // gold
};

export interface RankInfo {
    tierIndex: number;
    rankName: string;
    division: string;   // 'I' | 'II' | 'III'
    color: string;
    label: string;      // e.g. "Master II"
}

export function rankInfo(tierIndex: number): RankInfo {
    const t = Math.max(0, Math.min(MAX_TIER, tierIndex));
    const rankName = RANK_NAMES[Math.floor(t / 3)];
    const division = DIVISION_LABELS[t % 3];
    return { tierIndex: t, rankName, division, color: RANK_COLORS[rankName] || '#9ca3af', label: `${rankName} ${division}` };
}

// ── Arena points ──
// Base values at the lowest bet tier. Each bet tier above the minimum multiplies
// earned points by 1.5 (compounding), matching the bet-tier scaling in the spec.
export const ARENA_BASE_POINTS = {
    spin: 10,
    'BIG WIN': 100,
    'GREAT WIN': 200,
    'EPIC WIN': 500,
    'MEGA WIN': 700,
    'ULTIMATE WIN': 1000,
};

export const betTierMultiplier = (betIndex: number): number => Math.pow(1.5, Math.max(0, betIndex));

// Points awarded for one spin event. `winType` is null for a plain spin.
export function pointsForEvent(winType: string | null, betIndex: number): number {
    const base = winType && winType in ARENA_BASE_POINTS
        ? (ARENA_BASE_POINTS as Record<string, number>)[winType]
        : ARENA_BASE_POINTS.spin;
    // A win still includes the spin itself; add the spin base so every spin counts.
    const total = winType ? base + ARENA_BASE_POINTS.spin : base;
    return Math.round(total * betTierMultiplier(betIndex));
}

// Win-tier bonus only (no spin base) — for feature wins (jackpots, roulettes,
// cascades, respins) that happen outside the normal per-spin evaluation.
export function winBonusPoints(winType: string | null, betIndex: number): number {
    if (!winType || !(winType in ARENA_BASE_POINTS)) return 0;
    return Math.round((ARENA_BASE_POINTS as Record<string, number>)[winType] * betTierMultiplier(betIndex));
}

// ── Rewards ──  position (1-based) → coins = factor × maxBet × rank multiplier.
// Each rank tier above the lowest increases all rewards by 50% (compounding).
const REWARD_FACTORS: Record<number, number> = { 1: 100, 2: 60, 3: 30, 4: 10, 5: 10 };
export const rankRewardMultiplier = (tierIndex: number): number => Math.pow(1.5, Math.max(0, tierIndex));

export function arenaReward(position: number, maxBet: number, tierIndex: number = 0): number {
    let factor = 0;
    if (position in REWARD_FACTORS) factor = REWARD_FACTORS[position];
    else if (position >= 6 && position <= 10) factor = 5;
    return Math.round(factor * maxBet * rankRewardMultiplier(tierIndex));
}

// Combined reward pool for a rank — sum of every paid position (top 1–10).
export function arenaRewardPool(maxBet: number, tierIndex: number = 0): number {
    let total = 0;
    for (let pos = 1; pos <= 10; pos++) total += arenaReward(pos, maxBet, tierIndex);
    return total;
}

// ── Promotion / demotion ──
// 1–10 promote, 11–50 hold, 51+ demote (clamped at the floor).
export function nextTier(tierIndex: number, position: number): number {
    if (position <= 10) return Math.min(MAX_TIER, tierIndex + 1);
    if (position >= 51) return Math.max(0, tierIndex - 1);
    return tierIndex;
}
export type Outcome = 'promoted' | 'held' | 'demoted';
export function outcomeFor(tierIndex: number, position: number): Outcome {
    if (position <= 10) return tierIndex >= MAX_TIER ? 'held' : 'promoted';
    if (position >= 51) return tierIndex <= 0 ? 'held' : 'demoted';
    return 'held';
}

// ── AI roster ──
// Shared AI username pool — casual handles, anime/meme tags, PascalCase gamer
// names, and a few auto-generated "PlayerNNNN" defaults. Used by both the Arena
// roster and the lifetime leaderboard.
export const AI_NAMES = [
    'kevin88', 'john321', 'matt', 'ryan77', 'sleepy', 'nobody', 'imlost', 'itsme', 'bruh', 'bro', 'bro123',
    'dood', 'dudeee', 'jayy', 'ren', 'kai', 'kenny', 'lucas', 'marky', 'vince', 'potato', 'banana', 'pickle',
    'toaster', 'waffle', 'coffeepls', 'milktea', 'ramen', 'egg', 'rice', 'bread', 'toast', 'hmmm', 'hehe',
    'lol123', 'xdxd', 'ggwp', 'ez', 'ggez', 'lucky777', '777', '888', '999', '420', '69nice', 'onepiece',
    'naruto56', 'gojo', 'itachi', 'luffy', 'zoro', 'kakashi', 'frieren', 'anya', 'delta', 'd3lta', 'nova',
    'n0va', 'void', 'vanta', 'cipher', 'orbit', 'pixel', 'glitch', 'byte', '404', 'error', 'ghost', 'shadow',
    'vibe', 'vibecode', 'unknown', 'anon', 'player1', 'guest442', 'bot01', 'npc', 'afk', 'carry', 'clutch',
    'oneshot', 'taptap', 'spin2win', 'jackpot', 'allin', 'cashout', 'richkid', 'highroller', 'coinflip', 'luckylad',
    // PascalCase gamer names
    'ShadowFox', 'NightOwl', 'SilverWolf', 'GoldenAce', 'IronFist', 'StormBringer', 'FrostBite', 'EmberKing',
    'MysticSage', 'ThunderClap', 'CrimsonBlade', 'LunarEclipse', 'SolarFlare', 'VortexRider', 'PhantomAce',
    'BlazeRunner', 'NebulaStar', 'CobraStrike', 'RavenClaw', 'TitanForge', 'ShadowStrike', 'NeonKnight', 'PixelStorm',
    // Auto-generated defaults
    'Player3213141242', 'Player8829471', 'Player1029384756', 'Player5647382910', 'Player9081726354',
    'Player4455667788', 'Player7263548190', 'Player3948571026',
];

const PROFILE_PICS = ['/Profile_pic (1).png', '/Profile_pic (2).png', '/Profile_pic (3).png', '/Profile_pic (4).png'];
const DEFAULT_PIC = '/Profile_pic (3).png';

// Deterministic PRNG (mulberry32) so a season's roster is stable.
function mulberry32(seed: number) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export interface ArenaEntry {
    id: string;
    name: string;
    avatar: string;
    points: number;
    isYou?: boolean;
}

interface AISeed {
    id: string;
    name: string;
    avatar: string;
    target: number;   // points the AI will reach by season end
    phase: number;    // jitter phase so opponents don't move in lockstep
    rate: number;     // easing exponent variety
}

const POOL_SIZE = 69; // + the player = 70 total, at the lowest tier

// Field shrinks 10% per tier (compounding) as the ranks thin out at the top,
// floored so there's always a meaningful pool to compete against.
export function poolSizeForTier(tierIndex: number): number {
    return Math.max(10, Math.round(POOL_SIZE * Math.pow(0.9, Math.max(0, tierIndex))));
}

// Build the opponent roster for a season. Stronger divisions field stronger
// opponents. `refMult` scales AI points into the same unit range the player earns
// at their current bet tier, so the board reads consistently.
function buildRoster(seasonId: number, tierIndex: number, refMult: number): AISeed[] {
    const rand = mulberry32(seasonId * 2654435761 + tierIndex * 40503 + 1);
    const divMult = 1 + tierIndex * 0.20; // higher tier → noticeably tougher field
    const poolSize = poolSizeForTier(tierIndex);
    const roster: AISeed[] = [];
    const used = new Set<number>();
    for (let i = 0; i < poolSize; i++) {
        let ni = Math.floor(rand() * AI_NAMES.length);
        let guard = 0;
        while (used.has(ni) && guard++ < AI_NAMES.length) ni = (ni + 1) % AI_NAMES.length;
        used.add(ni);
        const name = AI_NAMES[ni] || `Player${10000000 + Math.floor(rand() * 89999999)}`;
        const avatar = rand() < 0.3 ? PROFILE_PICS[Math.floor(rand() * PROFILE_PICS.length)] : DEFAULT_PIC;
        // Power-curve spread: a few strong performers, a long tail of weaker ones.
        const r = rand();
        const baseTarget = 400 + Math.pow(r, 2.2) * 7200; // ~400 .. ~7600 base points
        const target = Math.round(baseTarget * divMult * refMult);
        roster.push({ id: `ai_${seasonId}_${i}`, name, avatar, target, phase: rand() * Math.PI * 2, rate: 2 + rand() });
    }
    return roster;
}

const easeOut = (t: number, p: number) => 1 - Math.pow(1 - t, p);

// Current points for an AI given how far the season has progressed (0..1).
function aiPointsAt(seed: AISeed, progress: number): number {
    const p = Math.max(0, Math.min(1, progress));
    const eased = easeOut(p, seed.rate);
    // Small live jitter (±4%) so positions shuffle naturally during the season.
    const jitter = 1 + 0.04 * Math.sin(seed.phase + p * 6.283);
    return Math.max(0, Math.round(seed.target * eased * jitter));
}

// Full live board (sorted desc) for the current moment of a season.
export function getArenaBoard(state: ArenaState, you: ArenaEntry, nowMs: number): ArenaEntry[] {
    const elapsed = Math.max(0, nowMs - state.seasonStart);
    const progress = Math.min(1, elapsed / SEASON_ACTIVE_MS);
    const roster = buildRoster(state.seasonId, state.tierIndex, state.refMult || 1);
    const entries: ArenaEntry[] = roster.map(s => ({ id: s.id, name: s.name, avatar: s.avatar, points: aiPointsAt(s, progress) }));
    entries.push({ ...you, isYou: true });
    entries.sort((a, b) => b.points - a.points || (a.isYou ? -1 : b.isYou ? 1 : 0));
    return entries;
}

// Final board at season end (progress = 1) — used for results/processing.
export function getFinalBoard(state: ArenaState, you: ArenaEntry): ArenaEntry[] {
    return getArenaBoard(state, you, state.seasonStart + SEASON_ACTIVE_MS);
}

export function positionOf(board: ArenaEntry[]): number {
    const idx = board.findIndex(e => e.isYou);
    return idx < 0 ? board.length : idx + 1;
}

// Phase of a season from elapsed time.
export type SeasonPhase = 'active' | 'processing';
export function seasonPhase(state: ArenaState, nowMs: number): SeasonPhase {
    const elapsed = nowMs - state.seasonStart;
    return elapsed < SEASON_ACTIVE_MS ? 'active' : 'processing';
}

// ms remaining in the current phase (active countdown, or time until next season).
export function phaseTimeRemaining(state: ArenaState, nowMs: number): number {
    const elapsed = nowMs - state.seasonStart;
    if (elapsed < SEASON_ACTIVE_MS) return Math.max(0, SEASON_ACTIVE_MS - elapsed);
    return Math.max(0, SEASON_TOTAL_MS - elapsed);
}

export function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Fresh state for a brand-new player.
export function initialArenaState(nowMs: number): ArenaState {
    return { tierIndex: 0, seasonId: 1, seasonStart: nowMs, points: 0, refMult: 1, lastResult: null };
}
