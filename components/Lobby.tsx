

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
              <div className="flex-1 relative flex items-center justify-center p-0.5 pt-1.5 pb-15 md:pb-19">
                <button 
                    onMouseDown={() => startScroll('LEFT')}
                    onMouseUp={stopScroll}
                    onMouseLeave={stopScroll}
                    onTouchStart={() => startScroll('LEFT')}
                    onTouchEnd={stopScroll}
                    className="absolute left-4 z-30 w-10 h-10 md:w-14 md:h-14 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center shadow-lg border border-white/20 transition-all active:scale-95 select-none"
                >
                    ◀
                </button>

                <div 
                    ref={scrollRef}
                    className="grid gap-2 h-[93%] max-h-[580px] auto-cols-max px-8 pr-24 overflow-x-auto no-scrollbar snap-x"
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
                                    w-[130px] h-[130px] md:w-[170px] md:h-[170px]
                                    rounded-md overflow-hidden 
                                    border-none
                                    shadow-xl
                                    flex flex-col items-center justify-between
                                    snap-center
                                    ${isLocked ? 'cursor-not-allowed' : ''}
                                `}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${isHighLimit ? 'from-red-950 via-black to-red-900' : game.color} transition-opacity`}></div>
                                
                                <div className="relative z-10 w-full h-full flex flex-col p-2 select-none items-center justify-between">
                                    {/* Icon / Emoji */}
                                    <div className="flex-1 flex items-center justify-center">
                                        <span className="text-5xl md:text-7xl drop-shadow-2xl filter">
                                            {icon}
                                        </span>
                                    </div>
                                    
                                    {/* Title directly over background - NO containers, NO descriptions under if keeping it minimal */}
                                    <div className="w-full pb-1 select-none text-center">
                                        <h3 className={`text-xs md:text-sm font-black uppercase tracking-wide truncate ${getFontClass(game.theme)} ${titleStyle}`}>
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
 
            <div className="fixed bottom-0 w-full z-50 bg-[#120024] border-t-2 border-[#2a0d55] shadow-[0_-10px_35px_rgba(0,0,0,0.85)] flex flex-col select-none">
                <div className="barA bar font-nunito w-full flex items-stretch gap-1 md:gap-1.5 rounded-none p-1.5 px-3 md:px-6 h-[56px] md:h-[64px]">

                    {/* Piggy Bank */}
                    <button 
                        onClick={!isPiggyLocked ? onOpenPiggyBank : undefined}
                        className={`flex-1 flex flex-col items-center justify-center group relative active:scale-95 transition-transform ${isPiggyLocked ? 'grayscale opacity-50' : ''}`}
                    >
                        <div className="filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                             <span className="text-xl md:text-3.5xl">🐷</span>
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black text-white/80 uppercase mt-0.5 tracking-wider">Piggy</span>
                    </button>

                    {/* Quest */}
                    <button 
                        onClick={!isQuestLocked ? onOpenQuest : undefined}
                        className={`flex-1 flex flex-col items-center justify-center group relative active:scale-95 transition-transform ${isQuestLocked ? 'grayscale opacity-50' : ''}`}
                    >
                        <div className="filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                             <span className="text-xl md:text-3.5xl">{getQuestIcon()}</span>
                             {questReady && !isQuestLocked && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-white animate-bounce"></div>}
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black text-white/80 uppercase mt-0.5 tracking-wider">Quest</span>
                    </button>

                    {/* Season Pass */}
                    <button 
                        onClick={!isMissionsLocked ? onOpenBattlePass : undefined}
                        className={`flex-1 flex flex-col items-center justify-center group relative active:scale-95 transition-transform ${isMissionsLocked ? 'grayscale opacity-50' : ''}`}
                    >
                         <div className="filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                             <span className="text-xl md:text-3.5xl">🎫</span>
                             {totalMissionNotifs > 0 && !isMissionsLocked && (
                                 <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border border-white flex items-center justify-center text-[7px] text-white font-bold animate-pulse">
                                     {totalMissionNotifs}
                                 </div>
                              )}
                         </div>
                         <span className="text-[8px] md:text-[10px] font-black text-white/80 uppercase mt-0.5 tracking-wider">Pass</span>
                    </button>

                    {/* Time Bonus (Center Protruding Button - NO LINE BORDERS) */}
                    <div className="flex-1 flex items-center justify-center">
                        <button 
                            onClick={onClaimBonus}
                            className="flex flex-col items-center justify-center group relative active:scale-95 transition-transform z-20 min-w-[55px] md:min-w-[80px]"
                        >
                            <div className={`relative w-11 h-11 md:w-15 md:h-15 rounded-full shadow-[0_0_15px_rgba(255,215,0,0.5)] flex flex-col items-center justify-center group-hover:scale-110 transition-transform -mt-5.5 md:-mt-7 ${isReadyToCollect ? 'bg-gradient-to-b from-[#7ada2a] via-[#5cc814] to-[#388e00] animate-pulse' : 'bg-gradient-to-b from-[#2a0d52] to-[#1a0838] shadow-inner'}`}>
                                {isReadyToCollect ? (
                                    <>
                                        <span className="text-[7px] md:text-[8px] font-black uppercase text-white leading-none mt-0.5 drop-shadow-[0_1px_0_rgba(15,60,0,0.8)]">FREE</span>
                                        <span className="text-[8px] md:text-[9px] font-black uppercase text-yellow-100 drop-shadow-[0_1px_0_rgba(15,60,0,0.8)] leading-none mt-0.5">COINS</span>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center">
                                        <span className="text-[6.5px] md:text-[7px] font-bold text-purple-300 uppercase leading-none">BONUS</span>
                                        <span className="text-[9px] md:text-[11px] font-black text-white font-mono mt-0.5 leading-none">{formatTime(timeLeft)}</span>
                                    </div>
                                )}
                                {isReadyToCollect && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border border-white animate-ping opacity-75"></div>}
                                {isReadyToCollect && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white shadow-lg">!</div>}
                            </div>
                        </button>
                    </div>

                    {/* Missions */}
                    <button 
                        onClick={!isMissionsLocked ? onOpenMissions : undefined}
                        className={`flex-1 flex flex-col items-center justify-center group relative active:scale-95 transition-transform ${isMissionsLocked ? 'grayscale opacity-50' : ''}`}
                    >
                         <div className="filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                             <span className="text-xl md:text-3.5xl">📜</span>
                         </div>
                         <span className="text-[8px] md:text-[10px] font-black text-white/80 uppercase mt-0.5 tracking-wider">Missions</span>
                    </button>

                    {/* Cards */}
                    <button 
                        onClick={!isCardsLocked ? onOpenCollection : undefined}
                        className={`flex-1 flex flex-col items-center justify-center group relative active:scale-95 transition-transform ${isCardsLocked ? 'grayscale opacity-50' : ''}`}
                    >
                        <div className="filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                            <span className="text-xl md:text-3.5xl">🃏</span>
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black text-white/80 uppercase mt-0.5 tracking-wider">Cards</span>
                    </button>

                    {/* VIP Limit Toggle */}
                    <button 
                        onClick={!isVipLocked ? onToggleVIP : undefined}
                        className={`flex-1 flex flex-col items-center justify-center group relative active:scale-95 transition-transform ${isVipLocked ? 'grayscale opacity-50' : ''}`}
                    >
                        <div className="filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                            <span className="text-xl md:text-3.5xl">{isHighLimit ? '👑' : '🧢'}</span>
                             {isHighLimit && <div className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full border border-white animate-pulse"></div>}
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black text-white/80 uppercase mt-0.5 tracking-wider">{isHighLimit ? 'VIP ON' : 'VIP'}</span>
                    </button>

                </div>
            </div>
        </div>
    );
};