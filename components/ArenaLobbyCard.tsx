import React, { useState, useEffect } from 'react';
import { formatK } from '../constants';
import { ArenaState } from '../types';
import {
    getArenaBoard, positionOf, rankInfo, phaseTimeRemaining, seasonPhase, formatCountdown,
    outcomeFor, arenaRewardPool, ArenaEntry,
} from '../services/arenaService';
import { ArenaBadge } from './ArenaModal';

interface Props {
    arena: ArenaState;
    playerName: string;
    playerAvatar: string;
    maxBet: number;
    onOpen: () => void;
}

const OUTCOME_META: Record<string, { label: string; color: string; icon: string }> = {
    promoted: { label: 'Promotion', color: '#4ade80', icon: 'ti-arrow-up' },
    held:     { label: 'Holding',   color: '#cbd5e1', icon: 'ti-minus' },
    demoted:  { label: 'Demotion',  color: '#fb7185', icon: 'ti-arrow-down' },
};

// Lobby entry card for the Arena — same 116px sizing as the Mission Pass / VIP
// promo cards, with a solid (non-transparent) background. Shows live rank,
// points, your promotion/hold/demotion status, the season's reward pool and a
// countdown.
export const ArenaLobbyCard: React.FC<Props> = ({ arena, playerName, playerAvatar, maxBet, onOpen }) => {
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
    const outcome = OUTCOME_META[outcomeFor(arena.tierIndex, pos)];
    const pool = arenaRewardPool(maxBet, arena.tierIndex);
    const joined = arena.points > 0; // must spin to join the season

    return (
        <button
            onClick={onOpen}
            className="row-span-2 relative overflow-hidden snap-center active:scale-95 transition-transform shrink-0 flex flex-col items-center"
            style={{
                width: 116, alignSelf: 'stretch', borderRadius: 16, boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
                backgroundImage: `url(/arenalobby_cardbg.png)`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                padding: '9px 7px',
            }}>
            <span className="relative font-tanker text-white text-sm leading-none" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)' }}>Arena</span>

            <div className="relative my-1">
                <ArenaBadge tierIndex={arena.tierIndex} size={46} />
            </div>

            <span className="relative font-black text-white leading-tight text-center" style={{ fontSize: 11, textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)' }}>{info.label}</span>

            {/* points + position */}
            <div className="relative flex items-center gap-1 mt-0.5">
                <i className="ti ti-bolt" style={{ color: info.color, fontSize: 10, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }} />
                <span className="font-black text-white" style={{ fontSize: 10, textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)' }}>{formatK(arena.points)}</span>
                {joined && <span className="text-white/80 font-bold" style={{ fontSize: 9, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>#{pos}</span>}
            </div>

            {/* promotion / hold / demotion status — or spin-to-join prompt */}
            {joined ? (
                <div className="relative flex items-center gap-0.5 rounded-full px-1.5 py-0.5 mt-1"
                    style={{ background: `${outcome.color}26`, boxShadow: `inset 0 0 0 1px ${outcome.color}66` }}>
                    <i className={`ti ${outcome.icon}`} style={{ fontSize: 9, color: outcome.color }} />
                    <span className="font-black leading-none" style={{ fontSize: 8.5, color: outcome.color }}>{outcome.label}</span>
                </div>
            ) : (
                <div className="relative flex items-center gap-0.5 rounded-full px-1.5 py-0.5 mt-1" style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <i className="ti ti-refresh text-white/80" style={{ fontSize: 9 }} />
                    <span className="font-black leading-none text-white/80" style={{ fontSize: 8.5 }}>Spin to join</span>
                </div>
            )}

            {/* reward pool */}
            <div className="relative flex flex-col items-center mt-1">
                <span className="text-white/80 font-bold leading-none" style={{ fontSize: 7.5, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>Reward Pool</span>
                <div className="flex items-center gap-0.5">
                    <img src="/new_coinicon.png" alt="" style={{ width: 12, height: 12, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }} />
                    <span className="font-black text-amber-300 leading-none" style={{ fontSize: 10, textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)' }}>{formatK(pool, 9)}</span>
                </div>
            </div>

            {/* countdown chip */}
            <div className="relative mt-auto flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ background: 'rgba(0,0,0,0.45)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}>
                <i className="ti ti-clock text-white/70" style={{ fontSize: 10 }} />
                <span className="font-black text-white" style={{ fontSize: 10 }}>{formatCountdown(remaining)}</span>
            </div>
            <span className="relative text-white/70" style={{ fontSize: 7.5, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{phase === 'active' ? 'Season ends' : 'Next season'}</span>
        </button>
    );
};
