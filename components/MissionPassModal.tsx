import React, { useState, useEffect, useRef } from 'react';
import { Mission, MissionState, PassReward, MissionFrequency } from '../types';
import { formatNumber, formatCommaNumber, formatK, SCALE_COIN_REWARD } from '../constants';

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
}) => {
    const [view, setView] = useState<'MISSIONS' | 'PASS'>('MISSIONS');
    const [activeTab, setActiveTab] = useState<MissionFrequency>('DAILY');
    const [showPremiumInfo, setShowPremiumInfo] = useState(false);
    const rewardsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setView(initialView);
        } else {
            setShowPremiumInfo(false);
        }
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

    const currentMissions = missionState.activeMissions
        .filter(m => m.frequency === 'DAILY')
        .slice(0, 4);

    const levels = Array.from(new Set(missionState.passRewards.map(r => r.level))).sort((a: number, b: number) => a - b);
    const rewardsToClaimCount = missionState.passRewards.filter(r =>
        r.level <= missionState.passLevel &&
        !r.claimed &&
        (r.tier === 'FREE' || (r.tier === 'PREMIUM' && missionState.isPremium))
    ).length;

    const diamondCostToSkip = (xp: number) => Math.max(1, Math.ceil(xp / 5));
    const isXpBoosted = missionState.passBoostMultiplier > 1;

    const handleScroll = (direction: 'LEFT' | 'RIGHT') => {
        if (rewardsContainerRef.current) {
            rewardsContainerRef.current.scrollBy({ left: direction === 'LEFT' ? -200 : 200, behavior: 'smooth' });
        }
    };

    const jumpToCurrentLevel = () => {
        if (rewardsContainerRef.current) {
            const targetIndex = Math.max(0, missionState.passLevel - 2);
            rewardsContainerRef.current.scrollTo({ left: targetIndex * 160, behavior: 'smooth' });
        }
    };

    const handlePremiumPurchase = (e: React.MouseEvent) => {
        e.stopPropagation();
        onBuyPass();
        setShowPremiumInfo(false);
    };

    const getDisplayValue = (reward: PassReward) => {
        if (reward.type === 'COINS') {
            if (reward.claimed && reward.claimedValue !== undefined) return formatK(reward.claimedValue);
            return formatK(SCALE_COIN_REWARD(reward.value, playerLevel, maxBet));
        }
        return reward.label;
    };

    const fmt = (n: number) => n.toLocaleString('en-US');

    const passBtn = "btn-3d font-black uppercase text-[8px] rounded-lg flex items-center justify-center";
    const passBtnSize = { width: '54px', height: '26px', flexShrink: 0 as const };

    const topbarBase = "font-nunito w-full flex flex-col shrink-0 select-none";
    const topbarStyle = { background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)' };

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
        <div className="w-full max-w-[720px] flex flex-col rounded-2xl overflow-hidden relative"
            style={{ background: 'linear-gradient(160deg,#1a0535,#2d0764)', height: 'min(96%, 1160px)' }}>
            {showPremiumInfo && (
                <div className="absolute inset-0 z-[10] flex flex-col animate-pop-in overflow-hidden rounded-2xl"
                    style={{ background: 'linear-gradient(160deg,#1a0a00 0%,#3a1800 40%,#0a0000 100%)' }}>
                    {/* Header row */}
                    <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 relative"
                        style={{ background: 'linear-gradient(180deg,#92400e,#78350f)' }}>
                        <div className="flex-1">
                            <h2 className="font-black text-base uppercase tracking-widest leading-none"
                                style={{ background: 'linear-gradient(180deg,#fff8c0,#f0c000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Monthly Pass
                            </h2>
                            <p className="text-yellow-200/50 text-[9px] font-bold uppercase tracking-wider mt-0.5">Unlock exclusive rewards</p>
                        </div>
                        <div className="round-btn cursor-pointer shrink-0" onClick={() => setShowPremiumInfo(false)}><i className="ti ti-x"></i></div>
                    </div>

                    {/* Perks grid — 2×2 */}
                    <div className="flex-1 grid grid-cols-2 gap-2.5 px-4 py-3 content-center">
                        {[
                            { icon: '🎁', title: 'Double Rewards',   desc: 'FREE + PREMIUM on every level' },
                            { icon: '⚡', title: '+20 Levels',        desc: 'Instant level boost on purchase' },
                            { icon: '💎', title: 'Exclusive Gems',    desc: 'Extra gems on premium reward tiers' },
                            { icon: '⛏️', title: 'Quest Picks',       desc: 'Bonus picks for Wild & Dice quests' },
                        ].map(p => (
                            <div key={p.title} className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5"
                                style={{ background: 'rgba(255,200,0,0.08)' }}>
                                <span style={{ fontSize: '24px', lineHeight: 1, flexShrink: 0 }}>{p.icon}</span>
                                <div className="min-w-0">
                                    <div className="text-yellow-200 font-black text-[10px] uppercase tracking-wide leading-none">{p.title}</div>
                                    <div className="text-yellow-200/50 text-[8px] mt-0.5 leading-snug">{p.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Price + CTA — centered, constrained */}
                    <div className="shrink-0 px-4 pb-3 pt-1 flex flex-col items-center gap-2">
                        <div className="flex items-center justify-between w-full max-w-xs rounded-xl px-3 py-2"
                            style={{ background: 'rgba(255,200,0,0.12)' }}>
                            <div>
                                <div className="text-yellow-100 font-black text-base leading-none">₱ 0.00</div>
                            </div>
                        </div>
                        <button onClick={handlePremiumPurchase}
                            className="btn-3d px-8 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest text-black relative overflow-hidden"
                            style={{ background: 'linear-gradient(180deg,#fff8a0,#f0c000 40%,#c08000)', boxShadow: '0 4px 0 #7a5000,0 6px 16px rgba(0,0,0,0.5)' }}>
                            <span className="relative z-10">Unlock Monthly Pass</span>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
                        </button>
                    </div>

                </div>
            )}

            <div className="w-full h-full flex flex-col relative overflow-hidden">

                {/* ===== TOPBAR ===== */}
                {view === 'MISSIONS' ? (
                    /* MISSIONS topbar: title | counter | X */
                    <div className={topbarBase} style={topbarStyle}>
                        <div className="flex items-center gap-2 px-3 h-[40px]">
                            <span className="font-black text-white text-xs uppercase tracking-widest shrink-0">Daily Missions</span>
                            {(() => {
                                const daily = missionState.activeMissions.filter(m => m.frequency === 'DAILY');
                                const done = daily.filter(m => m.completed || m.claimed).length;
                                return (
                                    <span className="font-black text-[10px] px-2 py-0.5 rounded-full"
                                        style={{ background: done >= 4 ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.08)', color: done >= 4 ? '#fbbf24' : 'rgba(255,255,255,0.5)' }}>
                                        {done}/4
                                    </span>
                                );
                            })()}
                            <div className="flex-1" />
                            {/* Pass level + XP shortcut */}
                            <button onClick={() => setView('PASS')} className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                                style={{ background: 'rgba(251,191,36,0.12)', border: 'none', cursor: 'pointer' }}>
                                <span className="font-black text-[9px] text-yellow-300 uppercase">Lv.{missionState.passLevel}</span>
                                <span className="font-black text-[9px] text-yellow-200/60">{missionState.passXP}/{missionState.passXpToNext}</span>
                            </button>
                            {/* Gems pill with + shortcut */}
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                                style={{ background: 'rgba(96,165,250,0.12)' }}>
                                <img src="/symbols/diamond.png" alt="" style={{ width: '11px', height: '11px', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />
                                <span className="font-black text-[10px] text-blue-300">{diamonds.toLocaleString('en-US')}</span>
                                {onOpenGemShop && <button onClick={() => { onClose(); setTimeout(onOpenGemShop!, 50); }} style={{ fontSize: '10px', background: 'none', border: 'none', padding: '0 0 0 2px', cursor: 'pointer', color: '#c084fc', fontWeight: 900, lineHeight: 1 }}>+</button>}
                            </div>
                            <div className="round-btn shrink-0" onClick={onClose}>
                                <i className="ti ti-x"></i>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* PASS topbar: title | spacer | CLAIM ALL | Buy Monthly Pass / ACTIVE | X */
                    <div className={topbarBase} style={topbarStyle}>
                        <div className="flex items-center gap-2 px-3 h-[40px]">
                            {/* Title */}
                            <span className="font-black text-white text-xs uppercase tracking-widest shrink-0">Monthly Pass</span>
                            <div className="flex-1"></div>
                            {/* Currency pills */}
                            <div className="currency-pill flex items-center gap-1 shrink-0" style={{ fontSize: '10px' }}>
                                <img src="/symbols/coin.png" alt="" style={{ width: '11px', height: '11px', objectFit: 'contain' }} />
                                <span className="num" style={{ fontSize: '10px' }}>{balance.toLocaleString('en-US')}</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                                style={{ background: 'rgba(96,165,250,0.12)' }}>
                                <img src="/symbols/diamond.png" alt="" style={{ width: '11px', height: '11px', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />
                                <span className="font-black text-[10px] text-blue-300">{diamonds.toLocaleString('en-US')}</span>
                                {onOpenGemShop && <button onClick={() => { onClose(); setTimeout(onOpenGemShop!, 50); }} style={{ fontSize: '10px', background: 'none', border: 'none', padding: '0 0 0 2px', cursor: 'pointer', color: '#c084fc', fontWeight: 900, lineHeight: 1 }}>+</button>}
                            </div>
                            {/* Action buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={rewardsToClaimCount > 0 ? onClaimAll : undefined}
                                    className={`${passBtn} ${rewardsToClaimCount > 0 ? 'bg-gradient-to-b from-green-400 to-green-700 text-white' : 'text-gray-500'}`}
                                    style={{ ...passBtnSize, background: rewardsToClaimCount > 0 ? undefined : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    CLAIM ALL
                                </button>
                                {!missionState.isPremium ? (
                                    <button onClick={() => setShowPremiumInfo(true)}
                                        className={`${passBtn} bg-gradient-to-b from-yellow-300 to-yellow-600 text-black`}
                                        style={{ width: '90px', height: '26px', flexShrink: 0 }}>
                                        Buy Monthly Pass
                                    </button>
                                ) : (
                                    <div className="flex items-center justify-center text-yellow-300 font-black text-[9px]" style={passBtnSize}>
                                        ACTIVE
                                    </div>
                                )}
                            </div>
                            <div className="round-btn shrink-0" onClick={onClose}>
                                <i className="ti ti-x"></i>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== CONTENT ===== */}

                {view === 'MISSIONS' && (
                    <div className="flex-1 flex items-stretch p-3 gap-3 overflow-hidden" style={{ background: 'linear-gradient(180deg,#1e0a40,#120526)' }}>
                        {currentMissions.map((mission) => (
                            <div key={mission.id}
                                className={`flex-1 flex flex-col gap-2 rounded-xl p-3 relative overflow-hidden shadow-lg border ${mission.isGolden ? (mission.completed ? 'border-yellow-500/60' : 'border-yellow-700/40') : mission.completed ? 'border-green-900/40' : 'border-white/5'}`}
                                style={{ background: mission.isGolden ? (mission.completed ? 'linear-gradient(180deg,#5a3f00,#3d2900)' : 'linear-gradient(180deg,#4a3300,#2e1e00)') : mission.completed ? 'linear-gradient(180deg,#0a2e0a,#0e1c0e)' : 'linear-gradient(180deg,#2a233e,#1a1230)' }}>
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>

                                {/* Golden / stacks badges */}
                                {(mission.isGolden || (mission.stacks && mission.stacks > 0)) && (
                                    <div className="flex items-center justify-between relative z-10 -mb-1">
                                        {!mission.isGolden && <span />}
                                        {mission.stacks && mission.stacks > 0 && (
                                            <div className="flex gap-0.5 items-center">
                                                {Array.from({ length: 3 }).map((_, idx) => (
                                                    <div key={idx} className="w-2 h-2 rounded-full" style={{ background: idx < mission.stacks! ? '#a855f7' : 'rgba(255,255,255,0.15)' }} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Icon */}
                                <div className="flex-1 bg-black/30 rounded-xl flex items-center justify-center shrink-0 shadow-inner mx-auto relative z-10 min-h-0" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)' }}>
                                    {mission.type === 'SPIN_COUNT' ? '🎰' : mission.type === 'WIN_COINS' ? <img src="/symbols/coin.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> : mission.type === 'BET_COINS' ? <img src="/symbols/coin.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> : mission.type === 'BIG_WIN_COUNT' ? '🏆' : mission.type === 'LEVEL_UP' ? '⬆️' : mission.type === 'MAX_BET_SPIN' ? <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> : <img src="/ui/star.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />}
                                </div>

                                {/* Description */}
                                <div className="text-white font-black text-[12px] leading-snug text-center flex-1 relative z-10">{mission.description}</div>

                                {/* Progress */}
                                <div className="relative z-10">
                                    <div className="relative h-5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
                                        <div className={`absolute inset-y-0 left-0 rounded-full transition-all ${mission.completed ? (mission.isGolden ? 'bg-yellow-400' : 'bg-green-500') : (mission.isGolden ? 'bg-amber-500' : 'bg-fuchsia-500')}`}
                                            style={{ width: `${Math.min(100, (mission.current / mission.target) * 100)}%` }} />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] font-black leading-none text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                                                {`${formatK(mission.current)} / ${formatK(mission.target)}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Rewards */}
                                <div className="flex flex-col gap-0.5 relative z-10">
                                    <div className="text-center">
                                        <span className={`font-mono text-[11px] font-black ${isXpBoosted ? 'text-yellow-400' : 'text-fuchsia-300'}`}>
                                            +{isXpBoosted ? mission.xpReward * missionState.passBoostMultiplier : mission.xpReward} Pass XP
                                        </span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-yellow-300 font-mono text-[11px] font-black">+{formatK(mission.coinReward)} Coins</span>
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="relative z-10">
                                    {mission.claimed ? (
                                        <button disabled
                                            className="w-full py-1.5 text-[10px] font-black uppercase rounded-lg cursor-not-allowed"
                                            style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                                            ✓ MISSION DONE
                                        </button>
                                    ) : mission.completed ? (
                                        <button onClick={() => onClaimMissionReward(mission)}
                                            className="btn-3d w-full py-1.5 text-[10px] font-black uppercase rounded-lg flex items-center justify-center gap-1"
                                            style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00', boxShadow: '0 3px 0 #7a4a00' }}>
                                            🎁 CLAIM REWARD
                                        </button>
                                    ) : (
                                        <button onClick={() => onFinishMission(mission)}
                                            className="btn-3d w-full py-1.5 bg-gradient-to-b from-[#4a2e61] to-[#2e1845] text-cyan-200 text-[9px] font-bold uppercase rounded-lg flex items-center justify-center gap-1">
                                            <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> SKIP {diamondCostToSkip(mission.xpReward)}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {currentMissions.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center p-4">
                                <span className="text-4xl">🎉</span>
                                <span className="mt-3 text-[12px] text-purple-300 font-bold uppercase tracking-widest">All Done!</span>
                            </div>
                        )}
                    </div>
                )}

                {view === 'PASS' && (
                    <div className="flex-1 flex flex-col relative" style={{ background: '#12052a' }}>
                        {/* Rewards horizontal scroll — swipe/wheel only, no nav arrows */}
                        <div ref={rewardsContainerRef} className="flex-1 overflow-x-auto flex items-stretch p-3 gap-3 no-scrollbar snap-x" style={{ background: 'linear-gradient(180deg,#1e0a40,#120526)' }}>
                            {levels.map((lvl) => {
                                const rewards = missionState.passRewards.filter(r => r.level === lvl);
                                const freeReward = rewards.find(r => r.tier === 'FREE');
                                const premReward = rewards.find(r => r.tier === 'PREMIUM');
                                const isUnlocked = missionState.passLevel >= lvl;

                                return (
                                    <div key={lvl} className="flex-none flex flex-col gap-1 relative snap-center h-full" style={{ width: '88px' }}>
                                        {/* FREE card */}
                                        <div className={`flex-1 bg-gradient-to-b from-[#382952] to-[#231833] rounded-xl p-1 flex flex-col items-center justify-between relative shadow ${freeReward?.claimed ? 'opacity-50 grayscale' : ''}`}>
                                            <span className="text-[7px] text-gray-300 uppercase font-bold bg-black/50 px-1.5 py-0.5 rounded-full mt-0.5">Free</span>
                                            <div className="flex-1 flex flex-col items-center justify-center w-full gap-0.5">
                                                <div className="text-4xl flex items-center justify-center">{freeReward?.type === 'COINS' ? <img src="/symbols/coin.png" alt="" style={{ width: '2.25rem', height: '2.25rem', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> : freeReward?.type === 'DIAMONDS' ? <img src="/symbols/diamond.png" alt="" style={{ width: '2.25rem', height: '2.25rem', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> : freeReward?.type === 'PICKS' ? '⛏️' : freeReward?.type === 'DICE_CREDITS' ? '🎲' : freeReward?.type === 'CREDIT_BACK' ? '🃏' : <img src="/ui/star.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />}</div>
                                                <span className="font-black text-white text-[10px] text-center leading-tight drop-shadow-md">{freeReward ? getDisplayValue(freeReward) : ''}</span>
                                            </div>
                                            <button onClick={() => freeReward && onClaimReward(freeReward)} disabled={!isUnlocked || freeReward?.claimed}
                                                className={`btn-3d w-full py-0.5 text-[8px] font-black uppercase rounded-lg ${isUnlocked && !freeReward?.claimed ? 'bg-gradient-to-b from-green-400 to-green-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                                                {freeReward?.claimed ? 'Claimed' : isUnlocked ? 'Claim' : 'Locked'}
                                            </button>
                                        </div>

                                        {/* Level node with connecting line */}
                                        <div className="flex items-center justify-center shrink-0 relative" style={{ height: 34 }}>
                                            {/* Left line half */}
                                            <div className="absolute left-0 right-[50%]" style={{ top: '50%', height: 3, transform: 'translateY(-50%)', background: isUnlocked ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : '#1e1b4b' }} />
                                            {/* Right line half */}
                                            <div className="absolute left-[50%] right-0" style={{ top: '50%', height: 3, transform: 'translateY(-50%)', background: isUnlocked ? 'linear-gradient(90deg,#a855f7,#7c3aed)' : '#1e1b4b' }} />
                                            {/* Circle node — or Buy Level button for next available level */}
                                            {lvl === missionState.passLevel + 1 ? (
                                                <button onClick={onBuyLevel}
                                                    className="relative z-10 btn-3d font-black text-[8px] rounded-lg text-white flex items-center justify-center gap-0.5"
                                                    style={{ width: 64, height: 22, background: 'linear-gradient(180deg,#6366f1,#3730a3)', boxShadow: '0 2px 0 #1e1b4b', flexShrink: 0 }}>
                                                    <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> 100
                                                </button>
                                            ) : (
                                                <div className="relative z-10 flex items-center justify-center font-black text-[9px] rounded-full"
                                                    style={{
                                                        width: 28, height: 28,
                                                        background: isUnlocked ? 'linear-gradient(180deg,#c084fc,#7c3aed)' : '#111827',
                                                        border: `2px solid ${isUnlocked ? '#e879f9' : '#374151'}`,
                                                        boxShadow: isUnlocked ? '0 2px 8px rgba(168,85,247,0.6),inset 0 1px 2px rgba(255,255,255,0.3)' : 'none',
                                                        color: isUnlocked ? 'white' : '#4b5563',
                                                        flexShrink: 0,
                                                    }}>
                                                    {lvl}
                                                </div>
                                            )}
                                        </div>

                                        {/* PREMIUM card — greyed/grayscale when locked, no blur */}
                                        <div className={`flex-1 bg-gradient-to-b ${missionState.isPremium ? 'from-[#451a03] to-[#2e1065]' : 'from-gray-800 to-black'} rounded-xl p-1 flex flex-col items-center justify-between relative shadow ${!missionState.isPremium ? 'grayscale opacity-60' : premReward?.claimed ? 'opacity-50 grayscale' : ''}`}>
                                            <span className={`text-[7px] uppercase font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${missionState.isPremium ? 'text-yellow-400 bg-black/50' : 'text-gray-500 bg-black/20'}`}>Premium</span>
                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative gap-0.5">
                                                {!missionState.isPremium && <div className="absolute inset-0 flex items-center justify-center z-10"><span className="text-3xl text-gray-400">🔒</span></div>}
                                                <div className="text-4xl flex items-center justify-center">{premReward?.type === 'COINS' ? <img src="/symbols/coin.png" alt="" style={{ width: '2.25rem', height: '2.25rem', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> : premReward?.type === 'DIAMONDS' ? <img src="/symbols/diamond.png" alt="" style={{ width: '2.25rem', height: '2.25rem', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> : premReward?.type === 'PICKS' ? '⛏️' : premReward?.type === 'DICE_CREDITS' ? '🎲' : premReward?.type === 'CREDIT_BACK' ? '🎴' : '👑'}</div>
                                                <span className={`font-black text-[10px] text-center leading-tight drop-shadow-md ${missionState.isPremium ? 'text-yellow-100' : 'text-gray-500'}`}>{premReward ? getDisplayValue(premReward) : ''}</span>
                                            </div>
                                            <button onClick={() => premReward && onClaimReward(premReward)} disabled={!isUnlocked || premReward?.claimed || !missionState.isPremium}
                                                className={`btn-3d w-full py-0.5 text-[8px] font-black uppercase rounded-lg ${isUnlocked && !premReward?.claimed && missionState.isPremium ? 'bg-gradient-to-b from-yellow-300 to-yellow-600 text-black' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                                                {premReward?.claimed ? 'Claimed' : (isUnlocked && missionState.isPremium) ? 'Claim' : 'Locked'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="w-6 shrink-0"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
};
