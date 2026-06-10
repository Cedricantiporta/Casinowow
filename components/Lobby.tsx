

import React, { useState, useEffect, useRef } from 'react';
import { GAMES_CONFIG, formatCommaNumber, formatTime, formatK } from '../constants';
import { GameConfig, QuestState, MissionState } from '../types';
import { jackpotService, SLOT_VARS } from '../services/jackpotService';

interface LobbyProps {
    onSelectGame: (game: GameConfig, isHighLimit: boolean) => void;
    onOpenWildQuest?: () => void;
    onOpenDiceQuest?: () => void;
    onOpenQuest?: () => void;
    onOpenMissions: () => void;
    onOpenBattlePass: () => void;
    onClaimBonus: () => void;
    onOpenCollection: () => void;
    onOpenPiggyBank: () => void;
    onOpenInbox?: () => void;
    inboxCount?: number;
    onToggleVIP: () => void;
    questState: QuestState;
    missionState: MissionState;
    nextTimeBonus: number;
    bonusAmount: number;
    isHighLimit: boolean;
    isVip?: boolean;
    playerLevel: number;
    currentBet?: number;
    piggyBank?: number;
    piggyMaxBet?: number;
    packCredits?: number;
    premiumPackCredits?: number;
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
    inboxCount,
    onToggleVIP,
    questState,
    missionState,
    nextTimeBonus,
    bonusAmount,
    isHighLimit,
    isVip,
    playerLevel,
    currentBet,
    piggyBank,
    piggyMaxBet,
    packCredits,
    premiumPackCredits
}) => {
    
    const [timeLeft, setTimeLeft] = useState(0);
    const [jackpotTotals, setJackpotTotals] = useState<number[]>(() =>
        GAMES_CONFIG.map((_, idx) => Math.floor((currentBet ?? 0) * 100 * (SLOT_VARS[idx % SLOT_VARS.length] || 1)))
    );
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = Math.max(0, nextTimeBonus - now);
            setTimeLeft(diff);
        }, 1000);
        return () => clearInterval(interval);
    }, [nextTimeBonus]);

    useEffect(() => {
        setJackpotTotals(
            GAMES_CONFIG.map((_, idx) => Math.floor((currentBet ?? 0) * 100 * (SLOT_VARS[idx % SLOT_VARS.length] || 1)))
        );
    }, [currentBet]);

    useEffect(() => {
        return jackpotService.subscribe(() => {
            setJackpotTotals(GAMES_CONFIG.map((_, idx) => Math.floor((currentBet ?? 0) * 100 * (SLOT_VARS[idx % SLOT_VARS.length] || 1))));
        });
    }, [currentBet]);

    const isReadyToCollect = timeLeft === 0;
    const missionsReady = missionState.activeMissions.filter(m => m.completed && !m.claimed).length;
    const passRewardsReady = missionState.passRewards.filter(r => r.level <= missionState.passLevel && !r.claimed && (r.tier === 'FREE' || missionState.isPremium)).length;
    const totalMissionNotifs = passRewardsReady;
    const questReady = (questState.diceCredits ?? 0) > 0 || (questState.wildCredits ?? 0) > 0;

    const getQuestIcon = () => {
        if (questState.activeGame === 'DICE') return '🎲';
        if (questState.activeGame === 'WILD') return '🗿';
        return '🗺️';
    };

    const getFontClass = (theme: string) => {
        switch(theme) {
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

    const getUnlockLevel = (index: number) => index === 0 ? 0 : index * 5 + 1;

    // Feature Locks
    const isPiggyLocked = playerLevel < 5;
    const isQuestLocked = playerLevel < 20;
    const isMissionsLocked = playerLevel < 10;
    const isCardsLocked = playerLevel < 30;

    // Quest credit states
    const QUEST_MAX = 60;
    const wildFull = (questState.wildCredits ?? 0) >= QUEST_MAX;
    const diceFull = (questState.diceCredits ?? 0) >= QUEST_MAX;
    const wildCredits = Math.floor(questState.wildCredits ?? 0);
    const diceCredits = Math.floor(questState.diceCredits ?? 0);

    // Piggy full state
    const piggyCap = (piggyMaxBet ?? 0) * 5;
    const piggyFull = !isPiggyLocked && (piggyBank ?? 0) >= piggyCap;

    return (
        <div className={`w-full h-full flex flex-col transition-colors duration-500 relative overflow-hidden`}
            style={isVip ? {
                backgroundImage: 'url(/lobby-bg-vip.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            } : {
                backgroundImage: 'url(/lobby-bg.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}>

              <div className="flex-1 relative flex items-center justify-center p-0.5 pt-2 pb-8 md:pb-9">

                    {/* ── Normal lobby — horizontal scroll grid ── */}
                    <>
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
                                    game.theme === 'GOLDEN_POT' ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' :
                                    game.theme === 'LEPRECHAUN' ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' :
                                    game.theme === 'ARCTIC' ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' :
                                    'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]';
                                let icon = '🍭';
                                if (game.theme === 'NEON') icon = '🎰';
                                else if (game.theme === 'EGYPT') icon = '🦂';
                                else if (game.theme === 'DRAGON') icon = '🐉';
                                else if (game.theme === 'PIRATE') icon = '🏴‍☠️';
                                else if (game.theme === 'SPACE') icon = '👽';
                                else if (game.theme === 'PIGGY') icon = '🐷';
                                else if (game.theme === 'JUNGLE') icon = '🦍';
                                else if (game.theme === 'UNDERWATER') icon = '🦈';
                                else if (game.theme === 'WESTERN') icon = '🤠';
                                else if (game.theme === 'SAMURAI') icon = '⚔️';
                                else if (game.theme === 'CANDY') icon = '🧁';
                                else if (game.theme === 'GOLDEN_POT') icon = '🏮';
                                else if (game.theme === 'LEPRECHAUN') icon = '🍀';
                                else if (game.theme === 'ARCTIC') icon = '🐧';
                                const unlockLevel = getUnlockLevel(idx);
                                const isLocked = playerLevel < unlockLevel;
                                return (
                                    <button
                                        key={game.id}
                                        onClick={() => onSelectGame(game, false)}
                                        className={`row-span-1 relative group w-[85px] h-[85px] md:w-[105px] md:h-[105px] rounded-xl overflow-visible snap-center ${isLocked ? 'cursor-not-allowed grayscale' : ''}`}
                                        style={{ boxShadow: 'inset 0 2px 0 rgba(210,150,255,0.85), 0 0 12px rgba(160,80,255,0.28), 0 6px 18px rgba(0,0,0,0.55)' }}
                                    >
                                        {!isLocked && (
                                            <div className="absolute -top-[22px] left-0 right-0 z-30 pointer-events-none flex items-center justify-center">
                                                <span style={{ fontSize:'11px', fontWeight:900, color:'#f3e8ff', whiteSpace:'nowrap', lineHeight:1, background:'rgba(10,2,30,0.9)', border:'2px solid #7c3aed', borderRadius:'999px', padding:'3px 8px', boxShadow:'0 0 8px rgba(124,58,237,0.6)' }}>
                                                    {formatK(jackpotTotals[idx] ?? 0)}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`absolute inset-0 rounded-xl overflow-hidden bg-gradient-to-br ${game.color} transition-opacity`}></div>
                                        <div className="absolute inset-0 rounded-xl overflow-hidden z-10 select-none">
                                            <div className="absolute inset-0 flex items-start justify-center pt-2">
                                                <span className="text-[4rem] md:text-[4.5rem] drop-shadow-2xl filter leading-none">{icon}</span>
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 pb-1 px-1 text-center">
                                                <h3 className={`text-[13px] md:text-[16px] font-black uppercase tracking-wide leading-tight line-clamp-2 ${getFontClass(game.theme)} ${titleStyle}`}
                                                    style={{ WebkitTextStroke:'1.5px rgba(0,0,0,0.95)', paintOrder:'stroke fill' }}>
                                                    {game.name}
                                                </h3>
                                            </div>
                                        </div>
                                        {isLocked && (
                                            <div className="absolute inset-0 rounded-xl overflow-hidden bg-black/55 z-20 flex flex-col items-center justify-center">
                                                <span className="text-3xl leading-none opacity-80">🔒</span>
                                                <span className="text-white/70 font-bold text-[9px] mt-1 uppercase">Lvl {unlockLevel}</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 rounded-xl overflow-hidden bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10"></div>
                                    </button>
                                );
                            })}
                            <div className="w-8"></div>
                        </div>

                    </>
            </div>
 
            {/* Bottom bar — centered floating platform, icons protrude above */}
            {(() => {
                const iconBtn = (locked: boolean) =>
                    `relative flex flex-col items-center gap-0.5 px-2 md:px-2.5 active:scale-95 transition-transform ${locked ? 'grayscale' : ''}`;
                const lockBadge = (unlockLevel: number) => (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/50 pointer-events-none z-10">
                        <span className="text-white/70 text-[10px] leading-none">🔒</span>
                        <span className="text-white/60 font-black text-[7px] mt-0.5 uppercase leading-none">Lvl {unlockLevel}</span>
                    </div>
                );
                const isGolden = isVip;
                const barBg = isGolden
                    ? 'linear-gradient(180deg,#e8b020 0%,#c9901a 30%,#7a5000 100%)'
                    : 'linear-gradient(180deg,#d060ff 0%,#b040f8 25%,#7020d0 100%)';
                const borderCol = isGolden ? '#b07010' : '#9030d0';
                const topInset = isGolden
                    ? 'inset 0 2px 0 rgba(255,210,80,0.85)'
                    : 'inset 0 2px 0 rgba(220,170,255,0.95)';
                const barGlow = topInset;

                return (
                    <div className="fixed bottom-0 left-0 right-0 z-[50] flex items-end justify-center select-none font-nunito">
                        {/* Centered platform — only as wide as icons, bg is shorter than icons so they protrude */}
                        <div className="relative flex items-end justify-center gap-0.5 overflow-visible"
                            style={{ paddingLeft:'14px', paddingRight:'14px', paddingBottom:'4px', paddingTop:'8px' }}>

                            {/* Colored background — shorter than icons so they protrude above */}
                            <div className="absolute bottom-0 left-0 right-0 pointer-events-none"
                                style={{
                                    height:'58px',
                                    borderRadius:'18px 18px 0 0',
                                    background: barBg,
                                    border: `1.5px solid ${borderCol}`,
                                    borderBottom: 'none',
                                    boxShadow: barGlow,
                                    zIndex: -1,
                                }}>
                                <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height:'45%', borderRadius:'18px 18px 0 0', background:'linear-gradient(180deg,rgba(255,255,255,0.25),transparent)' }}></div>
                                <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height:'35%', background:'linear-gradient(0deg,rgba(0,0,0,0.38),transparent)' }}></div>
                            </div>

                            {/* Piggy */}
                            <button onClick={!isPiggyLocked ? onOpenPiggyBank : undefined} className={iconBtn(isPiggyLocked)}>
                                {isPiggyLocked && lockBadge(5)}
                                <div className="relative leading-none">
                                    <span className="text-[2.4rem] md:text-[2.7rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🐷</span>
                                    {piggyFull && (
                                        <div className="absolute -top-1 -right-2 text-white font-black text-[7px] px-1 py-0.5 rounded-full leading-none whitespace-nowrap"
                                            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>FULL</div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Piggy</span>
                            </button>

                            {/* Wild */}
                            <button onClick={!isQuestLocked ? onOpenWildQuest : undefined} className={iconBtn(isQuestLocked)}>
                                {isQuestLocked && lockBadge(20)}
                                <div className="relative leading-none">
                                    <span className="text-[2.4rem] md:text-[2.7rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🗿</span>
                                    {!isQuestLocked && wildCredits > 0 && (
                                        <div className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-white font-black leading-none text-[8px]"
                                            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>
                                            {wildFull ? 'MAX' : wildCredits}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Wild</span>
                            </button>

                            {/* Dice */}
                            <button onClick={!isQuestLocked ? onOpenDiceQuest : undefined} className={iconBtn(isQuestLocked)}>
                                {isQuestLocked && lockBadge(20)}
                                <div className="relative leading-none">
                                    <span className="text-[2.4rem] md:text-[2.7rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🎲</span>
                                    {!isQuestLocked && diceCredits > 0 && (
                                        <div className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-white font-black leading-none text-[8px]"
                                            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>
                                            {diceFull ? 'MAX' : diceCredits}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Dice</span>
                            </button>

                            {/* Pass */}
                            <button onClick={!isMissionsLocked ? onOpenBattlePass : undefined} className={iconBtn(isMissionsLocked)}>
                                {isMissionsLocked && lockBadge(10)}
                                <div className="relative leading-none">
                                    <span className="text-[2.4rem] md:text-[2.7rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🎫</span>
                                    {totalMissionNotifs > 0 && !isMissionsLocked && (
                                        <div className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] text-white font-black"
                                            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>
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
                                {isMissionsLocked && lockBadge(10)}
                                <span className="text-[2.4rem] md:text-[2.7rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">📜</span>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Missions</span>
                            </button>

                            <button onClick={!isCardsLocked ? onOpenCollection : undefined} className={iconBtn(isCardsLocked)}>
                                {isCardsLocked && lockBadge(30)}
                                <div className="relative">
                                    <span className="text-[2.4rem] md:text-[2.7rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🃏</span>
                                    {((packCredits ?? 0) + (premiumPackCredits ?? 0)) > 0 && (
                                        <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center px-0.5 z-10">
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{((packCredits ?? 0) + (premiumPackCredits ?? 0)) > 99 ? '99+' : (packCredits ?? 0) + (premiumPackCredits ?? 0)}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Cards</span>
                            </button>

                            <button onClick={onOpenInbox} className={iconBtn(false)}>
                                <div className="relative">
                                    <span className="text-[2.4rem] md:text-[2.7rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">📬</span>
                                    {(inboxCount ?? 0) > 0 && (
                                        <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center px-0.5 z-10">
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{(inboxCount ?? 0) > 99 ? '99+' : inboxCount}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Inbox</span>
                            </button>

                            <button onClick={onToggleVIP} className={iconBtn(false)}>
                                <span className="text-[2.4rem] md:text-[2.7rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">{isVip ? '👑' : '🎩'}</span>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">{isVip ? 'VIP HL' : 'VIP Lounge'}</span>
                            </button>

                        </div>
                    </div>
                );
            })()}
        </div>
    );
};