import React, { useState, useEffect } from 'react';
import { formatK } from '../constants';
import { ArenaState } from '../types';
import {
    getArenaBoard, positionOf, rankInfo, phaseTimeRemaining, seasonPhase, formatCountdown, ArenaEntry,
} from '../services/arenaService';
import { ArenaBadge } from './ArenaModal';

interface Props {
    arena: ArenaState;
    playerName: string;
    playerAvatar: string;
    onOpen: () => void;
}

// Lobby entry card for the Arena — same 116px sizing as the Mission Pass / VIP
// promo cards, but renders live rank, points, position and a season countdown.
export const ArenaLobbyCard: React.FC<Props> = ({ arena, playerName, playerAvatar, onOpen }) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const info = rankInfo(arena.tierIndex);
    const you: ArenaEntry = { id: 'you', name: playerName, avatar: playerAvatar, points: arena.points };
    const board = getArenaBoard(arena, you, now);
    const pos = positionOf(board);
    const phase = seasonPhase(arena, now);
    const remaining = phaseTimeRemaining(arena, now);

    return (
        <button
            onClick={onOpen}
            className="row-span-2 relative overflow-hidden snap-center active:scale-95 transition-transform shrink-0 flex flex-col items-center"
            style={{
                width: 116, alignSelf: 'stretch', borderRadius: 16, boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
                background: `linear-gradient(180deg, ${info.color}44 0%, #2a0d52 45%, #1a0838 100%)`,
                padding: '10px 8px',
            }}>
            {/* subtle top glow in the rank colour */}
            <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: 60, background: `radial-gradient(60% 100% at 50% 0%, ${info.color}55, transparent)` }} />

            <span className="relative font-tanker text-white text-sm leading-none mb-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>Arena</span>

            <div className="relative my-1">
                <ArenaBadge tierIndex={arena.tierIndex} size={52} />
            </div>

            <span className="relative font-black text-white leading-tight text-center" style={{ fontSize: 11 }}>{info.label}</span>

            {/* points + position */}
            <div className="relative flex items-center gap-1 mt-1.5">
                <i className="ti ti-bolt" style={{ color: info.color, fontSize: 11 }} />
                <span className="font-black text-white" style={{ fontSize: 11 }}>{formatK(arena.points)}</span>
            </div>
            <span className="relative text-white/60 font-bold" style={{ fontSize: 9 }}>Rank #{pos}</span>

            {/* countdown chip */}
            <div className="relative mt-auto flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ background: 'rgba(0,0,0,0.4)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}>
                <i className="ti ti-clock text-white/70" style={{ fontSize: 10 }} />
                <span className="font-black text-white" style={{ fontSize: 10 }}>{formatCountdown(remaining)}</span>
            </div>
            <span className="relative text-white/50" style={{ fontSize: 8 }}>{phase === 'active' ? 'Season ends' : 'Next season'}</span>
        </button>
    );
};
