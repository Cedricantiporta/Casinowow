

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
    onOpenWildQuest?: () => void;
    onOpenDiceQuest?: () => void;
    onOpenMiniGames?: () => void;
    onOpenQuest?: () => void;
    onOpenMissions: () => void;
    onOpenBattlePass: () => void;
    onClaimBonus: () => void;
    onOpenCollection: () => void;
    onOpenPiggyBank: () => void;
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
}

export const Lobby: React.FC<LobbyProps> = ({
    onSelectGame,
    onOpenWildQuest,
    onOpenDiceQuest,
    onOpenMiniGames,
    onOpenMissions,
    onOpenBattlePass,
    onClaimBonus,
    onOpenCollection,
    onOpenPiggyBank,
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
    premiumPackCredits
}) => {
    
    const [timeLeft, setTimeLeft] = useState(0);
    const [jackpotTotals, setJackpotTotals] = useState<number[]>(() =>
        GAMES_CONFIG.map((_, idx) => Math.floor((currentBet ?? 0) * 100 * (SLOT_VARS[idx % SLOT_VARS.length] || 1) * (isHighLimit ? 10 : 1)))
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
            GAMES_CONFIG.map((_, idx) => Math.floor((currentBet ?? 0) * 100 * (SLOT_VARS[idx % SLOT_VARS.length] || 1) * (isHighLimit ? 10 : 1)))
        );
    }, [currentBet, isHighLimit]);

    useEffect(() => {
        return jackpotService.subscribe(() => {
            setJackpotTotals(GAMES_CONFIG.map((_, idx) => Math.floor((currentBet ?? 0) * 100 * (SLOT_VARS[idx % SLOT_VARS.length] || 1) * (isHighLimit ? 10 : 1))));
        });
    }, [currentBet, isHighLimit]);

    const isReadyToCollect = timeLeft === 0;
    const visibleDailyMissions = missionState.activeMissions.filter(m => m.frequency === 'DAILY').slice(0, 4);
    const missionsReady = visibleDailyMissions.filter(m => m.completed && !m.claimed).length;
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
    const isHighRollerLocked = playerLevel < 35;

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

              <div className="flex-1 relative flex items-center justify-start p-0.5 pt-0 pb-8 md:pb-9" style={{ boxShadow: 'inset 0 -40px 60px rgba(0,0,0,0.7), inset 0 -80px 80px rgba(0,0,0,0.4)', border: isVip ? '1px solid rgba(200,150,50,0.35)' : '1px solid rgba(140,60,255,0.3)', borderRadius: 14 }}>

                    {isHighLimit ? (
                        /* ── High Roller lobby — single horizontal scroll row ── */
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar w-full h-full" style={{ paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 0.75rem)', paddingRight: '0.75rem' }}>
                            {GAMES_CONFIG.slice(0, 6).map((game, idx) => {
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
                                        {/* Jackpot counter */}
                                        <div style={{ width: '100px', background: 'rgba(10,4,0,0.95)', border: '2px solid #f59e0b', borderRadius: '7px', padding: '3px 5px', textAlign: 'center', boxShadow: '0 0 10px rgba(245,158,11,0.5)', marginBottom: '-8px' }}>
                                            <div style={{ fontSize: '6px', fontWeight: 900, color: '#f59e0b', letterSpacing: '1px', lineHeight: 1, marginBottom: '2px' }}>Jackpot</div>
                                            <div style={{ fontSize: '11px', fontWeight: 900, color: '#fff8c0', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(245,158,11,0.9)' }}>{formatK(hrJackpot)}</div>
                                        </div>
                                        {/* Card-shaped slot */}
                                        <button
                                            onClick={() => onSelectGame(game, true)}
                                            className={`relative overflow-hidden ${isLocked ? 'cursor-not-allowed' : 'active:scale-95 transition-transform'}`}
                                            style={{ width: '108px', height: '162px', borderRadius: '6px', boxShadow: 'inset 0 3px 0 rgba(255,240,100,0.9), inset 0 -3px 0 rgba(120,60,0,0.8), inset 3px 0 0 rgba(255,200,50,0.3), inset -3px 0 0 rgba(120,60,0,0.4), 0 8px 24px rgba(0,0,0,0.7)', filter: isLocked ? 'brightness(0.55)' : undefined }}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-br ${game.color}`}></div>
                                            {game.coverImage && (
                                                <img src={game.coverImage} alt="" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: 1 }} />
                                            )}
                                            <div className="absolute inset-0 z-10 select-none">
                                                {!game.coverImage && (
                                                    <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '1.5rem' }}>
                                                        {THEME_PNG[game.theme] ? (
                                                            <img src={THEME_PNG[game.theme]} alt="" style={{ width: '6.5rem', height: '6.5rem', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.9))' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '6rem', lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.9))' }}>{icon}</span>
                                                        )}
                                                    </div>
                                                )}
                                                {!game.coverImage && (
                                                    <div className="absolute bottom-0 left-0 right-0 pb-2 px-1 text-center">
                                                        <h3 className={`text-[11px] font-black tracking-wide leading-tight line-clamp-2 ${getFontClass(game.theme)} ${titleStyle}`}
                                                            style={{ WebkitTextStroke: '1px rgba(0,0,0,0.95)', paintOrder: 'stroke fill' }}>
                                                            {game.name}
                                                        </h3>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10" style={{ borderRadius: '16px' }}></div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* ── Normal lobby — horizontal scroll grid ── */
                        <div
                            ref={scrollRef}
                            className="grid gap-x-2 gap-y-6 auto-cols-max pt-5 pb-4 overflow-x-auto no-scrollbar snap-x items-start"
                            style={{
                                gridTemplateRows: 'repeat(2, auto)',
                                gridAutoFlow: 'column',
                                paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 2.25rem)',
                                paddingRight: '0.75rem',
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
                                        className={`row-span-1 relative group w-[76px] h-[76px] md:w-[96px] md:h-[96px] overflow-visible snap-center ${isLocked ? 'cursor-not-allowed' : ''}`}
                                        style={{ borderRadius: 16, boxShadow: 'inset 0 3px 0 rgba(220,170,255,0.9), inset 0 -3px 0 rgba(50,0,120,0.8), inset 3px 0 0 rgba(180,120,255,0.3), inset -3px 0 0 rgba(50,0,120,0.4), 0 6px 18px rgba(0,0,0,0.6)', filter: isLocked ? 'brightness(0.55)' : undefined }}
                                    >
                                        <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none flex items-center justify-center" style={{ transform: 'translateY(-100%)' }}>
                                            <span style={{ fontSize:'11px', fontWeight:900, color:'#f3e8ff', whiteSpace:'nowrap', lineHeight:1, background:'rgba(10,2,30,0.9)', border:'1.5px solid #7c3aed', borderRadius:'4px', padding:'2px 6px' }}>
                                                {formatK(jackpotTotals[idx] ?? 0)}
                                            </span>
                                        </div>
                                        <div className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${game.color} transition-opacity`} style={{ borderRadius: 14 }}></div>
                                        {game.coverImage && (
                                            <img src={game.coverImage} alt="" className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: 1, borderRadius: 14 }} />
                                        )}
                                        <div className="absolute inset-0 overflow-hidden z-10 select-none" style={{ borderRadius: 14 }}>
                                            {!game.coverImage && (
                                                <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '1.2rem' }}>
                                                    {THEME_PNG[game.theme] ? (
                                                        <img src={THEME_PNG[game.theme]} alt="" style={{ width: THEME_ICON_SIZE[game.theme] ?? '4.5rem', height: THEME_ICON_SIZE[game.theme] ?? '4.5rem', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '4rem', lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}>{icon}</span>
                                                    )}
                                                </div>
                                            )}
                                            {!game.coverImage && (
                                                <div className="absolute bottom-0 left-0 right-0 pb-1 px-1 text-center">
                                                    <h3 className={`text-[13px] md:text-[16px] font-black tracking-wide leading-tight line-clamp-2 ${getFontClass(game.theme)} ${titleStyle}`}
                                                        style={{ WebkitTextStroke:'1.5px rgba(0,0,0,0.95)', paintOrder:'stroke fill' }}>
                                                        {game.name}
                                                    </h3>
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute inset-0 overflow-hidden bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10" style={{ borderRadius: 14 }}></div>
                                    </button>
                                );
                            })}
                            <div className="w-8"></div>
                        </div>
                    )}
            </div>
 
            {/* Bottom bar — centered floating platform, icons protrude above */}
            {(() => {
                const iconBtn = (locked: boolean) =>
                    `relative flex flex-col items-center gap-0.5 px-2 md:px-2.5 active:scale-95 transition-transform${locked ? ' brightness-[0.55] cursor-not-allowed' : ''}`;
                const sep = <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.18)', flexShrink: 0, alignSelf: 'flex-end', marginBottom: '14px' }} />;
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
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none">Cards</span>
                            </button>

                            {sep}

                            {/* Piggy */}
                            <button onClick={!isPiggyLocked ? onOpenPiggyBank : undefined} className={iconBtn(isPiggyLocked)}>

                                <div className="relative leading-none">
                                    <img src="/ui/piggy.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {piggyFull && (
                                        <div className="absolute top-1 right-1 text-white font-black text-[7px] px-1 py-0.5 rounded-full leading-none whitespace-nowrap"
                                            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>Full</div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none">Piggy</span>
                            </button>

                            {sep}

                            {/* Wild Quest */}
                            <button onClick={!isQuestLocked ? onOpenWildQuest : undefined} className={iconBtn(isQuestLocked)}>

                                <div className="relative leading-none">
                                    <img src="/ui/mine_new.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {!isQuestLocked && wildCredits > 0 && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{wildCredits}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none">Wild</span>
                            </button>

                            {sep}

                            {/* Dice Quest */}
                            <button onClick={!isQuestLocked ? onOpenDiceQuest : undefined} className={iconBtn(isQuestLocked)}>

                                <div className="relative leading-none">
                                    <img src="/ui/dice.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {!isQuestLocked && diceCredits > 0 && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{diceCredits}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none">Dice</span>
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
                                    {isReadyToCollect && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>1</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none">Collect</span>
                            </button>

                            {sep}

                            {/* Pass */}
                            <button onClick={!isMissionsLocked ? onOpenBattlePass : undefined} className={iconBtn(isMissionsLocked)}>

                                <div className="relative leading-none">
                                    <img src="/ui/pass.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {totalMissionNotifs > 0 && !isMissionsLocked && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{totalMissionNotifs}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none">Pass</span>
                            </button>

                            {sep}

                            <button onClick={!isMissionsLocked ? onOpenMissions : undefined} className={iconBtn(isMissionsLocked)}>

                                <div className="relative">
                                    <img src="/ui/missions_new.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {missionsReady > 0 && !isMissionsLocked && (
                                        <div className="absolute top-1 right-1 min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5 z-10"
                                            style={{ background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)', boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)', border: '1.5px solid rgba(255,120,120,0.7)' }}>
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{missionsReady > 99 ? '99+' : missionsReady}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none">Missions</span>
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
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none">Inbox</span>
                            </button>

                            {sep}

                            {/* VIP LOUNGE */}
                            <button onClick={onOpenVipLounge} className={iconBtn(false)}>
                                <img src="/ui/VIP.png" alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                <span className="text-[8px] font-black text-white/90 tracking-wider leading-none">VIP</span>
                            </button>

                        </div>
                    </div>
                );
            })()}
        </div>
    );
};