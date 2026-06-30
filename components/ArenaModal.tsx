import React, { useState, useEffect, useRef } from 'react';
import { formatK } from '../constants';
import { ArenaState } from '../types';
import {
    getArenaBoard, positionOf, rankInfo, phaseTimeRemaining, seasonPhase,
    formatCountdown, arenaReward, ArenaEntry, RANK_NAMES, MAX_TIER,
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
                                <div className="text-white/60 text-[10px]">Rank #{myPos}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Zone legend */}
                <div className="shrink-0 flex items-center justify-center gap-4 px-3 pb-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-black text-green-300"><i className="ti ti-arrow-up" />Promotion 1–10</span>
                    <span className="flex items-center gap-1 text-[10px] font-black text-rose-300"><i className="ti ti-arrow-down" />Demotion 51+</span>
                </div>

                {/* Leaderboard */}
                <div ref={listRef} className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 flex flex-col gap-1 min-h-0">
                    {board.map((e, i) => {
                        const pos = i + 1;
                        const inPromo = pos <= 10;
                        const inDemo = pos >= 51;
                        const reward = arenaReward(pos, maxBet);
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

// Compact in-game side widget — mirrors the left sidebar container style and
// updates live while the player spins (points, position, season countdown).
export const ArenaSideWidget: React.FC<{
    arena: ArenaState; playerName: string; playerAvatar: string; onOpen: () => void;
}> = ({ arena, playerName, playerAvatar, onOpen }) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const info = rankInfo(arena.tierIndex);
    const you: ArenaEntry = { id: 'you', name: playerName, avatar: playerAvatar, points: arena.points };
    const board = getArenaBoard(arena, you, now);
    const pos = positionOf(board);
    const remaining = phaseTimeRemaining(arena, now);
    return (
        <button onClick={onOpen}
            className="flex flex-col items-center gap-0.5 active:scale-95 transition-transform select-none"
            style={{
                width: 58, padding: '6px 4px 5px', borderRadius: 16,
                background: 'linear-gradient(180deg,rgba(124,63,181,0.92),rgba(74,24,128,0.92))',
                boxShadow: '0 4px 14px rgba(0,0,0,0.5),inset 0 1px 1px rgba(255,255,255,0.18)',
            }}>
            <ArenaBadge tierIndex={arena.tierIndex} size={38} />
            <span className="font-black text-white leading-none mt-0.5" style={{ fontSize: 9 }}>{info.label}</span>
            <div className="flex items-center gap-0.5">
                <i className="ti ti-bolt" style={{ color: info.color, fontSize: 9 }} />
                <span className="font-black text-white leading-none" style={{ fontSize: 9 }}>{formatK(arena.points)}</span>
            </div>
            <span className="text-white/60 font-bold leading-none" style={{ fontSize: 8 }}>#{pos}</span>
            <div className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 mt-0.5" style={{ background: 'rgba(0,0,0,0.4)' }}>
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
