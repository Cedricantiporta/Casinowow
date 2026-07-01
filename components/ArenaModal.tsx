import React, { useState, useEffect, useRef } from 'react';
import { formatK } from '../constants';
import { ArenaState } from '../types';
import {
    getArenaBoard, positionOf, rankInfo, phaseTimeRemaining, seasonPhase,
    formatCountdown, arenaReward, arenaRewardPool, outcomeFor, ArenaEntry, RANK_NAMES, MAX_TIER,
} from '../services/arenaService';

interface ArenaModalProps {
    isOpen: boolean;
    onClose: () => void;
    arena: ArenaState;
    playerName: string;
    playerAvatar: string;
    maxBet: number;
}

export const ArenaModal: React.FC<ArenaModalProps> = ({ isOpen, onClose, arena, playerName, playerAvatar, maxBet }) => {
    const [now, setNow] = useState(() => Date.now());
    const listRef = useRef<HTMLDivElement>(null);
    const youRowRef = useRef<HTMLDivElement>(null);

    // Live tick every second while open.
    useEffect(() => {
        if (!isOpen) return;
        setNow(Date.now());
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, [isOpen]);

    // Auto-scroll to the player's row on open.
    useEffect(() => {
        if (!isOpen) return;
        const id = requestAnimationFrame(() => {
            youRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
        return () => cancelAnimationFrame(id);
    }, [isOpen]);

    if (!isOpen) return null;

    const you: ArenaEntry = { id: 'you', name: playerName || 'You', avatar: playerAvatar, points: arena.points };
    const board = getArenaBoard(arena, you, now);
    const myPos = positionOf(board);
    const info = rankInfo(arena.tierIndex);
    const phase = seasonPhase(arena, now);
    const remaining = phaseTimeRemaining(arena, now);
    const joined = arena.points > 0; // must spin to join the season

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none"
            onClick={onClose}>
            <div className="w-full max-w-sm rounded-3xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{
                    maxHeight: '94%',
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}>

                {/* Header */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 relative">
                    <span className="absolute left-0 right-0 text-center text-white font-tanker text-base drop-shadow pointer-events-none">Arena</span>
                    <button className="round-btn cursor-pointer shrink-0 ml-auto z-10" onClick={onClose}><i className="ti ti-x" /></button>
                </div>

                {/* Player rank summary card */}
                <div className="shrink-0 px-3 pb-2">
                    <div className="tcard p-3" style={{ background: `linear-gradient(160deg, ${info.color}33, rgba(10,0,50,0.78))` }}>
                        <div className="flex items-center gap-3">
                            <ArenaBadge tierIndex={info.tierIndex} size={48} />
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-white text-sm leading-tight">{info.label}</div>
                                <div className="text-white/60 text-[10px]">
                                    {phase === 'active' ? 'Season ends in' : 'Next season in'} <span className="font-black text-white">{formatCountdown(remaining)}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1">
                                    <i className="ti ti-bolt" style={{ color: info.color, fontSize: 13 }} />
                                    <span className="font-black text-white text-sm">{formatK(arena.points)}</span>
                                </div>
                                <div className="text-white/60 text-[10px]">{joined ? `Rank #${myPos}` : 'Not joined'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reward pool + zone legend */}
                <div className="shrink-0 flex items-center justify-between gap-2 px-4 pb-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-black text-green-300"><i className="ti ti-arrow-up" />Top 1–10</span>
                    <div className="flex items-center gap-1">
                        <span className="text-white/50 font-bold" style={{ fontSize: 9 }}>Pool</span>
                        <img src="/new_coinicon.png" alt="" style={{ width: 13, height: 13, objectFit: 'contain' }} />
                        <span className="font-black text-amber-300" style={{ fontSize: 11 }}>{formatK(arenaRewardPool(maxBet, arena.tierIndex), 9)}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-black text-rose-300">51+<i className="ti ti-arrow-down" /></span>
                </div>

                {/* Leaderboard — blank while processing or before joining */}
                <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 flex flex-col gap-1 min-h-0">
                    {phase === 'processing' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-10">
                            <i className="ti ti-hourglass-high text-white/40" style={{ fontSize: 34 }} />
                            <div className="font-black text-white/80 text-sm">Season ended</div>
                            <div className="text-white/50" style={{ fontSize: 11 }}>Next arena begins in <span className="font-black text-white">{formatCountdown(remaining)}</span></div>
                        </div>
                    ) : !joined ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-10">
                            <i className="ti ti-refresh text-white/50" style={{ fontSize: 34 }} />
                            <div className="font-black text-white/80 text-sm">Spin to join</div>
                            <div className="text-white/50" style={{ fontSize: 11 }}>Spin any slot to enter this season's Arena — no demotion until you play.</div>
                        </div>
                    ) : board.map((e, i) => {
                        const pos = i + 1;
                        const inPromo = pos <= 10;
                        const inDemo = pos >= 51;
                        const reward = arenaReward(pos, maxBet, arena.tierIndex);
                        return (
                            <div
                                key={e.id}
                                ref={e.isYou ? youRowRef : undefined}
                                className="flex items-center gap-2 rounded-2xl px-2 py-1.5"
                                style={{
                                    background: e.isYou ? 'linear-gradient(90deg,rgba(168,85,247,0.55),rgba(124,58,237,0.35))' : 'rgba(0,0,0,0.22)',
                                    boxShadow: e.isYou ? 'inset 0 1px 0 rgba(220,170,255,0.5), 0 0 0 1.5px rgba(216,180,254,0.7)' : 'inset 0 1px 0 rgba(255,255,255,0.06)',
                                }}>
                                {/* Position */}
                                <div className="w-7 flex items-center justify-center shrink-0">
                                    {pos <= 3 ? (
                                        <i className="ti ti-trophy" style={{ fontSize: 16, color: pos === 1 ? '#fbbf24' : pos === 2 ? '#d1d5db' : '#d97706' }} />
                                    ) : (
                                        <span className="font-black text-white/70" style={{ fontSize: 12 }}>{pos}</span>
                                    )}
                                </div>
                                {/* Avatar */}
                                <img src={e.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 30, height: 30, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.25)' }} />
                                {/* Name + zone tag */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-white truncate" style={{ fontSize: 12 }}>{e.name}{e.isYou ? ' (You)' : ''}</div>
                                    {(inPromo || inDemo) && (
                                        <div className={`font-black ${inPromo ? 'text-green-300' : 'text-rose-300'}`} style={{ fontSize: 8 }}>
                                            {inPromo ? (reward > 0 ? `+${formatK(reward)} reward` : 'Promotion') : 'Demotion'}
                                        </div>
                                    )}
                                </div>
                                {/* Points */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <i className="ti ti-bolt text-fuchsia-300" style={{ fontSize: 11 }} />
                                    <span className="font-black text-white" style={{ fontSize: 12 }}>{formatK(e.points)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// Top-3 row tints for the live mini-leaderboard.
const ROW_TINT: Record<number, string> = {
    1: 'rgba(251,191,36,0.34)',  // gold
    2: 'rgba(203,213,225,0.30)', // silver
    3: 'rgba(217,119,6,0.32)',   // bronze
};

// In-game side widget — a tall live mini-leaderboard mirroring the left sidebar's
// length. Shows a window of players around the player, highlights the player's
// row, colour-codes the top 3, and updates live as positions shift while spinning.
const SIDE_OUTCOME: Record<string, { label: string; color: string; icon: string }> = {
    promoted: { label: 'Promotion', color: '#4ade80', icon: 'ti-arrow-up' },
    held:     { label: 'Holding',   color: '#cbd5e1', icon: 'ti-minus' },
    demoted:  { label: 'Demotion',  color: '#fb7185', icon: 'ti-arrow-down' },
};

export const ArenaSideWidget: React.FC<{
    arena: ArenaState; playerName: string; playerAvatar: string; maxBet: number; onOpen: () => void;
}> = ({ arena, playerName, playerAvatar, maxBet, onOpen }) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const info = rankInfo(arena.tierIndex);
    const processing = seasonPhase(arena, now) === 'processing';
    const you: ArenaEntry = { id: 'you', name: playerName, avatar: playerAvatar, points: arena.points };
    const board = getArenaBoard(arena, you, now);
    const myIdx = board.findIndex(e => e.isYou);
    const remaining = phaseTimeRemaining(arena, now);
    const pool = arenaRewardPool(maxBet, arena.tierIndex);
    const outcome = SIDE_OUTCOME[outcomeFor(arena.tierIndex, myIdx + 1)];
    const joined = arena.points > 0; // must spin to join the season

    // 6-row window centred on the player, clamped so the top is visible when near it.
    const WINDOW = 6;
    let start = Math.max(0, myIdx - 2);
    start = Math.min(start, Math.max(0, board.length - WINDOW));
    const rows = (processing || !joined) ? [] : board.slice(start, start + WINDOW);

    return (
        <button onClick={onOpen}
            className="flex flex-col items-stretch active:scale-[0.98] transition-transform select-none"
            style={{
                width: 92, padding: 5, borderRadius: 16, gap: 4,
                background: 'linear-gradient(180deg,rgba(124,63,181,0.94),rgba(58,18,104,0.94))',
                boxShadow: '0 4px 14px rgba(0,0,0,0.5),inset 0 1px 1px rgba(255,255,255,0.18)',
            }}>
            {/* Header — rank + points + countdown */}
            <div className="flex items-center gap-1.5 px-0.5">
                <ArenaBadge tierIndex={arena.tierIndex} size={26} />
                <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="font-black text-white leading-none truncate" style={{ fontSize: 8.5 }}>{info.label}</span>
                    <div className="flex items-center gap-0.5">
                        <i className="ti ti-bolt" style={{ color: info.color, fontSize: 8 }} />
                        <span className="font-black text-white leading-none" style={{ fontSize: 8.5 }}>{formatK(arena.points)}</span>
                    </div>
                </div>
            </div>

            {/* Prize pool — prominent, on top of the list */}
            <div className="flex items-center justify-center gap-1 rounded-lg py-0.5" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <img src="/new_coinicon.png" alt="" style={{ width: 15, height: 15, objectFit: 'contain' }} />
                <span className="font-black text-amber-300 leading-none" style={{ fontSize: 12 }}>{formatK(pool, 9)}</span>
            </div>

            {/* Live windowed leaderboard — blank while processing or before joining */}
            <div className="flex flex-col justify-center" style={{ gap: 2, minHeight: 116 }}>
                {processing ? (
                    <div className="flex flex-col items-center gap-1 text-center px-1 m-auto">
                        <i className="ti ti-hourglass-high text-white/40" style={{ fontSize: 20 }} />
                        <span className="text-white/55 font-bold leading-tight" style={{ fontSize: 8 }}>Season ended</span>
                    </div>
                ) : !joined ? (
                    <div className="flex flex-col items-center gap-1 text-center px-1 m-auto">
                        <i className="ti ti-refresh text-white/50" style={{ fontSize: 20 }} />
                        <span className="text-white/70 font-black leading-tight" style={{ fontSize: 8.5 }}>Spin to join</span>
                    </div>
                ) : null}
                {rows.map((e) => {
                    const pos = board.indexOf(e) + 1;
                    const tint = ROW_TINT[pos];
                    return (
                        <div key={e.id}
                            className="flex items-center gap-1 rounded-md px-1"
                            style={{
                                height: 18,
                                background: e.isYou ? 'linear-gradient(90deg,rgba(216,180,254,0.55),rgba(168,85,247,0.35))' : tint || 'rgba(0,0,0,0.22)',
                                boxShadow: e.isYou ? 'inset 0 0 0 1.2px rgba(245,225,255,0.85)' : undefined,
                            }}>
                            <span className="font-black text-white/90 text-center" style={{ fontSize: 8, width: 13, textShadow: '0 1px 1px rgba(0,0,0,0.7)' }}>{pos}</span>
                            <img src={e.avatar} alt="" className="rounded-full object-cover shrink-0" style={{ width: 13, height: 13 }} />
                            <span className="font-black text-white leading-none ml-auto" style={{ fontSize: 8, textShadow: '0 1px 1px rgba(0,0,0,0.7)' }}>{formatK(e.points)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Promotion / hold / demotion status — only once joined */}
            {!processing && joined && (
                <div className="flex items-center justify-center gap-0.5 rounded-full py-0.5"
                    style={{ background: `${outcome.color}26`, boxShadow: `inset 0 0 0 1px ${outcome.color}66` }}>
                    <i className={`ti ${outcome.icon}`} style={{ fontSize: 8, color: outcome.color }} />
                    <span className="font-black leading-none" style={{ fontSize: 8, color: outcome.color }}>{outcome.label}</span>
                </div>
            )}

            {/* Countdown footer */}
            <div className="flex items-center justify-center gap-0.5 rounded-full py-0.5" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <i className="ti ti-clock text-white/70" style={{ fontSize: 8 }} />
                <span className="font-black text-white leading-none" style={{ fontSize: 8 }}>{formatCountdown(remaining)}</span>
            </div>
        </button>
    );
};

// Rank badge: a coloured shield-ish chip with the rank initial and division.
export const ArenaBadge: React.FC<{ tierIndex: number; size?: number }> = ({ tierIndex, size = 40 }) => {
    const info = rankInfo(tierIndex);
    const initials = info.rankName.split(' ').map(w => w[0]).join('');
    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <div className="absolute inset-0 rounded-2xl" style={{
                background: `linear-gradient(160deg, ${info.color}, ${info.color}66 60%, rgba(0,0,0,0.4))`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 0 ${size / 4}px ${info.color}66`,
            }} />
            <span className="relative font-tanker text-white leading-none" style={{ fontSize: size * 0.34, textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>{initials}</span>
            <span className="absolute font-black text-white leading-none" style={{ bottom: 1, right: 3, fontSize: size * 0.2, textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>{info.division}</span>
        </div>
    );
};
