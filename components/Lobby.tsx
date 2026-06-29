

import React, { useState, useEffect, useRef } from 'react';
import { GAMES_CONFIG, formatCommaNumber, formatTime, formatK } from '../constants';
import { GameConfig, QuestState, MissionState } from '../types';
import { jackpotService, SLOT_VARS } from '../services/jackpotService';

const THEME_PNG: Partial<Record<string, string>> = {
    DRAGON: '/dragon/dragon-11.png',
    EGYPT:  '/egypt/wild.png',
    NEON:   '/symbols/seven.png',
    CANDY:  '/candy/sugar1.png',
    PIRATE: '/pirate/skull.png',
    PIGGY:  '/piggy/pig.png',
    ARCTIC: '/arctic/penguin.png',
};

const THEME_ICON_SIZE: Partial<Record<string, string>> = {
    PIGGY: '6rem', EGYPT: '6rem', ARCTIC: '6rem', PIRATE: '6rem', CANDY: '6rem', DRAGON: '6rem',
};

interface LobbyProps {
    onSelectGame: (game: GameConfig, isHighLimit: boolean) => void;
    onOpenMiniGames?: () => void;
    onOpenQuestPath?: () => void;
    onOpenMissions: () => void;
    onOpenBattlePass: () => void;
    onClaimBonus: () => void;
    onOpenCollection: () => void;
    onOpenPiggyBank: () => void;
    onOpenRanking: () => void;
    onOpenInbox?: () => void;
    inboxCount?: number;
    onOpenHighRoller: () => void;
    onOpenVipLounge: () => void;
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
    isJackpotReady?: boolean;
    questPathCurrentIndex?: number;
    newSlotIds?: string[];
    bonusTimers?: { id: number; endTime: number; reward: number; label: string }[];
}

