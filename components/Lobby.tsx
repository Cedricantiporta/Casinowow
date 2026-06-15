

import React, { useState, useEffect, useRef } from 'react';
import { GAMES_CONFIG, formatCommaNumber, formatTime, formatK } from '../constants';
import { GameConfig, QuestState, MissionState } from '../types';
import { jackpotService, SLOT_VARS } from '../services/jackpotService';

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

              <div className="flex-1 relative flex items-center justify-center p-0.5 pt-2 pb-8 md:pb-9">

                    {isHighLimit ? (
                        /* ── High Roller lobby — single horizontal scroll row ── */
                        <div className="flex items-center gap-3 px-3 overflow-x-auto no-scrollbar w-full h-full">
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
                                    <div key={game.id} className="flex flex-col items-center gap-1.5 shrink-0">
                                        {/* Jackpot counter */}
                                        <div style={{ width: '120px', background: 'rgba(10,4,0,0.95)', border: '2.5px solid #f59e0b', borderRadius: '8px', padding: '4px 6px', textAlign: 'center', boxShadow: '0 0 12px rgba(245,158,11,0.6)' }}>
                                            <div style={{ fontSize: '7px', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1, marginBottom: '2px' }}>JACKPOT</div>
                                            <div style={{ fontSize: '13px', fontWeight: 900, color: '#fff8c0', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 0 8px rgba(245,158,11,0.9)' }}>{formatK(hrJackpot)}</div>
                                        </div>
                                        {/* Card-shaped slot */}
                                        <button
                                            onClick={() => onSelectGame(game, false)}
                                            className={`relative overflow-hidden ${isLocked ? 'cursor-not-allowed' : 'active:scale-95 transition-transform'}`}
                                            style={{ width: '120px', height: '178px', borderRadius: '16px', boxShadow: '0 0 18px rgba(245,158,11,0.35), inset 0 2px 0 rgba(255,220,80,0.7), 0 8px 24px rgba(0,0,0,0.7)', border: '2.5px solid rgba(245,158,11,0.55)' }}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-br ${game.color}${isLocked ? ' blur-[1.5px]' : ''}`}></div>
                                            {game.coverImage && (
                                                <img src={game.coverImage} alt="" className={`absolute inset-0 w-full h-full object-contain${isLocked ? ' blur-[1.5px]' : ''}`} style={{ zIndex: 1 }} />
                                            )}
                                            <div className={`absolute inset-0 z-10 select-none${isLocked ? ' blur-[1.5px]' : ''}`}>
                                                {!game.coverImage && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span style={{ fontSize: '4rem', lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}>{icon}</span>
                                                    </div>
                                                )}
                                                {!game.coverImage && (
                                                    <div className="absolute bottom-0 left-0 right-0 pb-2 px-1 text-center">
                                                        <h3 className={`text-[11px] font-black uppercase tracking-wide leading-tight line-clamp-2 ${getFontClass(game.theme)} ${titleStyle}`}
                                                            style={{ WebkitTextStroke: '1px rgba(0,0,0,0.95)', paintOrder: 'stroke fill' }}>
                                                            {game.name}
                                                        </h3>
                                                    </div>
                                                )}
                                            </div>
                                            {isLocked && (
                                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
                                                    <span className="text-3xl leading-none grayscale drop-shadow-[0_1px_6px_rgba(0,0,0,1)]">🔒</span>
                                                    <span className="text-white font-black text-[10px] mt-1 uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">Lvl {unlockLevel}</span>
                                                </div>
                                            )}
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
                                        className={`row-span-1 relative group w-[85px] h-[85px] md:w-[105px] md:h-[105px] rounded-xl overflow-visible snap-center ${isLocked ? 'cursor-not-allowed' : ''}`}
                                        style={{ boxShadow: 'inset 0 2px 0 rgba(210,150,255,0.85), 0 0 12px rgba(160,80,255,0.28), 0 6px 18px rgba(0,0,0,0.55)' }}
                                    >
                                        <div className="absolute -top-[22px] left-0 right-0 z-30 pointer-events-none flex items-center justify-center">
                                            <span style={{ fontSize:'11px', fontWeight:900, color:'#f3e8ff', whiteSpace:'nowrap', lineHeight:1, background:'rgba(10,2,30,0.9)', border:'2px solid #7c3aed', borderRadius:'999px', padding:'3px 8px', boxShadow:'0 0 8px rgba(124,58,237,0.6)' }}>
                                                {formatK(jackpotTotals[idx] ?? 0)}
                                            </span>
                                        </div>
                                        <div className={`absolute inset-0 rounded-xl overflow-hidden bg-gradient-to-br ${game.color} transition-opacity${isLocked ? ' blur-[1.5px]' : ''}`}></div>
                                        {game.coverImage && (
                                            <img src={game.coverImage} alt="" className={`absolute inset-0 w-full h-full object-contain rounded-xl${isLocked ? ' blur-[1.5px]' : ''}`} style={{ zIndex: 1 }} />
                                        )}
                                        <div className={`absolute inset-0 rounded-xl overflow-hidden z-10 select-none${isLocked ? ' blur-[1.5px]' : ''}`}>
                                            {!game.coverImage && (
                                                <div className="absolute inset-0 flex items-start justify-center pt-2">
                                                    <span className="text-[4rem] md:text-[4.5rem] drop-shadow-2xl filter leading-none">{icon}</span>
                                                </div>
                                            )}
                                            {!game.coverImage && (
                                                <div className="absolute bottom-0 left-0 right-0 pb-1 px-1 text-center">
                                                    <h3 className={`text-[13px] md:text-[16px] font-black uppercase tracking-wide leading-tight line-clamp-2 ${getFontClass(game.theme)} ${titleStyle}`}
                                                        style={{ WebkitTextStroke:'1.5px rgba(0,0,0,0.95)', paintOrder:'stroke fill' }}>
                                                        {game.name}
                                                    </h3>
                                                </div>
                                            )}
                                        </div>
                                        {isLocked && (
                                            <div className="absolute inset-0 rounded-xl z-20 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-4xl leading-none grayscale drop-shadow-[0_1px_6px_rgba(0,0,0,1)]">🔒</span>
                                                <span className="text-white font-black text-[11px] mt-1 uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,1)]">Lvl {unlockLevel}</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 rounded-xl overflow-hidden bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10"></div>
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
                    `relative flex flex-col items-center gap-0.5 px-2 md:px-2.5 active:scale-95 transition-transform${locked ? ' [&>*:not(.lock-badge)]:blur-[1.5px]' : ''}`;
                const lockBadge = (unlockLevel: number) => (
                    <div className="lock-badge absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                        <span className="text-2xl leading-none grayscale drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">🔒</span>
                        <span className="text-white font-black text-[10px] mt-0.5 uppercase leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">Lvl {unlockLevel}</span>
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

                            {/* Cards — utmost left */}
                            <button onClick={!isCardsLocked ? onOpenCollection : undefined} className={iconBtn(isCardsLocked)}>
                                {isCardsLocked && lockBadge(30)}
                                <div className="relative">
                                    <img src="/ui/cards.png" alt="" className="w-9 h-9 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {((packCredits ?? 0) + (premiumPackCredits ?? 0)) > 0 && (
                                        <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center px-0.5 z-10">
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{((packCredits ?? 0) + (premiumPackCredits ?? 0)) > 99 ? '99+' : (packCredits ?? 0) + (premiumPackCredits ?? 0)}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Cards</span>
                            </button>

                            {/* Piggy */}
                            <button onClick={!isPiggyLocked ? onOpenPiggyBank : undefined} className={iconBtn(isPiggyLocked)}>
                                {isPiggyLocked && lockBadge(5)}
                                <div className="relative leading-none">
                                    <img src="/ui/piggy.png" alt="" className="w-9 h-9 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {piggyFull && (
                                        <div className="absolute -top-1 -right-2 text-white font-black text-[7px] px-1 py-0.5 rounded-full leading-none whitespace-nowrap"
                                            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>FULL</div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Piggy</span>
                            </button>

                            {/* Mini Games (Wild + Dice + Coin Flip) */}
                            <button onClick={!isQuestLocked ? onOpenMiniGames : undefined} className={iconBtn(isQuestLocked)}>
                                {isQuestLocked && lockBadge(20)}
                                <div className="relative leading-none">
                                    <img src="/ui/games.png" alt="" className="w-9 h-9 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {!isQuestLocked && (wildCredits + diceCredits) > 0 && (
                                        <div className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-white font-black leading-none text-[8px]"
                                            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>
                                            {wildCredits + diceCredits}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Games</span>
                            </button>

                            {/* Pass */}
                            <button onClick={!isMissionsLocked ? onOpenBattlePass : undefined} className={iconBtn(isMissionsLocked)}>
                                {isMissionsLocked && lockBadge(10)}
                                <div className="relative leading-none">
                                    <img src="/ui/pass.png" alt="" className="w-9 h-9 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {totalMissionNotifs > 0 && !isMissionsLocked && (
                                        <div className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[9px] text-white font-black"
                                            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>
                                            {totalMissionNotifs}
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Pass</span>
                            </button>

                            {/* FREE COINS — center */}
                            <button onClick={onClaimBonus} className="flex flex-col items-center px-1.5 active:scale-95 transition-transform">
                                <div className="relative" style={{
                                    width: '68px', height: '68px', borderRadius: '50%',
                                    background: isReadyToCollect
                                        ? 'radial-gradient(circle at 36% 28%,#fff7c0,#ffd027 40%,#f29400 70%,#b85f00)'
                                        : 'radial-gradient(circle at 36% 28%,#c0c0c0,#888 40%,#555 70%,#333)',
                                    border: isReadyToCollect ? '3px solid #f0a000' : '3px solid #666',
                                    boxShadow: isReadyToCollect
                                        ? 'inset 0 3px 6px rgba(255,255,255,0.65),inset 0 -3px 6px rgba(140,70,0,0.5),0 5px 0 rgba(120,60,0,0.7),0 8px 16px rgba(0,0,0,0.5)'
                                        : 'inset 0 2px 4px rgba(255,255,255,0.3),0 4px 0 rgba(0,0,0,0.5)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <span style={{ fontSize:'12px', fontWeight:900, lineHeight:1, color: isReadyToCollect ? '#7c3500' : '#aaa', textTransform:'uppercase' }}>FREE</span>
                                    <span style={{ fontSize:'14px', fontWeight:900, lineHeight:1, color: isReadyToCollect ? '#7c3500' : '#aaa', textTransform:'uppercase' }}>COINS</span>
                                    <div style={{
                                        position:'absolute', bottom:'-10px', left:'50%', transform:'translateX(-50%)',
                                        background: isReadyToCollect ? 'linear-gradient(180deg,#3a9900,#1e6600)' : '#444',
                                        color:'white', fontSize:'7px', fontWeight:900,
                                        padding:'2px 9px', borderRadius:'8px', whiteSpace:'nowrap', textTransform:'uppercase',
                                        border:'1px solid rgba(255,255,255,0.25)',
                                        boxShadow: isReadyToCollect ? '0 2px 0 rgba(0,0,0,0.4)' : 'none',
                                        letterSpacing:'0.5px',
                                    }}>
                                        {isReadyToCollect ? 'COLLECT' : formatTime(timeLeft)}
                                    </div>
                                    {isReadyToCollect && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-yellow-400 flex items-center justify-center text-[11px] font-black text-white z-10" style={{ WebkitTextStroke:'0.5px #000', paintOrder:'stroke fill' }}>!</div>}
                                </div>
                                <div style={{ height:'16px' }}></div>
                            </button>

                            <button onClick={!isMissionsLocked ? onOpenMissions : undefined} className={iconBtn(isMissionsLocked)}>
                                {isMissionsLocked && lockBadge(10)}
                                <div className="relative">
                                    <img src="/ui/missions.png" alt="" className="w-9 h-9 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {missionsReady > 0 && !isMissionsLocked && (
                                        <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center px-0.5 z-10">
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{missionsReady > 99 ? '99+' : missionsReady}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Missions</span>
                            </button>

                            <button onClick={onOpenInbox} className={iconBtn(false)}>
                                <div className="relative">
                                    <img src="/ui/inbox.png" alt="" className="w-9 h-9 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                    {(inboxCount ?? 0) > 0 && (
                                        <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center px-0.5 z-10">
                                            <span className="font-black text-white leading-none" style={{ fontSize: '8px' }}>{(inboxCount ?? 0) > 99 ? '99+' : inboxCount}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">Inbox</span>
                            </button>

                            {/* HIGH ROLLER — icon flips to "back to lobby" when in HR */}
                            <button onClick={!isHighRollerLocked ? onOpenHighRoller : undefined} className={iconBtn(isHighRollerLocked)}>
                                {isHighRollerLocked && lockBadge(35)}
                                <img src={isHighLimit ? undefined : '/ui/highroller.png'} alt="" className="w-9 h-9 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" style={{ display: isHighLimit ? 'none' : undefined }} />
                                {isHighLimit && <span className="text-[2.4rem] md:text-[2.7rem] leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">🏠</span>}
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">
                                    {isHighLimit ? 'Lobby' : 'High Roller'}
                                </span>
                            </button>

                            {/* VIP LOUNGE */}
                            <button onClick={onOpenVipLounge} className={iconBtn(false)}>
                                <img src="/ui/VIP.png" alt="" className="w-9 h-9 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
                                <span className="text-[8px] font-black text-white/90 uppercase tracking-wider leading-none">VIP</span>
                            </button>

                        </div>
                    </div>
                );
            })()}
        </div>
    );
};