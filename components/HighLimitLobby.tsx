import React, { useState, useEffect } from 'react';
import { GAMES_CONFIG, formatCommaNumber } from '../constants';
import { GameConfig } from '../types';
import { jackpotService } from '../services/jackpotService';

const VIP_SLOT_IDS = ['neon-vegas', 'dragon-fortune', 'cosmic-cash', 'samurai-honor'];

const ICON_MAP: Record<string, string> = {
    NEON: '🎰', DRAGON: '🐉', SPACE: '👽', SAMURAI: '👹',
    PIRATE: '🏴‍☠️', EGYPT: '🦂', PIGGY: '🐷', JUNGLE: '🌴',
    UNDERWATER: '🔱', WESTERN: '🤠', CANDY: '🍭',
};

const FONT_MAP: Record<string, string> = {
    NEON: 'font-titan', DRAGON: 'font-titan', SPACE: 'font-titan', SAMURAI: 'font-titan',
    CANDY: 'font-luckiest', PIRATE: 'font-luckiest', JUNGLE: 'font-luckiest', WESTERN: 'font-luckiest', PIGGY: 'font-luckiest',
};

interface HighLimitLobbyProps {
    onBack: () => void;
    onSelectGame: (game: GameConfig, isHighLimit: boolean) => void;
    playerLevel: number;
}

export const HighLimitLobby: React.FC<HighLimitLobbyProps> = ({ onBack, onSelectGame, playerLevel }) => {
    const vipGames = GAMES_CONFIG.filter(g => VIP_SLOT_IDS.includes(g.id));
    const [jackpotTotals, setJackpotTotals] = useState(() =>
        GAMES_CONFIG.map((_, idx) => jackpotService.getSlotTotal(idx))
    );

    useEffect(() => {
        return jackpotService.subscribe(() => {
            setJackpotTotals(GAMES_CONFIG.map((_, idx) => jackpotService.getSlotTotal(idx)));
        });
    }, []);

    return (
        <div className="fixed inset-0 z-[60] flex flex-col select-none"
            style={{ backgroundImage: 'url(/lobby-bg-vip.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>

            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            {/* Topbar */}
            <div className="relative z-10 shrink-0 flex items-center gap-3 px-4 py-3"
                style={{ background: 'linear-gradient(180deg,rgba(120,53,15,0.95),rgba(92,40,10,0.95))', borderBottom: '1.5px solid rgba(251,191,36,0.5)', boxShadow: '0 4px 16px rgba(0,0,0,0.7)' }}>
                <div className="round-btn cursor-pointer shrink-0" onClick={onBack}><i className="ti ti-arrow-left"></i></div>
                <span className="font-black text-xl uppercase tracking-widest flex-1"
                    style={{ background: 'linear-gradient(180deg,#fff8c0,#ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}>
                    🎰 High Limit Room
                </span>
                <div className="px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-widest"
                    style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00' }}>
                    VIP
                </div>
            </div>

            {/* 2×2 slot grid */}
            <div className="relative z-10 flex-1 grid grid-cols-2 gap-3 p-4">
                {vipGames.map(game => {
                    const globalIdx = GAMES_CONFIG.findIndex(g => g.id === game.id);
                    const icon = ICON_MAP[game.theme] ?? '🎰';
                    const fontClass = FONT_MAP[game.theme] ?? 'font-titan';
                    const titleColor = game.theme === 'NEON' ? 'text-fuchsia-300' :
                        game.theme === 'DRAGON' ? 'text-red-400' :
                        game.theme === 'SPACE' ? 'text-indigo-300' :
                        'text-amber-300';

                    return (
                        <button
                            key={game.id}
                            onClick={() => onSelectGame(game, true)}
                            className="relative rounded-2xl overflow-hidden active:scale-95 transition-transform"
                            style={{
                                border: '1.5px solid rgba(251,191,36,0.5)',
                                boxShadow: '0 6px 24px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.15)',
                            }}
                        >
                            {/* Gradient bg */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${game.color}`} />
                            {/* Gold shimmer */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-400/10 to-yellow-300/5 pointer-events-none" />
                            {/* Bottom dark gradient for text */}
                            <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

                            {/* Jackpot */}
                            <div className="absolute top-2 left-0 right-0 flex justify-center z-20">
                                <span style={{ fontSize: '12px', fontWeight: 900, background: 'linear-gradient(180deg,#fff8a0,#ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}>
                                    {formatCommaNumber(jackpotTotals[globalIdx] ?? 0)}
                                </span>
                            </div>

                            {/* VIP badge */}
                            <div className="absolute top-2 right-2 z-20">
                                <span style={{ fontSize: '9px', background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00', padding: '2px 5px', borderRadius: '6px', fontWeight: 900, letterSpacing: '0.05em' }}>VIP</span>
                            </div>

                            {/* Icon */}
                            <div className="relative z-10 flex items-center justify-center h-full py-4">
                                <span className="text-[4.5rem] leading-none drop-shadow-2xl">{icon}</span>
                            </div>

                            {/* Name */}
                            <div className="absolute bottom-0 left-0 right-0 pb-2 px-2 text-center z-10">
                                <h3 className={`font-black uppercase tracking-wide leading-none text-[14px] ${fontClass} ${titleColor}`}
                                    style={{ WebkitTextStroke: '1px rgba(0,0,0,0.9)', paintOrder: 'stroke fill' }}>
                                    {game.name}
                                </h3>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
