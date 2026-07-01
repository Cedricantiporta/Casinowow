// Friends system — data layer.
//
// There is no live multiplayer backend, so "friends" are drawn from the same
// pool the leaderboard already uses (curated whales + AI names, blended with any
// real Supabase rows when configured). Adding a top player or an AI as a friend
// is purely local: it unlocks a daily send/collect coin-gift loop with them.
import { fetchTopPlayers, LeaderboardEntry, LocalPlayer } from './leaderboardService';
import { Friend } from '../types';

export const DAILY_MS = 24 * 60 * 60 * 1000;

// Players you can still add — anyone on the board who isn't you and isn't
// already a friend.
export async function getAddablePlayers(you: LocalPlayer, existingIds: string[]): Promise<LeaderboardEntry[]> {
    const board = await fetchTopPlayers(you, 'score');
    const existing = new Set(existingIds);
    return board.filter(e => !e.isYou && !existing.has(e.id));
}

export function toFriend(e: LeaderboardEntry, now: number): Friend {
    return {
        id: e.id,
        name: e.name,
        avatar: e.avatar,
        level: e.level,
        isAI: true,
        addedAt: now,
    };
}

export function canSend(friend: Friend, now: number): boolean {
    return !friend.lastSentAt || now - friend.lastSentAt >= DAILY_MS;
}
export function canCollect(friend: Friend, now: number): boolean {
    return !friend.lastCollectedAt || now - friend.lastCollectedAt >= DAILY_MS;
}
export function nextResetIn(timestamp: number | undefined, now: number): number {
    if (!timestamp) return 0;
    return Math.max(0, DAILY_MS - (now - timestamp));
}

// Coin gift amounts, scaled by the player's current max bet like other social
// rewards in the game (piggy bank, arena rewards, pass coins).
export const sendGiftAmount = (maxBet: number) => Math.round(maxBet * 1);
export const collectGiftAmount = (maxBet: number) => Math.round(maxBet * 2);
