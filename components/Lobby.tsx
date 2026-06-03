

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

                {/* Left Side Vertical Panel (Quest + Pass) */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1.5 select-none">
                    <button
                        onClick={!isQuestLocked ? onOpenQuest : undefined}
                        className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 transition-transform ${isQuestLocked ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
                        style={{ background:'linear-gradient(180deg,#7c3fb5,#4a1880)', border:'1.5px solid #38106e', width:'46px', padding:'6px 4px', boxShadow:'0 3px 10px rgba(0,0,0,0.55),inset 0 1px 1px rgba(255,255,255,0.2)' }}
                    >
                        {questReady && !isQuestLocked && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-white animate-bounce z-10"></div>}
                        <span className="text-xl leading-none">{getQuestIcon()}</span>
                        <span className="text-[7px] font-black text-white/90 uppercase tracking-wider leading-none mt-0.5">Quest</span>
                    </button>

                    <button
                        onClick={!isMissionsLocked ? onOpenBattlePass : undefined}
                        className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 transition-transform ${isMissionsLocked ? 'grayscale opacity-50 cursor-not-allowed' : ''}`}
                        style={{ background:'linear-gradient(180deg,#7c3fb5,#4a1880)', border:'1.5px solid #38106e', width:'46px', padding:'6px 4px', boxShadow:'0 3px 10px rgba(0,0,0,0.55),inset 0 1px 1px rgba(255,255,255,0.2)' }}
                    >
                        {totalMissionNotifs > 0 && !isMissionsLocked && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border border-white flex items-center justify-center text-[7px] text-white font-bold z-10 animate-pulse">
                                {totalMissionNotifs}
                            </div>
                        )}
                        <span className="text-xl leading-none">🎫</span>
                        <span className="text-[7px] font-black text-white/90 uppercase tracking-wider leading-none mt-0.5">Pass</span>
                    </button>
                </div>

                <div
                    ref={scrollRef}
                    className="grid gap-x-4 gap-y-2 h-[93%] max-h-[580px] auto-cols-max pl-[54px] pr-20 overflow-x-auto no-scrollbar snap-x"
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
                                    rounded-md overflow-hidden
                                    border-none
                                    shadow-xl
                                    flex flex-col items-center justify-between
                                    snap-center
                                    ${isLocked ? 'cursor-not-allowed' : ''}
                                `}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${isHighLimit ? 'from-red-950 via-black to-red-900' : game.color} transition-opacity`}></div>

                                <div className="relative z-10 w-full h-full select-none">
                                    {/* Jackpot Pill */}
                                    <div className="absolute top-0 left-0 right-0 flex justify-center z-20 pt-[3px]">
                                        <div className="px-1.5 py-[2px] rounded-full" style={{ background:'rgba(0,0,0,0.72)', border:'1px solid rgba(255,185,0,0.5)' }}>
                                            <span style={{ fontSize:'7px', fontWeight:900, background:'linear-gradient(180deg,#fff8a0,#ffd700 50%,#ff9500)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', whiteSpace:'nowrap' }}>
                                                ${formatCommaNumber(jackpots[idx])}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Icon — fills almost the full card */}
                                    <div className="absolute inset-0 flex items-center justify-center pt-3">
                                        <span className="text-[4rem] md:text-[4.5rem] drop-shadow-2xl filter leading-none">
                                            {icon}
                                        </span>
                                    </div>

                                    {/* Title overlays at bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 pb-1 px-1 text-center z-10">
                                        <h3 className={`text-[16px] md:text-[20px] font-black uppercase tracking-wide truncate ${getFontClass(game.theme)} ${titleStyle}`}
                                            style={{textShadow:'0 1px 4px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.8)'}}>
                                            {game.name}
                                        </h3>
                                    </div>
                                </div>
                                
                                {isLocked && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-2 text-center rounded-md">
                                        <span className="text-3xl mb-1 drop-shadow-lg">🔒</span>
                                        <div className="bg-red-600 px-2 py-0.5 rounded-full shadow-lg mb-0.5">
                                            <span className="text-white font-black uppercase text-[10px] tracking-wider">LOCKED</span>
                                        </div>
                                        <span className="text-white font-bold uppercase text-[9px] drop-shadow-md">Lvl {unlockLevel}</span>
                                    </div>
                                )}
 
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
                            </button>
                        );
                    })}
                    <div className="w-8"></div>
                </div>
 
                <button 
                    onMouseDown={() => startScroll('RIGHT')}
                    onMouseUp={stopScroll}
                    onMouseLeave={stopScroll}
                    onTouchStart={() => startScroll('RIGHT')}
                    onTouchEnd={stopScroll}
                    className="absolute right-4 z-30 w-10 h-10 md:w-14 md:h-14 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-all active:scale-95 select-none"
                >
                    ▶
                </button>
            </div>
 
            <div className="fixed bottom-0 w-full z-50 shadow-[0_-6px_20px_rgba(0,0,0,0.8)] select-none" style={{background:'linear-gradient(180deg,#7c3fb5,#4a1880)',borderTop:'2px solid #38106e'}}>
                <div className="font-nunito w-full flex items-stretch gap-0.5 px-2 md:px-4 h-[38px] md:h-[44px]">

                    {/* Piggy Bank */}
                    <button
                        onClick={!isPiggyLocked ? onOpenPiggyBank : undefined}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform ${isPiggyLocked ? 'grayscale opacity-50' : ''}`}
                    >
                        <span className="text-base md:text-xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">🐷</span>
                        <span className="text-[7px] md:text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Piggy</span>
                    </button>

                    {/* Quest */}
                    <button
                        onClick={!isQuestLocked ? onOpenQuest : undefined}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform ${isQuestLocked ? 'grayscale opacity-50' : ''}`}
                    >
                        <div className="relative leading-none">
                            <span className="text-base md:text-xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{getQuestIcon()}</span>
                            {questReady && !isQuestLocked && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white animate-bounce"></div>}
                        </div>
                        <span className="text-[7px] md:text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Quest</span>
                    </button>

                    {/* Season Pass */}
                    <button
                        onClick={!isMissionsLocked ? onOpenBattlePass : undefined}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform ${isMissionsLocked ? 'grayscale opacity-50' : ''}`}
                    >
                        <div className="relative leading-none">
                            <span className="text-base md:text-xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">🎫</span>
                            {totalMissionNotifs > 0 && !isMissionsLocked && (
                                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full border border-white flex items-center justify-center text-[6px] text-white font-bold animate-pulse">
                                    {totalMissionNotifs}
                                </div>
                            )}
                        </div>
                        <span className="text-[7px] md:text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Pass</span>
                    </button>

                    {/* Time Bonus (Center Protruding Button) */}
                    <div className="flex-1 flex items-center justify-center">
                        <button
                            onClick={onClaimBonus}
                            className="flex flex-col items-center justify-center relative active:scale-95 transition-transform z-20"
                        >
                            <div className={`relative w-9 h-9 md:w-11 md:h-11 rounded-full border-2 border-white/30 shadow-[0_0_10px_rgba(255,215,0,0.4)] flex flex-col items-center justify-center transition-transform -mt-4 md:-mt-5 ${isReadyToCollect ? 'bg-gradient-to-b from-[#7ada2a] via-[#5cc814] to-[#388e00] animate-pulse border-green-300' : 'bg-gradient-to-b from-[#3a1270] to-[#1a0838]'}`}>
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
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform ${isMissionsLocked ? 'grayscale opacity-50' : ''}`}
                    >
                        <span className="text-base md:text-xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">📜</span>
                        <span className="text-[7px] md:text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Missions</span>
                    </button>

                    {/* Cards */}
                    <button
                        onClick={!isCardsLocked ? onOpenCollection : undefined}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform ${isCardsLocked ? 'grayscale opacity-50' : ''}`}
                    >
                        <span className="text-base md:text-xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">🃏</span>
                        <span className="text-[7px] md:text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Cards</span>
                    </button>

                    {/* VIP Limit Toggle */}
                    <button
                        onClick={!isVipLocked ? onToggleVIP : undefined}
                        className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative active:scale-95 transition-transform ${isVipLocked ? 'grayscale opacity-50' : ''}`}
                    >
                        <div className="relative leading-none">
                            <span className="text-base md:text-xl leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{isHighLimit ? '👑' : '🧢'}</span>
                            {isHighLimit && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-600 rounded-full border border-white animate-pulse"></div>}
                        </div>
                        <span className="text-[7px] md:text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">{isHighLimit ? 'VIP ON' : 'VIP'}</span>
                    </button>

                </div>
            </div>
        </div>
    );
};