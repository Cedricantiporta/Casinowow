import React, { useState, useEffect, useRef } from 'react';
import { GAMES_CONFIG, formatK } from '../constants';
import { GameConfig } from '../types';
import { jackpotService } from '../services/jackpotService';

interface HighLimitLobbyProps {
    onBack: () => void;
    onSelectGame: (game: GameConfig, isHighLimit: boolean) => void;
    playerLevel: number;
    currentBet?: number;
}

const getIcon = (theme: string) => {
    if (theme === 'NEON')       return '🎰';
    if (theme === 'EGYPT')      return '🦂';
    if (theme === 'DRAGON')     return '🐉';
    if (theme === 'PIRATE')     return '🏴‍☠️';
    if (theme === 'SPACE')      return '👽';
    if (theme === 'PIGGY')      return '🐷';
    if (theme === 'JUNGLE')     return '🦍';
    if (theme === 'UNDERWATER') return '🦈';
    if (theme === 'WESTERN')    return '🤠';
    if (theme === 'SAMURAI')    return '⚔️';
    if (theme === 'CANDY')      return '🧁';
    if (theme === 'GOLDEN_POT') return '🏮';
    if (theme === 'LEPRECHAUN') return '🍀';
    if (theme === 'ARCTIC')     return '🐧';
    return '🍭';
};

const getFontClass = (theme: string) => {
    switch (theme) {
        case 'NEON':       return 'font-neon';
        case 'EGYPT':      return 'font-egypt';
        case 'DRAGON':     return 'font-dragon';
        case 'PIRATE':     return 'font-pirate';
        case 'SPACE':      return 'font-space';
        case 'CANDY':      return 'font-candy';
        case 'JUNGLE':     return 'font-jungle';
        case 'UNDERWATER': return 'font-underwater';
        case 'WESTERN':    return 'font-western';
        case 'SAMURAI':    return 'font-samurai';
        case 'PIGGY':      return 'font-piggy';
        case 'GOLDEN_POT': return 'font-dragon';
        case 'LEPRECHAUN': return 'font-jungle';
        case 'ARCTIC':     return 'font-space';
        default:           return 'font-titan';
    }
};

const getTitleStyle = (theme: string) => {
    if (theme === 'NEON')   return 'text-fuchsia-300 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]';
    if (theme === 'EGYPT')  return 'text-amber-400 drop-shadow-[0_2px_0_rgba(0,0,0,1)]';
    if (theme === 'DRAGON') return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]';
    if (theme === 'PIRATE') return 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]';
    if (theme === 'SPACE')  return 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]';
    if (theme === 'PIGGY')      return 'text-pink-300 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]';
    if (theme === 'GOLDEN_POT') return 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]';
    if (theme === 'LEPRECHAUN') return 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]';
    if (theme === 'ARCTIC')     return 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]';
    return 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]';
};

