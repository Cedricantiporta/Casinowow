import React, { useState, useEffect, useRef } from 'react';
import { Mission, MissionState, PassReward, MissionFrequency } from '../types';
import { formatNumber, formatCommaNumber, formatK, formatKShort, SCALE_COIN_REWARD } from '../constants';
import { ViperBorder } from './ViperBorder';

interface MissionPassModalProps {
    isOpen: boolean;
    initialView: 'MISSIONS' | 'PASS';
    onClose: () => void;
    missionState: MissionState;
    diamonds: number;
    balance?: number;
    onClaimReward: (reward: PassReward) => void;
    onFinishMission: (mission: Mission) => void;
    onClaimMissionReward: (mission: Mission) => void;
    onBuyPass: () => void;
    onBuyLevel: () => void;
    onClaimAll: () => void;
    playerLevel: number;
    maxBet?: number;
    onOpenGemShop?: () => void;
    onOpenPremium?: () => void;
}

export const MissionPassModal: React.FC<MissionPassModalProps> = ({
    isOpen,
    initialView,
    onClose,
    missionState,
    diamonds,
    balance = 0,
    onClaimReward,
    onFinishMission,
    onClaimMissionReward,
    onBuyPass,
    onBuyLevel,
    onClaimAll,
    playerLevel,
    maxBet = 10000,
    onOpenGemShop,
    onOpenPremium,
}) => {
    const [view, setView] = useState<'MISSIONS' | 'PASS'>('MISSIONS');
    const [activeTab, setActiveTab] = useState<MissionFrequency>('DAILY');
    const [showPremiumInfo, setShowPremiumInfo] = useState(false);
    const rewardsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) setView(initialView);
        else setShowPremiumInfo(false);
    }, [isOpen, initialView]);

    useEffect(() => {
        if (!isOpen || view !== 'PASS') return;
        const el = rewardsContainerRef.current;
        if (!el) return;
        const handler = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY; };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [isOpen, view]);

    if (!isOpen) return null;

    const currentMissions = missionState.activeMissions.filter(m => m.frequency === 'DAILY').slice(0, 4);
    const levels = Array.from(new Set(missionState.passRewards.map(r => r.level))).sort((a: number, b: number) => a - b);
    const premiumLevelBonus = missionState.isPremium ? 10 : 0;
    const rewardsToClaimCount = missionState.passRewards.filter(r =>
        r.level <= missionState.passLevel + premiumLevelBonus &&
        !r.claimed &&
        (r.tier === 'FREE' || (r.tier === 'PREMIUM' && missionState.isPremium))
    ).length;

    const diamondCostToSkip = (xp: number) => Math.max(1, Math.ceil(xp / 5));
    const isXpBoosted = missionState.passBoostMultiplier > 1;

    const handleScroll = (direction: 'LEFT' | 'RIGHT') => {
        rewardsContainerRef.current?.scrollBy({ left: direction === 'LEFT' ? -200 : 200, behavior: 'smooth' });
    };

    const getDisplayValue = (reward: PassReward) => {
        if (reward.type === 'COINS') {
            if (reward.claimed && reward.claimedValue !== undefined) return formatKShort(reward.claimedValue);
            return formatKShort(SCALE_COIN_REWARD(reward.value, playerLevel, maxBet));
        }
        if (reward.type === 'CREDIT_BACK') return `+${reward.value} Cards`;
        return reward.label;
    };

    const renderIcon = (reward: PassReward | undefined, sz = '2.8rem') => {
        if (!reward) return null;
        const style = { width: sz, height: sz, objectFit: 'contain' as const };
        if (reward.type === 'COINS') return <img src="/symbols/coin.png" alt="" style={style} />;
        if (reward.type === 'DIAMONDS') return <img src="/symbols/diamond.png" alt="" style={style} />;
        if (reward.type === 'PICKS' || reward.type === 'DICE_CREDITS') return <img src="/pass-picksdice.png" alt="" style={style} />;
        if (reward.type === 'CREDIT_BACK') return <img src={reward.label.toLowerCase().includes('premium') ? '/card_premium.png' : '/card_normal.png'} alt="" style={{ width: '2rem', height: sz, objectFit: 'contain' as const }} />;
        return <img src="/ui/star.png" alt="" style={style} />;
    };

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-3">
        <div className="w-full max-w-[720px] flex flex-col rounded-3xl overflow-hidden relative"
            style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', height: 'min(96%, 400px)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>

            {showPremiumInfo && (
                <div className="absolute inset-0 z-[10] flex flex-col animate-pop-in overflow-hidden rounded-2xl"
                    style={{ background: 'linear-gradient(160deg,#1a0a00 0%,#3a1800 40%,#0a0000 100%)' }}>
                    <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 relative">
                        <div className="flex-1">
                            <h2 className="font-black text-base tracking-widest leading-none"
                                style={{ background: 'linear-gradient(180deg,#fff8c0,#f0c000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Mission Pass
                            </h2>
                            <p className="text-yellow-200/50 text-[9px] font-bold tracking-wider mt-0.5">Unlock exclusive rewards</p>
                        </div>
                        <div className="round-btn cursor-pointer shrink-0" onClick={() => setShowPremiumInfo(false)}><i className="ti ti-x"></i></div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2.5 px-4 py-3 content-center">
                        {[
                            { icon: '🎁', title: 'Double Rewards',   desc: 'FREE + PREMIUM on every level' },
                            { icon: '⚡', title: '+20 Levels',        desc: 'Instant level boost on purchase' },
                            { icon: '💎', title: 'Exclusive Gems',    desc: 'Extra gems on premium reward tiers' },
                            { icon: '⛏️', title: 'Quest Picks',       desc: 'Bonus picks for Wild & Dice quests' },
                        ].map(p => (
                            <div key={p.title} className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5" style={{ background: 'rgba(255,200,0,0.08)' }}>
                                <span style={{ fontSize: '24px', lineHeight: 1, flexShrink: 0 }}>{p.icon}</span>
                                <div className="min-w-0">
                                    <div className="text-yellow-200 font-black text-[10px] tracking-wide leading-none">{p.title}</div>
                                    <div className="text-yellow-200/50 text-[8px] mt-0.5 leading-snug">{p.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="shrink-0 px-4 pb-3 pt-1 flex flex-col items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); onBuyPass(); setShowPremiumInfo(false); }} className="pill-green">
                            <div className="pill-face" style={{ padding: '8px 20px', fontSize: '12px', background: 'linear-gradient(180deg,#fff8a0,#f0c000 40%,#c08000)', color: '#1c1917', textShadow: 'none' }}>Unlock Premium</div>
                        </button>
                    </div>
                </div>
            )}

            <div className="w-full h-full flex flex-col relative overflow-hidden">
                {/* TOPBAR */}
                <div className="shrink-0 flex items-center gap-1.5 px-3 pt-2 pb-1.5 relative">
                    <div className="rtrack" style={{ flex: 'none', width: 80 }}>
                        <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 18 }}>
                            <div className="rfill" style={{ width: `${Math.min(100, (missionState.passXP / missionState.passXpToNext) * 100)}%` }} />
                        </div>
                        <span className="rnum" style={{ fontSize: 8 }}>Lv.{missionState.passLevel} {missionState.passXP}/{missionState.passXpToNext}</span>
                    </div>
                    <button onClick={() => setView(view === 'MISSIONS' ? 'PASS' : 'MISSIONS')} className="pill-green relative shrink-0">
                        <div className="pill-face" style={{ padding: '3px 10px', fontSize: '9px' }}>{view === 'MISSIONS' ? 'Mission Pass' : 'Daily Missions'}</div>
                        {view === 'MISSIONS' && rewardsToClaimCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white flex items-center justify-center leading-none" style={{ fontSize: 7, fontWeight: 900 }}>{rewardsToClaimCount}</span>
                        )}
                    </button>
                    {missionState.passBoostMultiplier > 1 && missionState.passBoostEndTime > Date.now() && (
                        <span className="font-black text-[9px] px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5"
                            style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                            <i className="ti ti-bolt" style={{ fontSize: '0.7rem' }} />
                            {missionState.passBoostMultiplier}x XP
                        </span>
                    )}
                    <span className="absolute left-0 right-0 text-center text-white font-tanker text-base pointer-events-none">
                        {view === 'MISSIONS' ? 'Daily Missions' : 'Mission Pass'}
                    </span>
                    <div className="flex-1" />
                    <div className="currency-pill flex items-center gap-1 px-2 py-0.5 shrink-0" style={{ background: 'rgba(0,0,0,0.55)', borderRadius: '9999px' }}>
                        <img src="/symbols/diamond.png" alt="" style={{ width: '11px', height: '11px', objectFit: 'contain' }} />
                        <span className="font-black text-[10px] text-white">{diamonds.toLocaleString('en-US')}</span>
                        {onOpenGemShop && <button onClick={() => { onClose(); setTimeout(onOpenGemShop!, 50); }} className="pill-green" style={{ marginLeft: '2px' }}><div className="pill-face" style={{ padding: '1px 6px', fontSize: '8px' }}>Buy</div></button>}
                    </div>
                    <div className="round-btn shrink-0" onClick={onClose}><i className="ti ti-x"></i></div>
                </div>

                {/* MISSIONS VIEW */}
                {view === 'MISSIONS' && (
                    <div className="flex-1 flex items-stretch p-3 gap-3 overflow-hidden">
                        {currentMissions.map((mission) => (
                            <div key={mission.id}
                                className={`${mission.isGolden ? 'tcard-gold' : 'tcard'} flex-1 flex flex-col gap-2 p-3 pb-2 relative overflow-hidden`}>
                                {(mission.isGolden || (mission.stacks && mission.stacks > 0)) && (
                                    <div className="flex items-center justify-start relative z-10 -mb-1">
                                        <div className="flex gap-0.5 items-center">
                                            {Array.from({ length: mission.isGolden ? 1 : 2 }).map((_, idx) => {
                                                const filled = mission.isGolden ? 1 : (mission.stacks || 0);
                                                return <div key={idx} className="w-2 h-2 rounded-full" style={{ background: idx < filled ? (mission.isGolden ? '#fbbf24' : '#a855f7') : 'rgba(255,255,255,0.15)' }} />;
                                            })}
                                        </div>
                                    </div>
                                )}
                                <div className="flex-1 flex items-center justify-center shrink-0 mx-auto relative z-10 min-h-0" style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}>
                                    {(() => {
                                        const sz = { width: '1em', height: '1em', objectFit: 'contain' as const, display: 'inline-block' as const };
                                        if (mission.type === 'LEVEL_UP') return <img src="/mission-levelup.png" alt="" style={sz} />;
                                        if (mission.type === 'SPIN_COUNT' || mission.type === 'MAX_BET_SPIN') return <img src="/mission-spin.png" alt="" style={sz} />;
                                        if (mission.type === 'WIN_COINS' || mission.type === 'BET_COINS' || mission.type === 'BIG_WIN_COUNT') return <img src="/mission-wincoin.png" alt="" style={sz} />;
                                        return <img src="/ui/star.png" alt="" style={sz} />;
                                    })()}
                                </div>
                                <div className="text-white font-black text-[12px] leading-snug text-center flex-1 relative z-10">{mission.description}</div>
                                <div className="relative z-10">
                                    <div className="relative h-5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
                                        <div className="absolute inset-y-0 left-0 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (mission.current / mission.target) * 100)}%`, background: mission.isGolden ? 'linear-gradient(180deg,#fbbf24,#d97706)' : 'linear-gradient(180deg,#60a5fa,#2563eb)' }} />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] font-black leading-none text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                                                {`${formatNumber(mission.current)} / ${formatNumber(mission.target)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-0.5 relative z-10">
                                    <div className="text-center">
                                        <span className={`font-mono text-[11px] font-black ${isXpBoosted || mission.isGolden ? 'text-yellow-300' : 'text-blue-300'}`}>
                                            +{isXpBoosted ? mission.xpReward * missionState.passBoostMultiplier : mission.xpReward} Pass XP
                                        </span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-yellow-300 font-mono text-[11px] font-black">+{formatNumber(mission.coinReward)} Coins</span>
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    {mission.claimed ? (
                                        <button disabled className="pill-green w-full">
                                            <div className="pill-face" style={{ padding: '5px 12px', fontSize: '10px', background: 'linear-gradient(180deg,#3a3a3a,#222,#111)' }}>Done</div>
                                        </button>
                                    ) : mission.completed ? (
                                        <button onClick={() => onClaimMissionReward(mission)} className="pill-green w-full">
                                            <div className="pill-face" style={{ padding: '5px 12px', fontSize: '10px' }}>Claim Reward</div>
                                        </button>
                                    ) : (
                                        <button onClick={() => onFinishMission(mission)} className="pill-green w-full">
                                            <div className="pill-face" style={{ padding: '5px 12px', fontSize: '9px', background: 'linear-gradient(180deg,#38bdf8,#0ea5e9,#0369a1)' }}>
                                                <img src="/symbols/diamond.png" alt="" style={{ width: '0.85em', height: '0.85em', objectFit: 'contain' }} />
                                                Skip {diamondCostToSkip(mission.xpReward)}
                                            </div>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {currentMissions.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center p-4">
                                <span className="text-4xl">🎉</span>
                                <span className="mt-3 text-[12px] text-purple-300 font-bold tracking-widest">All Done!</span>
                            </div>
                        )}
                    </div>
                )}

                {/* PASS VIEW */}
                {view === 'PASS' && (
                    <div className="flex-1 flex flex-col relative overflow-hidden">
                        <div className="flex flex-1 overflow-hidden">
                            {/* Left labels — Free / Premium */}
                            <div className="flex-none flex flex-col shrink-0 justify-around py-1" style={{ width: 32 }}>
                                {/* Free label */}
                                <div className="flex items-center justify-center" style={{ height: 88 }}>
                                    <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 900, fontSize: 14, letterSpacing: 1, color: '#93c5fd', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>Free</span>
                                </div>
                                {/* Gap for level line */}
                                <div style={{ height: 44 }} />
                                {/* Premium label */}
                                <div className="flex items-center justify-center" style={{ height: 88 }}>
                                    <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 900, fontSize: 14, letterSpacing: 1, color: '#fcd34d', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>Premium</span>
                                </div>
                            </div>

                            {/* Scrollable rewards */}
                            <div ref={rewardsContainerRef} className="flex-1 overflow-x-auto no-scrollbar" style={{ scrollBehavior: 'smooth' }}>
                                <div className="flex h-full" style={{ paddingLeft: 6, paddingRight: 12, gap: 6, alignItems: 'stretch' }}>
                                    {levels.map((lvl) => {
                                        const rewards = missionState.passRewards.filter(r => r.level === lvl);
                                        const freeReward = rewards.find(r => r.tier === 'FREE');
                                        const premReward = rewards.find(r => r.tier === 'PREMIUM');
                                        const unlocked = missionState.passLevel + premiumLevelBonus >= lvl;
                                        const isNextBuyable = lvl === missionState.passLevel + 1;

                                        const freeClaimable = !!(freeReward && !freeReward.claimed && unlocked);
                                        const freeClaimed = !!(freeReward?.claimed);
                                        const premClaimable = !!(premReward && !premReward.claimed && unlocked && missionState.isPremium);
                                        const premClaimed = !!(premReward?.claimed);

                                        return (
                                            <div key={lvl} className="flex-none flex flex-col" style={{ width: 88, gap: 0 }}>

                                                {/* FREE card */}
                                                <div
                                                    onClick={freeClaimable ? () => freeReward && onClaimReward(freeReward) : undefined}
                                                    className="relative overflow-hidden"
                                                    style={{
                                                        height: 88,
                                                        borderRadius: 12,
                                                        background: freeClaimed
                                                            ? 'linear-gradient(160deg,#1e3a6e,#132654)'
                                                            : 'linear-gradient(160deg,#3b82f6 0%,#2563eb 50%,#1e40af 100%)',
                                                        cursor: freeClaimable ? 'pointer' : 'default',
                                                        opacity: freeClaimed ? 0.6 : 1,
                                                        boxShadow: freeClaimable
                                                            ? 'inset 0 1px 0 rgba(150,200,255,0.5), 0 4px 12px rgba(37,99,235,0.4)'
                                                            : 'inset 0 1px 0 rgba(150,200,255,0.25)',
                                                    }}>
                                                    {/* Top gloss */}
                                                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '45%', background: 'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0) 100%)', borderRadius: '12px 12px 50% 50%', pointerEvents: 'none' }} />
                                                    {/* Icon */}
                                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                                                        {renderIcon(freeReward)}
                                                    </div>
                                                    {/* Value label */}
                                                    <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 10, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,1)' }}>
                                                        {freeReward ? getDisplayValue(freeReward) : ''}
                                                    </div>
                                                    {/* Lock overlay */}
                                                    {!freeClaimed && !freeClaimable && (
                                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: 12 }}>
                                                            <img src="/ui/lock.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }} />
                                                        </div>
                                                    )}
                                                    {/* Claimed check */}
                                                    {freeClaimed && (
                                                        <div style={{ position: 'absolute', top: 5, right: 6, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className="ti ti-check" style={{ fontSize: 10, color: '#86efac' }} />
                                                        </div>
                                                    )}
                                                    {/* ViperBorder when claimable */}
                                                    {freeClaimable && <ViperBorder theme="gold" animate />}
                                                </div>

                                                {/* Level line */}
                                                <div className="flex items-center justify-center relative shrink-0" style={{ height: 44 }}>
                                                    {/* Track line */}
                                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, transform: 'translateY(-50%)', background: unlocked ? 'linear-gradient(90deg,#9333ea,#c084fc)' : 'rgba(255,255,255,0.15)' }} />
                                                    {/* Bubble / buy pill */}
                                                    {isNextBuyable ? (
                                                        <button onClick={onBuyLevel} className="relative z-10 flex items-center gap-1 rounded-full font-black"
                                                            style={{ background: 'linear-gradient(180deg,#22c55e,#15803d)', boxShadow: '0 2px 0 #14532d', padding: '3px 8px', fontSize: 8, color: '#fff', border: 'none', cursor: 'pointer' }}>
                                                            <img src="/symbols/diamond.png" alt="" style={{ width: 9, height: 9, objectFit: 'contain' }} /> 100
                                                        </button>
                                                    ) : (
                                                        <div className="relative z-10 flex items-center justify-center font-black rounded-full"
                                                            style={{
                                                                width: 24, height: 24, fontSize: 9,
                                                                background: unlocked ? 'linear-gradient(180deg,#c084fc,#7c3aed)' : '#111827',
                                                                border: `2px solid ${unlocked ? '#e879f9' : 'rgba(255,255,255,0.25)'}`,
                                                                boxShadow: unlocked ? '0 2px 8px rgba(168,85,247,0.6)' : 'none',
                                                                color: 'white', flexShrink: 0,
                                                            }}>
                                                            {lvl}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* PREMIUM card */}
                                                <div
                                                    onClick={premClaimable ? () => premReward && onClaimReward(premReward) : undefined}
                                                    className="relative overflow-hidden"
                                                    style={{
                                                        height: 88,
                                                        borderRadius: 12,
                                                        background: premClaimed
                                                            ? 'linear-gradient(160deg,#5a3800,#3a2000)'
                                                            : 'linear-gradient(160deg,#d97706 0%,#b45309 50%,#92400e 100%)',
                                                        cursor: premClaimable ? 'pointer' : 'default',
                                                        opacity: premClaimed ? 0.6 : 1,
                                                        boxShadow: premClaimable
                                                            ? 'inset 0 1px 0 rgba(255,240,120,0.5), 0 4px 12px rgba(217,119,6,0.4)'
                                                            : 'inset 0 1px 0 rgba(255,240,120,0.2)',
                                                    }}>
                                                    {/* Top gloss */}
                                                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '45%', background: 'linear-gradient(180deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0) 100%)', borderRadius: '12px 12px 50% 50%', pointerEvents: 'none' }} />
                                                    {/* Icon */}
                                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 14 }}>
                                                        {renderIcon(premReward)}
                                                    </div>
                                                    {/* Value label */}
                                                    <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 10, fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,1)' }}>
                                                        {premReward ? getDisplayValue(premReward) : ''}
                                                    </div>
                                                    {/* Lock overlay — no premium pass */}
                                                    {!missionState.isPremium && !premClaimed && (
                                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', borderRadius: 12 }}>
                                                            <img src="/ui/lock.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(255,190,0,0.5))' }} />
                                                        </div>
                                                    )}
                                                    {/* Lock overlay — level not reached */}
                                                    {missionState.isPremium && !premClaimed && !premClaimable && (
                                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: 12 }}>
                                                            <img src="/ui/lock.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }} />
                                                        </div>
                                                    )}
                                                    {/* Claimed check */}
                                                    {premClaimed && (
                                                        <div style={{ position: 'absolute', top: 5, right: 6, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <i className="ti ti-check" style={{ fontSize: 10, color: '#fcd34d' }} />
                                                        </div>
                                                    )}
                                                    {/* ViperBorder when claimable */}
                                                    {premClaimable && <ViperBorder theme="gold" animate />}
                                                </div>

                                            </div>
                                        );
                                    })}
                                    <div style={{ width: 8, flexShrink: 0 }} />
                                </div>
                            </div>
                        </div>

                        {/* Bottom bar */}
                        <div className="shrink-0 flex items-center justify-center gap-3 px-4 pt-1 pb-3">
                            <button
                                onClick={rewardsToClaimCount > 0 ? onClaimAll : undefined}
                                disabled={rewardsToClaimCount === 0}
                                className="pill-green"
                                style={{ opacity: rewardsToClaimCount === 0 ? 0.4 : 1 }}>
                                <div className="pill-face" style={{ padding: '10px 28px', fontSize: '13px' }}>
                                    Claim All {rewardsToClaimCount > 0 ? `(${rewardsToClaimCount})` : ''}
                                </div>
                            </button>
                            {!missionState.isPremium ? (
                                <button onClick={() => { onClose(); setTimeout(() => onOpenPremium?.(), 50); }} className="pill-green">
                                    <div className="pill-face" style={{ padding: '10px 28px', fontSize: '13px', background: 'linear-gradient(180deg,#ffd700 0%,#e6a500 50%,#cc8800 100%)', color: '#3a1a00', textShadow: '0 1px 2px rgba(100,60,0,0.4)' }}>Unlock Premium</div>
                                </button>
                            ) : (
                                <div className="flex items-center gap-1 px-6 py-3 rounded-full font-black text-[13px]"
                                    style={{ background: 'rgba(255,255,255,0.08)', color: '#86efac' }}>
                                    ✓ Premium Active
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
};
