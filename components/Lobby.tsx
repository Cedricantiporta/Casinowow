

import React, { useState, useEffect, useRef } from 'react';
import { GAMES_CONFIG, formatCommaNumber, formatTime } from '../constants';
import { GameConfig, QuestState, MissionState } from '../types';

interface LobbyProps {
    onSelectGame: (game: GameConfig, isHighLimit: boolean) => void;
    onOpenQuest: () => void;
    onOpenMissions: () => void;
    onOpenBattlePass: () => void;
    onClaimBonus: () => void;
    onOpenCollection: () => void;
    onOpenPiggyBank: () => void;
    onToggleVIP: () => void;
    questState: QuestState;
    missionState: MissionState;
    nextTimeBonus: number; 
    bonusAmount: number;
    isHighLimit: boolean;
    playerLevel: number; 
}

export const Lobby: React.FC<LobbyProps> = ({ 
    onSelectGame, 
    onOpenQuest, 
    onOpenMissions,
    onOpenBattlePass,
    onClaimBonus, 
    onOpenCollection,
    onOpenPiggyBank,
    onToggleVIP,
    questState, 
    missionState, 
    nextTimeBonus,
    bonusAmount,
    isHighLimit,
    playerLevel
}) => {
    
    const [timeLeft, setTimeLeft] = useState(0);
    const [jackpots, setJackpots] = useState<number[]>(() =>
        GAMES_CONFIG.map((_, i) => 80_000 + Math.floor(Math.random() * 400_000) * (i + 1))
    );
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = Math.max(0, nextTimeBonus - now);
            setTimeLeft(diff);
        }, 1000);
        return () => clearInterval(interval);
    }, [nextTimeBonus]);

    useEffect(() => {
        const interval = setInterval(() => {
            setJackpots(prev => prev.map(v =>
                Math.random() < 0.35 ? v + Math.floor(Math.random() * 1200 + 300) : v
            ));
        }, 4500);
        return () => clearInterval(interval);
    }, []);

    const isReadyToCollect = timeLeft === 0;
    const missionsReady = missionState.activeMissions.filter(m => m.completed && !m.claimed).length;
    const passRewardsReady = missionState.passRewards.filter(r => r.level <= missionState.passLevel && !r.claimed).length;
    const totalMissionNotifs = missionsReady + passRewardsReady;
    const questReady = questState.credits >= questState.max;

    const getQuestIcon = () => {
        if (questState.activeGame === 'DICE') return '🎲';
        if (questState.activeGame === 'WILD') return '🗿';
        return '🗺️';
    };

    const getFontClass = (theme: string) => {
         switch(theme) {
             case 'NEON': return 'font-titan';
             case 'CANDY': return 'font-luckiest';
             case 'PIRATE': return 'font-luckiest';
             case 'DRAGON': return 'font-titan';
             case 'SPACE': return 'font-titan';
             case 'JUNGLE': return 'font-luckiest';
             case 'WESTERN': return 'font-luckiest';
             case 'SAMURAI': return 'font-titan';
             case 'PIGGY': return 'font-luckiest';
             default: return 'font-titan';
         }
    };

    const startScroll = (direction: 'LEFT' | 'RIGHT') => {
        if (scrollInterval.current) return;
        const amount = direction === 'LEFT' ? -20 : 20;
        
        const scrollAction = () => {
             if (scrollRef.current) {
                scrollRef.current.scrollBy({ left: amount, behavior: 'auto' });
             }
        };
        
        scrollAction(); 
        scrollInterval.current = setInterval(scrollAction, 16); 
    };

    const stopScroll = () => {
        if (scrollInterval.current) {
            clearInterval(scrollInterval.current);
            scrollInterval.current = null;
        }
    };

    const getUnlockLevel = (index: number) => {
        // Game 0 (Piggy), 1 (Neon), 2 (Pharaoh) -> Unlocked
        if (index < 3) return 0;
        // Game 3 (Dragon) -> Unlocks at 32
        // Game 4 (Pirate) -> Unlocks at 42
        return 32 + (index - 3) * 10;
    };

    // Feature Locks
    const isPiggyLocked = playerLevel < 5;
    const isQuestLocked = playerLevel < 20;
    const isMissionsLocked = playerLevel < 10;
    const isCardsLocked = playerLevel < 30;
    const isVipLocked = playerLevel < 40;

    return (
        <div className={`w-full h-full flex flex-col transition-colors duration-500 ${isHighLimit ? 'bg-red-950' : ''} relative overflow-hidden`}>

              <div className="flex-1 relative flex items-center justify-center p-0.5 pt-2 pb-8 md:pb-9">

                <div
                    ref={scrollRef}
                    className="grid gap-x-4 gap-y-3 h-[93%] max-h-[580px] auto-cols-max pt-5 px-3 overflow-x-auto no-scrollbar snap-x"
                    style={{
                        gridTemplateRows: 'repeat(2, 1fr)',
                        gridAutoFlow: 'column'
                    }}
                >
                    {GAMES_CONFIG.map((game, idx) => {
                         const titleStyle = game.theme === 'NEON' ? 'text-fuchsia-300 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]' :
                                             game.theme === 'EGYPT' ? 'text-amber-400 drop-shadow-[0_2px_0_rgba(0,0,0,1)]' :
                                             game.theme === 'DRAGON' ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' :
                                             game.theme === 'PIRATE' ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]' :
                                             game.theme === 'SPACE' ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' :
                                             game.theme === 'PIGGY' ? 'text-pink-300 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]' :
                                             'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]';
                        
                        let icon = '🍭';
                        if (game.theme === 'NEON') icon = '🎰';
                        else if (game.theme === 'EGYPT') icon = '🦂';
                        else if (game.theme === 'DRAGON') icon = '🐉';
                        else if (game.theme === 'PIRATE') icon = '🏴‍☠️';
                        else if (game.theme === 'SPACE') icon = '👽';
                        else if (game.theme === 'PIGGY') icon = '🐷';
                        else if (game.theme === 'JUNGLE') icon = '🌴';
                        else if (game.theme === 'UNDERWATER') icon = '🔱';
                        else if (game.theme === 'WESTERN') icon = '🤠';
                        else if (game.theme === 'SAMURAI') icon = '👹';
 
                        const unlockLevel = getUnlockLevel(idx);
                        const isLocked = playerLevel < unlockLevel;
 
                        return (
                            <button
                                key={game.id}
                                onClick={() => onSelectGame(game, isHighLimit)}
                                className={`
                                    row-span-1
                                    relative group
                                    w-[85px] h-[85px] md:w-[105px] md:h-[105px]
                                    rounded-md overflow-visible
                                    border-none shadow-xl
                                    snap-center
                                    ${isLocked ? 'cursor-not-allowed grayscale' : ''}
                                `}
                            >
                                {/* Jackpot Pill — fully above card, full width */}
                                {!isLocked && (
                                    <div className="absolute -top-[17px] left-0 right-0 z-30 pointer-events-none">
                                        <div className="w-full py-[2px]" style={{ background:'rgba(0,0,0,0.85)', border:'1px solid rgba(255,185,0,0.5)', borderRadius:'4px', boxShadow:'0 0 5px rgba(255,185,0,0.25)' }}>
                                            <span className="block text-center" style={{ fontSize:'11px', fontWeight:900, background:'linear-gradient(180deg,#fff8a0,#ffd700 50%,#ff9500)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', whiteSpace:'nowrap', letterSpacing:'0.3px' }}>
                                                {formatCommaNumber(jackpots[idx])}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Card background */}
                                <div className={`absolute inset-0 rounded-md overflow-hidden bg-gradient-to-br ${isHighLimit ? 'from-red-950 via-black to-red-900' : game.color} transition-opacity`}></div>

                                {/* Card content */}
                                <div className="absolute inset-0 rounded-md overflow-hidden z-10 select-none">
                                    {/* Icon — fills almost the full card */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-[4rem] md:text-[4.5rem] drop-shadow-2xl filter leading-none">
                                            {icon}
                                        </span>
                                    </div>
                                    {/* Title overlays at bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 pb-1 px-1 text-center">
                                        <h3 className={`text-[13px] md:text-[16px] font-black uppercase tracking-wide leading-tight line-clamp-2 ${getFontClass(game.theme)} ${titleStyle}`}
                                            style={{textShadow:'0 1px 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.8)'}}>
                                            {game.name}
                                        </h3>
                                    </div>
                                </div>

                                {isLocked && (
                                    <div className="absolute inset-0 rounded-md overflow-hidden bg-black/55 z-20 flex flex-col items-center justify-center">
                                        <span className="text-3xl leading-none opacity-80">🔒</span>
                                        <span className="text-white/70 font-bold text-[9px] mt-1 uppercase">Lvl {unlockLevel}</span>
                                    </div>
                                )}

                                <div className="absolute inset-0 rounded-md overflow-hidden bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10"></div>
                            </button>
                        );
                    })}
                    <div className="w-8"></div>
                </div>
 
                {/* Left arrow */}
                <button
                    onMouseDown={() => startScroll('LEFT')}
                    onMouseUp={stopScroll}
                    onMouseLeave={stopScroll}
                    onTouchStart={() => startScroll('LEFT')}
                    onTouchEnd={stopScroll}
                    className="absolute left-0 z-30 w-6 h-9 flex items-center justify-center text-white text-[10px] font-black active:translate-y-[2px] transition-transform select-none"
                    style={{ background:'linear-gradient(180deg,#9050cc,#5020a0)', border:'1.5px solid #38106e', borderRadius:'8px', boxShadow:'0 3px 0 #1a0838,0 4px 8px rgba(0,0,0,0.6)' }}
                >◀</button>

                {/* Right arrow */}
                <button
                    onMouseDown={() => startScroll('RIGHT')}
                    onMouseUp={stopScroll}
                    onMouseLeave={stopScroll}
                    onTouchStart={() => startScroll('RIGHT')}
                    onTouchEnd={stopScroll}
                    className="absolute right-0 z-30 w-6 h-9 flex items-center justify-center text-white text-[10px] font-black active:translate-y-[2px] transition-transform select-none"
                    style={{ background:'linear-gradient(180deg,#9050cc,#5020a0)', border:'1.5px solid #38106e', borderRadius:'8px', boxShadow:'0 3px 0 #1a0838,0 4px 8px rgba(0,0,0,0.6)' }}
                >▶</button>
            </div>
 
            {/* Bottom bar — curved arch, 3D, compressed center */}
            <div className="fixed bottom-0 w-full z-50 select-none" style={{ padding:'0 10px' }}>
                <div className="relative overflow-hidden" style={{
                    background: 'linear-gradient(180deg,#a060d8 0%,#7c3fb5 28%,#4a1880 100%)',
                    border: '1.5px solid rgba(180,110,240,0.7)',
                    borderBottom: 'none',
                    borderRadius: '100% 100% 0 0 / 18px 18px 0 0',
                    boxShadow: '0 -8px 28px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.18)',
                }}>
                    {/* Top shine */}
                    <div className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none z-10" style={{ background:'linear-gradient(180deg,rgba(255,255,255,0.20) 0%,rgba(255,255,255,0) 100%)' }}></div>
                    {/* Bottom shadow */}
                    <div className="absolute bottom-0 left-0 right-0 h-[35%] pointer-events-none z-10" style={{ background:'linear-gradient(0deg,rgba(0,0,0,0.38) 0%,rgba(0,0,0,0) 100%)' }}></div>

                    <div className="font-nunito flex items-stretch justify-center gap-0.5 h-[40px] md:h-[46px] relative z-20">

                        {/* Piggy Bank */}
                        <button
                            onClick={!isPiggyLocked ? onOpenPiggyBank : undefined}
                            className={`flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform px-2.5 md:px-3 ${isPiggyLocked ? 'grayscale opacity-50' : ''}`}
                        >
                            <span className="text-[1.2rem] md:text-[1.5rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">🐷</span>
                            <span className="text-[8px] md:text-[9px] font-black text-white/90 uppercase tracking-wider leading-none">Piggy</span>
                        </button>

                        {/* Quest */}
                        <button
                            onClick={!isQuestLocked ? onOpenQuest : undefined}
                            className={`flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform px-2.5 md:px-3 ${isQuestLocked ? 'grayscale opacity-50' : ''}`}
                        >
                            <div className="relative leading-none">
                                <span className="text-[1.2rem] md:text-[1.5rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{getQuestIcon()}</span>
                                {questReady && !isQuestLocked && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white animate-bounce"></div>}
                            </div>
                            <span className="text-[8px] md:text-[9px] font-black text-white/90 uppercase tracking-wider leading-none">Quest</span>
                        </button>

                        {/* Season Pass */}
                        <button
                            onClick={!isMissionsLocked ? onOpenBattlePass : undefined}
                            className={`flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform px-2.5 md:px-3 ${isMissionsLocked ? 'grayscale opacity-50' : ''}`}
                        >
                            <div className="relative leading-none">
                                <span className="text-[1.2rem] md:text-[1.5rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">🎫</span>
                                {totalMissionNotifs > 0 && !isMissionsLocked && (
                                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full border border-white flex items-center justify-center text-[6px] text-white font-bold animate-pulse">
                                        {totalMissionNotifs}
                                    </div>
                                )}
                            </div>
                            <span className="text-[8px] md:text-[9px] font-black text-white/90 uppercase tracking-wider leading-none">Pass</span>
                        </button>

                        {/* Time Bonus (Center Protruding Button) */}
                        <div className="flex items-center justify-center px-1">
                            <button
                                onClick={onClaimBonus}
                                className="flex flex-col items-center justify-center relative active:scale-95 transition-transform z-20"
                            >
                                <div className={`relative w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white/30 shadow-[0_0_10px_rgba(255,215,0,0.4)] flex flex-col items-center justify-center transition-transform -mt-5 md:-mt-6 ${isReadyToCollect ? 'bg-gradient-to-b from-[#7ada2a] via-[#5cc814] to-[#388e00] animate-pulse border-green-300' : 'bg-gradient-to-b from-[#3a1270] to-[#1a0838]'}`}>
                                    {isReadyToCollect ? (
                                        <>
                                            <span className="text-[6px] font-black uppercase text-white leading-none drop-shadow-[0_1px_0_rgba(15,60,0,0.8)]">FREE</span>
                                            <span className="text-[7px] font-black uppercase text-yellow-100 drop-shadow-[0_1px_0_rgba(15,60,0,0.8)] leading-none">COINS</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-[5.5px] font-bold text-purple-300 uppercase leading-none">BONUS</span>
                                            <span className="text-[8px] font-black text-white font-mono leading-none mt-0.5">{formatTime(timeLeft)}</span>
                                        </>
                                    )}
                                    {isReadyToCollect && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full border border-white animate-ping opacity-75"></div>}
                                    {isReadyToCollect && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full border border-white flex items-center justify-center text-[7px] font-bold text-white">!</div>}
                                </div>
                            </button>
                        </div>

                        {/* Missions */}
                        <button
                            onClick={!isMissionsLocked ? onOpenMissions : undefined}
                            className={`flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform px-2.5 md:px-3 ${isMissionsLocked ? 'grayscale opacity-50' : ''}`}
                        >
                            <span className="text-[1.2rem] md:text-[1.5rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">📜</span>
                            <span className="text-[8px] md:text-[9px] font-black text-white/90 uppercase tracking-wider leading-none">Missions</span>
                        </button>

                        {/* Cards */}
                        <button
                            onClick={!isCardsLocked ? onOpenCollection : undefined}
                            className={`flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform px-2.5 md:px-3 ${isCardsLocked ? 'grayscale opacity-50' : ''}`}
                        >
                            <span className="text-[1.2rem] md:text-[1.5rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">🃏</span>
                            <span className="text-[8px] md:text-[9px] font-black text-white/90 uppercase tracking-wider leading-none">Cards</span>
                        </button>

                        {/* VIP Limit Toggle */}
                        <button
                            onClick={!isVipLocked ? onToggleVIP : undefined}
                            className={`flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform px-2.5 md:px-3 ${isVipLocked ? 'grayscale opacity-50' : ''}`}
                        >
                            <div className="relative leading-none">
                                <span className="text-[1.2rem] md:text-[1.5rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{isHighLimit ? '👑' : '🧢'}</span>
                                {isHighLimit && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-600 rounded-full border border-white animate-pulse"></div>}
                            </div>
                            <span className="text-[8px] md:text-[9px] font-black text-white/90 uppercase tracking-wider leading-none">{isHighLimit ? 'VIP ON' : 'VIP'}</span>
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
};