export const HighLimitLobby: React.FC<HighLimitLobbyProps> = ({ onBack, onSelectGame, playerLevel, currentBet = 10000 }) => {
    const [jackpotTotals, setJackpotTotals] = useState<number[]>(() =>
        GAMES_CONFIG.map((_, idx) => jackpotService.getSlotTotal(idx) * 10)
    );
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const [canScroll, setCanScroll] = useState(false);

    useEffect(() => {
        const update = () => setJackpotTotals(GAMES_CONFIG.map((_, idx) => jackpotService.getSlotTotal(idx) * 10));
        update();
        return jackpotService.subscribe(update);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 4);
        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const startScroll = (direction: 'LEFT' | 'RIGHT') => {
        if (scrollInterval.current) return;
        const amount = direction === 'LEFT' ? -20 : 20;
        const scrollAction = () => scrollRef.current?.scrollBy({ left: amount, behavior: 'auto' });
        scrollAction();
        scrollInterval.current = setInterval(scrollAction, 16);
    };

    const stopScroll = () => {
        if (scrollInterval.current) { clearInterval(scrollInterval.current); scrollInterval.current = null; }
    };

    const getUnlockLevel = (index: number) => index * 5;

    return (
        <div className="absolute inset-0 z-[60] flex flex-col select-none"
            style={{ backgroundImage: 'url(/lobby-bg-vip.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />

            {/* Topbar */}
            <div className="relative z-10 shrink-0 flex items-center gap-3 px-4 py-3"
                style={{ background: 'linear-gradient(180deg,rgba(120,53,15,0.95),rgba(92,40,10,0.95))', boxShadow: '0 4px 16px rgba(0,0,0,0.7)' }}>
                <div className="round-btn cursor-pointer shrink-0" onClick={onBack}><i className="ti ti-arrow-left"></i></div>
                <span className="font-black text-xl tracking-widest flex-1"
                    style={{ background: 'linear-gradient(180deg,#fff8c0,#ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}>
                    High Limit Room
                </span>
                <div className="px-3 py-1 rounded-full font-black text-[9px] tracking-widest"
                    style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00' }}>
                    VIP
                </div>
            </div>

            {/* Slot grid — same horizontal 2-row layout as normal lobby */}
            <div className="relative z-10 flex-1 flex items-center justify-center p-0.5 pt-2 pb-8">
                <>
                    <div
                        ref={scrollRef}
                        className="grid gap-x-4 gap-y-3 auto-cols-max pt-1 px-3 overflow-x-auto no-scrollbar snap-x items-start"
                        style={{ gridTemplateRows: 'repeat(2, auto)', gridAutoFlow: 'column' }}
                    >
                        {GAMES_CONFIG.map((game, idx) => {
                            const icon = getIcon(game.theme);
                            const fontClass = getFontClass(game.theme);
                            const titleStyle = getTitleStyle(game.theme);
                            const unlockLevel = getUnlockLevel(idx);
                            const isLocked = playerLevel < unlockLevel;

                            return (
                                <button
                                    key={game.id}
                                    onClick={() => onSelectGame(game, true)}
                                    className={`row-span-1 relative group w-[85px] h-[85px] md:w-[105px] md:h-[105px] rounded-xl overflow-visible snap-center ${isLocked ? 'cursor-not-allowed grayscale' : ''}`}
                                    style={{ boxShadow: 'inset 0 2px 0 rgba(251,191,36,0.85), 0 0 12px rgba(217,119,6,0.3), 0 6px 18px rgba(0,0,0,0.6)' }}
                                >
                                    {/* Gold jackpot pill — protrudes above card */}
                                    {!isLocked && (
                                        <div className="absolute -top-[22px] left-0 right-0 z-30 pointer-events-none flex items-center justify-center">
                                            <span style={{ fontSize: '11px', fontWeight: 900, color: '#fde68a', whiteSpace: 'nowrap', lineHeight: 1, background: 'rgba(20,10,0,0.92)', border: '2px solid #d97706', borderRadius: '999px', padding: '3px 8px', boxShadow: '0 0 8px rgba(217,119,6,0.7)' }}>
                                                {formatK(jackpotTotals[idx] ?? 0)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Card bg */}
                                    <div className={`absolute inset-0 rounded-xl overflow-hidden bg-gradient-to-br ${game.color} transition-opacity`} />

                                    {/* Gold shimmer overlay */}
                                    <div className="absolute inset-0 rounded-xl overflow-hidden bg-gradient-to-tr from-transparent via-yellow-400/8 to-yellow-300/5 pointer-events-none" />

                                    {/* Icon + name */}
                                    <div className="absolute inset-0 rounded-xl overflow-hidden z-10 select-none">
                                        <div className="absolute inset-0 flex items-start justify-center pt-2">
                                            <span className="text-[4rem] md:text-[4.5rem] drop-shadow-2xl filter leading-none">{icon}</span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 pb-1 px-1 text-center">
                                            <h3 className={`text-[13px] md:text-[16px] font-black uppercase tracking-wide leading-tight line-clamp-2 ${fontClass} ${titleStyle}`}
                                                style={{ WebkitTextStroke: '1.5px rgba(0,0,0,0.95)', paintOrder: 'stroke fill' }}>
                                                {game.name}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Lock overlay */}
                                    {isLocked && (
                                        <div className="absolute inset-0 rounded-xl overflow-hidden bg-black/55 z-20 flex flex-col items-center justify-center">
                                            <img src="/ui/lock.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain', filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.8))' }} />
                                            <span className="text-white/70 font-bold text-[9px] mt-1 uppercase">Lvl {unlockLevel}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 rounded-xl overflow-hidden bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10" />
                                </button>
                            );
                        })}
                        <div className="w-8" />
                    </div>

                    {/* Scroll arrows */}
                    {canScroll && (
                        <button
                            onMouseDown={() => startScroll('LEFT')} onMouseUp={stopScroll} onMouseLeave={stopScroll}
                            onTouchStart={() => startScroll('LEFT')} onTouchEnd={stopScroll}
                            className="absolute left-0 z-30 w-6 h-9 flex items-center justify-center text-white text-[10px] font-black active:translate-y-[2px] transition-transform select-none"
                            style={{ background: 'linear-gradient(180deg,#c9901a,#7a5000)', border: '1.5px solid #8b6200', borderRadius: '8px', boxShadow: '0 3px 0 #5a3000,0 4px 8px rgba(0,0,0,0.6)' }}
                        >◀</button>
                    )}
                    {canScroll && (
                        <button
                            onMouseDown={() => startScroll('RIGHT')} onMouseUp={stopScroll} onMouseLeave={stopScroll}
                            onTouchStart={() => startScroll('RIGHT')} onTouchEnd={stopScroll}
                            className="absolute right-0 z-30 w-6 h-9 flex items-center justify-center text-white text-[10px] font-black active:translate-y-[2px] transition-transform select-none"
                            style={{ background: 'linear-gradient(180deg,#c9901a,#7a5000)', border: '1.5px solid #8b6200', borderRadius: '8px', boxShadow: '0 3px 0 #5a3000,0 4px 8px rgba(0,0,0,0.6)' }}
                        >▶</button>
                    )}
                </>
            </div>
        </div>
    );
};