export const Lobby: React.FC<LobbyProps> = ({
    onSelectGame,
    onOpenMiniGames,
    onOpenQuestPath,
    onOpenMissions,
    onOpenBattlePass,
    onClaimBonus,
    onOpenCollection,
    onOpenPiggyBank,
    onOpenRanking,
    onOpenInbox,
    inboxCount,
    onOpenHighRoller,
    onOpenVipLounge,
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
    premiumPackCredits,
    isJackpotReady,
    questPathCurrentIndex = 0,
    newSlotIds = [],
    bonusTimers = [],
}) => {
    
    const [timeLeft, setTimeLeft] = useState(0);
    const [jackpotTotals, setJackpotTotals] = useState<number[]>(() =>
        GAMES_CONFIG.map((_, idx) => jackpotService.getSlotTotal(idx) * (isHighLimit ? 10 : 1))
    );
    const scrollRef = useRef<HTMLDivElement>(null);
    const hlScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const makeWheelHandler = (el: HTMLDivElement) => {
            const handler = (e: WheelEvent) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    el.scrollLeft += e.deltaY;
                }
            };
            el.addEventListener('wheel', handler, { passive: false });
            return () => el.removeEventListener('wheel', handler);
        };
        const cleanHL = hlScrollRef.current ? makeWheelHandler(hlScrollRef.current) : null;
        const cleanNormal = scrollRef.current ? makeWheelHandler(scrollRef.current) : null;
        return () => { cleanHL?.(); cleanNormal?.(); };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const diff = Math.max(0, nextTimeBonus - now);
            setTimeLeft(diff);
        }, 1000);
        return () => clearInterval(interval);
    }, [nextTimeBonus]);

    useEffect(() => {
        setJackpotTotals(GAMES_CONFIG.map((_, idx) => jackpotService.getSlotTotal(idx) * (isHighLimit ? 10 : 1)));
    }, [currentBet, isHighLimit]);

    useEffect(() => {
        return jackpotService.subscribe(() => {
            setJackpotTotals(GAMES_CONFIG.map((_, idx) => jackpotService.getSlotTotal(idx) * (isHighLimit ? 10 : 1)));
        });
    }, [currentBet, isHighLimit]);

    const readyTimers = bonusTimers.filter(t => t.endTime <= Date.now()).length;
    const isReadyToCollect = timeLeft === 0;
    const visibleDailyMissions = missionState.activeMissions.filter(m => m.frequency === 'DAILY').slice(0, 4);
    const passRewardsReady = missionState.passRewards.filter(r => r.level <= missionState.passLevel + (missionState.isPremium ? 10 : 0) && !r.claimed && (r.tier === 'FREE' || missionState.isPremium)).length;
    const totalMissionNotifs = passRewardsReady;
    const missionsNotifs = missionState.activeMissions.filter(m => m.frequency === 'DAILY' && m.completed && !m.claimed).length;
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
    const isPiggyLocked = playerLevel < 10;
    const isQuestLocked = playerLevel < 20;
    const isMissionsLocked = playerLevel < 15;
    const isPassLocked = playerLevel < 10;
    const isCardsLocked = playerLevel < 30;
    const isHighRollerLocked = playerLevel < 35;
    const isRankingLocked = playerLevel < 18;

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
            style={{
                backgroundImage: isHighLimit ? 'url(/lobby-bg-vip.jpg)' : 'url(/lobby-bg.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}>

              <div className="flex-1 relative flex flex-col pb-5 md:pb-6 overflow-hidden">

                {/* ── Top spacer ── */}
                <div className="shrink-0" style={{ height: 6 }} />

                {/* ── Slot grid ── */}
                <div className="flex-1 flex items-start justify-start p-0.5 pt-0 overflow-hidden">

                    {isHighLimit ? (
                        /* ── High Roller lobby — single horizontal scroll row ── */
                        <div ref={hlScrollRef} className="flex items-center gap-3 overflow-x-auto no-scrollbar w-full h-full" style={{ paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 0.75rem)', paddingRight: '0.75rem' }}>
                            {GAMES_CONFIG.slice(0, 8).map((game, idx) => {
                                const titleStyle = game.theme === 'NEON' ? 'text-fuchsia-300' :
                                    game.theme === 'EGYPT' ? 'text-amber-400' :
                                    game.theme === 'DRAGON' ? 'text-red-400' :
                                    game.theme === 'PIRATE' ? 'text-sky-300' :
                                    game.theme === 'SPACE' ? 'text-indigo-300' :
                                    game.theme === 'PIGGY' ? 'text-pink-300' :
                                    'text-yellow-200';
                                let icon = '🍭';
                                if (game.theme === 'NEON') icon = '🎰';
                                else if (game.theme === 'EGYPT') icon = '🦂';
                                else if (game.theme === 'DRAGON') icon = '🐉';
                                else if (game.theme === 'PIRATE') icon = '🏴‍☠️';
                                else if (game.theme === 'SPACE') icon = '👽';
                                else if (game.theme === 'PIGGY') icon = '🐷';
                                const unlockLevel = getUnlockLevel(idx);
                                const isLocked = playerLevel < unlockLevel;
                                const hrJackpot = jackpotTotals[idx] ?? 0;
                                return (
                                    <div key={game.id} className="flex flex-col items-center gap-0 shrink-0">
                                        {/* Jackpot counter — sits above card with clear gap */}
                                        <div style={{ width: '130px', background: 'rgba(10,4,0,0.95)', border: '2px solid #f59e0b', borderRadius: '7px', padding: '3px 5px', textAlign: 'center', boxShadow: '0 0 10px rgba(245,158,11,0.5)', marginBottom: '6px', position: 'relative', zIndex: 2 }}>
                                            <div style={{ fontSize: '7px', fontWeight: 900, color: '#f59e0b', letterSpacing: '1px', lineHeight: 1, marginBottom: '2px' }}>Jackpot</div>
                                            <div style={{ fontSize: '12px', fontWeight: 900, color: '#fff8c0', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(245,158,11,0.9)' }}>{formatK(hrJackpot)}</div>
                                        </div>
                                        {/* Card-shaped slot */}
                                        <button
                                            onClick={() => onSelectGame(game, true)}
                                            className={`relative overflow-hidden ${isLocked ? 'cursor-not-allowed' : 'active:scale-95 transition-transform'}`}
                                            style={{ width: '130px', height: '195px', borderRadius: '6px', boxShadow: 'inset 0 3px 0 rgba(255,240,100,0.9), inset 0 -3px 0 rgba(120,60,0,0.8), inset 3px 0 0 rgba(255,200,50,0.3), inset -3px 0 0 rgba(120,60,0,0.4), 0 8px 24px rgba(0,0,0,0.7)', filter: isLocked ? 'brightness(0.55)' : undefined }}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-br ${game.color}`}></div>
                                            {game.coverImage && (
                                                <img src={game.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 1, objectPosition: 'center bottom' }} />
                                            )}
                                            <div className="absolute inset-0 z-10 select-none">
                                                {!game.coverImage && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        {THEME_PNG[game.theme] ? (
                                                            <img src={THEME_PNG[game.theme]} alt="" style={{ width: '6.5rem', height: '6.5rem', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.9))' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '6rem', lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.9))' }}>{icon}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10" style={{ borderRadius: '16px' }}></div>
                                            {isLocked && (
                                                <img src="/ui/lock.png" alt="" className="absolute z-30 pointer-events-none select-none"
                                                    style={{ top: 6, right: 6, width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.95))' }} />
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* ── Normal lobby — horizontal scroll grid ── */
                        <div
                            ref={scrollRef}
                            className="grid gap-x-2 gap-y-0 auto-cols-max pt-1 pb-1 overflow-x-auto no-scrollbar snap-x items-start"
                            style={{
                                gridTemplateRows: 'repeat(2, auto)',
                                gridAutoFlow: 'column',
                                paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 2.25rem)',
                                paddingRight: '0.75rem',
                            }}
                        >
                            {/* ── Promo card 1: Mission Pass banner ── */}
                            <button
                                onClick={onOpenBattlePass}
                                className="row-span-2 relative overflow-hidden snap-center active:scale-95 transition-transform shrink-0"
                                style={{ width: 116, alignSelf: 'stretch', borderRadius: 16, boxShadow: '0 6px 18px rgba(0,0,0,0.6)' }}>
                                <img src="/lobby_mission.png" alt="Mission Pass" className="absolute inset-0 w-full h-full" style={{ objectFit: 'cover', borderRadius: 16 }} />
                            </button>

                            {/* ── Promo card 2: VIP Lounge banner ── */}
                            <button
                                onClick={onOpenVipLounge}
                                className="row-span-2 relative overflow-hidden snap-center active:scale-95 transition-transform shrink-0"
                                style={{ width: 116, alignSelf: 'stretch', borderRadius: 16, boxShadow: '0 6px 18px rgba(0,0,0,0.6)' }}>
                                <img src="/lobby_vip.png" alt="VIP Lounge" className="absolute inset-0 w-full h-full" style={{ objectFit: 'cover', borderRadius: 16 }} />
                            </button>

                            {GAMES_CONFIG.map((game, idx) => {
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
                                else if (game.theme === 'PETS') icon = '🦄';
                                else if (game.theme === 'MMORPG') icon = '⚔️';
                                const unlockLevel = getUnlockLevel(idx);
                                const isLocked = playerLevel < unlockLevel;
                                const isNew = !isLocked && newSlotIds.includes(game.id);
                                return (
                                    /* Wrapper is the grid item — jackpot label in normal flow so row height includes it */
                                    <div
                                        key={game.id}
                                        className="row-span-1 snap-center flex flex-col items-center"
                                        style={{ gap: 3 }}
                                    >
                                        {/* Jackpot label — normal flow, contributes to grid row height */}
                                        <span style={{ fontSize:'11px', fontWeight:900, color:'#f3e8ff', whiteSpace:'nowrap', lineHeight:1, background:'rgba(10,2,30,0.9)', border:'1.5px solid #7c3aed', borderRadius:'4px', padding:'2px 6px' }}>
                                            {formatK(jackpotTotals[idx] ?? 0)}
                                        </span>
                                        <button
                                            onClick={() => onSelectGame(game, false)}
                                            className={`relative group w-[90px] h-[90px] md:w-[106px] md:h-[106px] ${isLocked ? 'cursor-not-allowed' : ''}`}
                                            style={{ borderRadius: 18, boxShadow: isNew ? 'inset 0 3px 0 rgba(220,170,255,0.9), inset 0 -3px 0 rgba(50,0,120,0.8), 0 0 0 2px #4ade80, 0 0 14px rgba(74,222,128,0.55), 0 6px 18px rgba(0,0,0,0.6)' : 'inset 0 3px 0 rgba(220,170,255,0.9), inset 0 -3px 0 rgba(50,0,120,0.8), inset 3px 0 0 rgba(180,120,255,0.3), inset -3px 0 0 rgba(50,0,120,0.4), 0 6px 18px rgba(0,0,0,0.6)', filter: isLocked ? 'brightness(0.55)' : undefined }}
                                        >
                                            <div className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${game.color} transition-opacity`} style={{ borderRadius: 14 }}></div>
                                            {game.coverImage && (
                                                <img src={game.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 1, borderRadius: 14, objectPosition: 'center' }} />
                                            )}
                                            <div className="absolute inset-0 overflow-hidden z-10 select-none" style={{ borderRadius: 14 }}>
                                                {!game.coverImage && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        {THEME_PNG[game.theme] ? (
                                                            <img src={THEME_PNG[game.theme]} alt="" style={{ width: THEME_ICON_SIZE[game.theme] ?? '4.5rem', height: THEME_ICON_SIZE[game.theme] ?? '4.5rem', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '4rem', lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}>{icon}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 overflow-hidden bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10" style={{ borderRadius: 14 }}></div>
                                            {isLocked && (
                                                <img src="/ui/lock.png" alt="" className="absolute z-30 pointer-events-none select-none"
                                                    style={{ top: 4, right: 4, width: 22, height: 22, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.95))' }} />
                                            )}
                                            {isNew && (
                                                <div className="absolute top-1.5 right-1.5 z-30 font-black text-black rounded-md px-1.5 py-0.5"
                                                    style={{ fontSize: 8, background: '#4ade80', letterSpacing: '0.06em', lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                                                    NEW
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                            <div className="w-8"></div>
                        </div>
                    )}
                </div>{/* end slot grid wrapper */}
            </div>

            {/* Bottom bar — centered floating platform, icons protrude above */}
            {(() => {
                const iconBtn = (locked: boolean) =>
                    `relative flex flex-col items-center gap-0.5 px-2 md:px-2.5 active:scale-95 transition-transform${locked ? ' brightness-[0.55] cursor-not-allowed' : ''}`;
                const sep = <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.18)', flexShrink: 0, alignSelf: 'flex-end', marginBottom: '14px' }} />;
                const isGolden = isVip;
                const barBg = isGolden
                    ? 'linear-gradient(180deg,#ffe85c 0%,#ffc224 30%,#ff9e10 65%,#f57c00 100%)'
                    : 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)';
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
                                    height:'52px',
                                    borderRadius:'28px 28px 0 0',
                                    background: barBg,
                                    border: `1.5px solid ${borderCol}`,
                                    borderBottom: 'none',
                                    boxShadow: isGolden ? barGlow : `${barGlow}, 0 -16px 60px rgba(0,0,0,0.98), 0 -6px 24px rgba(0,0,0,0.95), 0 -2px 8px rgba(0,0,0,1)`,
                                    zIndex: -1,
                                }}>
                                <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height:'45%', borderRadius:'18px 18px 0 0', background:'linear-gradient(180deg,rgba(255,255,255,0.25),transparent)' }}></div>
                                <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height:'35%', background:'linear-gradient(0deg,rgba(0,0,0,0.38),transparent)' }}></div>
                            </div>

                            {/* Cards — utmost left */}
                            <button onClick={!isCardsLocked ? onOpenCollection : undefined} className={iconBtn(isCardsLocked)}>

                                <div className="relative">
                                    <img src="/ui/cards_new.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {((packCredits ?? 0) + (premiumPackCredits ?? 0)) > 0 && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{((packCredits ?? 0) + (premiumPackCredits ?? 0)) > 99 ? '99+' : (packCredits ?? 0) + (premiumPackCredits ?? 0)}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none -mt-2">Cards</span>
                            </button>

                            {sep}

                            {/* Ranking */}
                            <button onClick={!isRankingLocked ? onOpenRanking : undefined} className={iconBtn(isRankingLocked)}>

                                <div className="relative leading-none">
                                    <img src="/ui/high_roller.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none -mt-2">Ranking</span>
                            </button>

                            {sep}

                            {/* Mini Games (Wild + Dice combined) */}
                            <button onClick={!isQuestLocked ? onOpenMiniGames : undefined} className={iconBtn(isQuestLocked)}>
                                <div className="relative leading-none">
                                    <img src="/minigameslobbyicon.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {!isQuestLocked && (wildCredits + diceCredits) > 0 && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{wildCredits + diceCredits}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none -mt-2">Mini</span>
                            </button>

                            {sep}

                            {/* Quest Path */}
                            <button onClick={onOpenQuestPath} className={iconBtn(false)}>
                                <div className="relative leading-none">
                                    <img src="/questlobbyicon.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none -mt-2">Quest</span>
                            </button>

                            {sep}

                            {/* FREE COINS — center */}
                            <button onClick={onClaimBonus} className={iconBtn(false)}>
                                <div className="relative leading-none">
                                    <img
                                        src="/ui/collect.png"
                                        alt=""
                                        style={{ width: 72, height: 72, objectFit: 'contain' }}
                                        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
                                    />
                                    {(readyTimers > 0 || isJackpotReady) && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{readyTimers + (isJackpotReady ? 1 : 0)}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none -mt-2">Collect</span>
                            </button>

                            {sep}

                            {/* Pass */}
                            <button onClick={!isPassLocked ? onOpenBattlePass : undefined} className={iconBtn(isPassLocked)}>

                                <div className="relative leading-none">
                                    <img src="/ui/pass.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {totalMissionNotifs > 0 && !isPassLocked && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{totalMissionNotifs}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none -mt-2">Pass</span>
                            </button>

                            {sep}

                            <button onClick={!isMissionsLocked ? onOpenMissions : undefined} className={iconBtn(isMissionsLocked)}>

                                <div className="relative">
                                    <img src="/ui/missions_new.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {missionsNotifs > 0 && !isMissionsLocked && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{missionsNotifs > 99 ? '99+' : missionsNotifs}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none -mt-2">Missions</span>
                            </button>

                            {sep}

                            <button onClick={onOpenInbox} className={iconBtn(false)}>
                                <div className="relative">
                                    <img src="/ui/inbox.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {(inboxCount ?? 0) > 0 && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{(inboxCount ?? 0) > 99 ? '99+' : inboxCount}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none -mt-2">Inbox</span>
                            </button>

                            {sep}

                            {/* VIP LOUNGE */}
                            <button onClick={onOpenVipLounge} className={iconBtn(false)}>
                                <img src="/ui/VIP.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none -mt-2">VIP</span>
                            </button>

                        </div>
                    </div>
                );
            })()}
        </div>
    );
};