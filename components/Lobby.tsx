

import React, { useState, useEffect, useRef } from 'react';
import { GAMES_CONFIG, formatCommaNumber, formatTime } from '../constants';
import { GameConfig, QuestState, MissionState } from '../types';
import { jackpotService } from '../services/jackpotService';

interface LobbyProps {
    onSelectGame: (game: GameConfig, isHighLimit: boolean) => void;
    onOpenWildQuest: () => void;
    onOpenDiceQuest: () => void;
    onOpenMissions: () => void;
    onOpenBattlePass: () => void;
    onClaimBonus: () => void;
    onOpenCollection: () => void;
    onOpenPiggyBank: () => void;
    onOpenInbox: () => void;
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
    onOpenWildQuest,
    onOpenDiceQuest,
    onOpenMissions,
    onOpenBattlePass,
    onClaimBonus, 
    onOpenCollection,
    onOpenPiggyBank,
    onOpenInbox,
    onToggleVIP,
    questState, 
    missionState, 
    nextTimeBonus,
    bonusAmount,
    isHighLimit,
    playerLevel
}) => {
    
    const [timeLeft, setTimeLeft] = useState(0);
    const [jackpotTotals, setJackpotTotals] = useState<number[]>(() =>
        GAMES_CONFIG.map((_, idx) => jackpotService.getSlotTotal(idx))
    );
    const [canScroll, setCanScroll] = useState(false);
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
        return jackpotService.subscribe(() => {
            setJackpotTotals(GAMES_CONFIG.map((_, idx) => jackpotService.getSlotTotal(idx)));
        });
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

    const isReadyToCollect = timeLeft === 0;
    const missionsReady = missionState.activeMissions.filter(m => m.completed && !m.claimed).length;
    const passRewardsReady = missionState.passRewards.filter(r => r.level <= missionState.passLevel && !r.claimed && (r.tier === 'FREE' || missionState.isPremium)).length;
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

    const getUnlockLevel = (index: number) => index * 5;

    // Feature Locks
    const isPiggyLocked = playerLevel < 5;
    const isQuestLocked = playerLevel < 20;
    const isMissionsLocked = playerLevel < 10;
    const isCardsLocked = playerLevel < 30;

    return (
        <div className={`w-full h-full flex flex-col transition-colors duration-500 relative overflow-hidden`}
            style={isHighLimit ? {
                backgroundImage: 'url(/lobby-bg-vip.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            } : {
                backgroundImage: 'url(/lobby-bg.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}>

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
                                {/* Jackpot number — no container, constantly ticking */}
                                {!isLocked && (
                                    <div className="absolute -top-[18px] left-0 right-0 z-30 pointer-events-none flex items-center justify-center">
                                        <span style={{ fontSize:'16px', fontWeight:900, background:'linear-gradient(180deg,#fff8a0,#ffd700 50%,#ff9500)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', whiteSpace:'nowrap', letterSpacing:'0.3px', lineHeight:1, textShadow:'none', filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                                            {formatCommaNumber(jackpotTotals[idx] ?? 0)}
                                        </span>
                                    </div>
                                )}

                                {/* Card background */}
                                <div className={`absolute inset-0 rounded-md overflow-hidden bg-gradient-to-br ${game.color} transition-opacity`}></div>

                                {/* Card content */}
                                <div className="absolute inset-0 rounded-md overflow-hidden z-10 select-none">
                                    {/* Icon — aligned near top */}
                                    <div className="absolute inset-0 flex items-start justify-center pt-2">
                                        <span className="text-[4rem] md:text-[4.5rem] drop-shadow-2xl filter leading-none">
                                            {icon}
                                        </span>
                                    </div>
                                    {/* Title overlays at bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 pb-1 px-1 text-center">
                                        <h3 className={`text-[13px] md:text-[16px] font-black uppercase tracking-wide leading-tight line-clamp-2 ${getFontClass(game.theme)} ${titleStyle}`}
                                            style={{ WebkitTextStroke:'1.5px rgba(0,0,0,0.95)', paintOrder:'stroke fill' }}>
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
 
                {/* Left arrow — only when scrollable */}
                {canScroll && (
                    <button
                        onMouseDown={() => startScroll('LEFT')}
                        onMouseUp={stopScroll}
                        onMouseLeave={stopScroll}
                        onTouchStart={() => startScroll('LEFT')}
                        onTouchEnd={stopScroll}
                        className="absolute left-0 z-30 w-6 h-9 flex items-center justify-center text-white text-[10px] font-black active:translate-y-[2px] transition-transform select-none"
                        style={{ background:'linear-gradient(180deg,#9050cc,#5020a0)', border:'1.5px solid #38106e', borderRadius:'8px', boxShadow:'0 3px 0 #1a0838,0 4px 8px rgba(0,0,0,0.6)' }}
                    >◀</button>
                )}

                {/* Right arrow — only when scrollable */}
                {canScroll && (
                    <button
                        onMouseDown={() => startScroll('RIGHT')}
                        onMouseUp={stopScroll}
                        onMouseLeave={stopScroll}
                        onTouchStart={() => startScroll('RIGHT')}
                        onTouchEnd={stopScroll}
                        className="absolute right-0 z-30 w-6 h-9 flex items-center justify-center text-white text-[10px] font-black active:translate-y-[2px] transition-transform select-none"
                        style={{ background:'linear-gradient(180deg,#9050cc,#5020a0)', border:'1.5px solid #38106e', borderRadius:'8px', boxShadow:'0 3px 0 #1a0838,0 4px 8px rgba(0,0,0,0.6)' }}
                    >▶</button>
                )}
            </div>
 
            {/* Bottom bar — centered floating platform, icons protrude above */}
            {(() => {
                const iconBtn = (locked: boolean) =>
                    `flex flex-col items-center gap-0.5 px-2 md:px-2.5 active:scale-95 transition-transform ${locked ? 'grayscale opacity-50' : ''}`;
                const barBg = isHighLimit
                    ? 'linear-gradient(180deg,#e8b020 0%,#c9901a 30%,#7a5000 100%)'
                    : 'linear-gradient(180deg,#a060d8 0%,#7c3fb5 30%,#4a1880 100%)';
                const borderCol = isHighLimit ? '#b07010' : '#38106e';

                return (
                    <div className="fixed bottom-0 left-0 right-0 z-[50] flex items-end justify-center select-none font-nunito">
                        {/* Centered platform — only as wide as icons, bg is shorter than icons so they protrude */}
                        <div className="relative flex items-end justify-center gap-0.5 overflow-visible"
                            style={{ paddingLeft:'14px', paddingRight:'14px', paddingBottom:'4px', paddingTop:'8px' }}>

                            {/* Colored background — shorter than icons so they protrude above */}
                            <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
                                style={{
                                    height:'52px',
                                    borderRadius:'18px 18px 0 0',
                                    background: barBg,
                                    border: `1.5px solid ${borderCol}`,
                                    borderBottom: 'none',
                                    boxShadow:'0 -6px 24px rgba(0,0,0,0.7)',
                                    zIndex: -1,
                                }}>
                                <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height:'45%', borderRadius:'18px 18px 0 0', background:'linear-gradient(180deg,rgba(255,255,255,0.22),transparent)' }}></div>
                                <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height:'35%', background:'linear-gradient(0deg,rgba(0,0,0,0.38),transparent)' }}></div>
                            </div>

                            <button onClick={!isPiggyLocked ? onOpenPiggyBank : undefined} className={iconBtn(isPiggyLocked)}>
                                <span className="text-[2rem] md:text-[2.2rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🐷</span>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Piggy</span>
                            </button>

                            <button onClick={!isQuestLocked ? onOpenWildQuest : undefined} className={iconBtn(isQuestLocked)}>
                                <div className="relative leading-none">
                                    <span className="text-[2rem] md:text-[2.2rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🗿</span>
                                    {questReady && !isQuestLocked && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-yellow-400"></div>}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Wild</span>
                            </button>

                            <button onClick={!isQuestLocked ? onOpenDiceQuest : undefined} className={iconBtn(isQuestLocked)}>
                                <div className="relative leading-none">
                                    <span className="text-[2rem] md:text-[2.2rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🎲</span>
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Dice</span>
                            </button>

                            <button onClick={!isMissionsLocked ? onOpenBattlePass : undefined} className={iconBtn(isMissionsLocked)}>
                                <div className="relative leading-none">
                                    <span className="text-[2rem] md:text-[2.2rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🎫</span>
                                    {totalMissionNotifs > 0 && !isMissionsLocked && (
                                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-600 rounded-full border-2 border-yellow-400 flex items-center justify-center text-[9px] text-white font-black" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>
                                            {totalMissionNotifs}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Pass</span>
                            </button>

                            {/* Center — big coin "COLLECT" button, protrudes high */}
                            <button onClick={onClaimBonus} className="flex flex-col items-center px-1.5 active:scale-95 transition-transform relative">
                                <div className="relative" style={{
                                    width: '52px', height: '52px', borderRadius: '50%',
                                    background: isReadyToCollect
                                        ? 'radial-gradient(circle at 36% 28%,#fff7c0,#ffd027 40%,#f29400 70%,#b85f00)'
                                        : 'radial-gradient(circle at 36% 28%,#c0c0c0,#888 40%,#555 70%,#333)',
                                    border: isReadyToCollect ? '3px solid #f0a000' : '3px solid #666',
                                    boxShadow: isReadyToCollect
                                        ? 'inset 0 2px 5px rgba(255,255,255,0.65),inset 0 -2px 5px rgba(140,70,0,0.5),0 4px 0 rgba(120,60,0,0.7),0 6px 12px rgba(0,0,0,0.5)'
                                        : 'inset 0 2px 4px rgba(255,255,255,0.3),0 4px 0 rgba(0,0,0,0.5)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <span style={{ fontSize:'11px', fontWeight:900, lineHeight:1, color: isReadyToCollect ? '#7c3500' : '#aaa', textTransform:'uppercase' }}>FREE</span>
                                    <span style={{ fontSize:'13px', fontWeight:900, lineHeight:1, color: isReadyToCollect ? '#7c3500' : '#aaa', textTransform:'uppercase' }}>COINS</span>
                                    <div style={{
                                        position:'absolute', bottom:'-9px', left:'50%', transform:'translateX(-50%)',
                                        background: isReadyToCollect ? 'linear-gradient(180deg,#3a9900,#1e6600)' : '#444',
                                        color:'white', fontSize:'7px', fontWeight:900,
                                        padding:'2px 8px', borderRadius:'8px', whiteSpace:'nowrap', textTransform:'uppercase',
                                        border:'1px solid rgba(255,255,255,0.25)',
                                        boxShadow: isReadyToCollect ? '0 2px 0 rgba(0,0,0,0.4)' : 'none',
                                        letterSpacing:'0.5px',
                                    }}>
                                        {isReadyToCollect ? 'COLLECT' : formatTime(timeLeft)}
                                    </div>
                                    {isReadyToCollect && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-yellow-400 flex items-center justify-center text-[11px] font-black text-white z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>!</div>}
                                </div>
                                <div style={{ height:'14px' }}></div>
                            </button>

                            <button onClick={!isMissionsLocked ? onOpenMissions : undefined} className={iconBtn(isMissionsLocked)}>
                                <span className="text-[2rem] md:text-[2.2rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">📜</span>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Missions</span>
                            </button>

                            <button onClick={!isCardsLocked ? onOpenCollection : undefined} className={iconBtn(isCardsLocked)}>
                                <span className="text-[2rem] md:text-[2.2rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🃏</span>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Cards</span>
                            </button>

                            <button onClick={onOpenInbox} className={iconBtn(false)}>
                                <span className="text-[2rem] md:text-[2.2rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">📬</span>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Inbox</span>
                            </button>

                            <button onClick={onToggleVIP} className={iconBtn(false)}>
                                <div className="relative leading-none">
                                    <span className="text-[2rem] md:text-[2.2rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">{isHighLimit ? '👑' : '🎩'}</span>
                                    {isHighLimit && <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full border-2 border-white"></div>}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">{isHighLimit ? 'VIP HL' : 'VIP Lounge'}</span>
                            </button>

                        </div>
                    </div>
                );
            })()}
        </div>
    );
};