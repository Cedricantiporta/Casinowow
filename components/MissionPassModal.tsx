import React, { useState, useEffect, useRef } from 'react';
import { Mission, MissionState, PassReward, MissionFrequency } from '../types';
import { formatNumber, formatCommaNumber, formatK, formatKShort, SCALE_COIN_REWARD } from '../constants';

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
            if (reward.claimed && reward.claimedValue !== undefined) return formatKShort(reward.claimedValue);
            return formatKShort(SCALE_COIN_REWARD(reward.value, playerLevel, maxBet));
        }
        return reward.label;
    };

    const fmt = (n: number) => n.toLocaleString('en-US');

    const topbarBase = "font-nunito w-full flex flex-col shrink-0 select-none";
    const topbarStyle = { background: 'transparent' };

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3">
        <div className="w-full max-w-[720px] flex flex-col rounded-3xl overflow-hidden relative"
            style={{ background: 'linear-gradient(160deg,#8028c8 0%,#6018a8 50%,#4a1090 100%)', height: 'min(96%, 380px)', boxShadow: 'inset 0 2px 0 rgba(220,170,255,0.9), 0 8px 32px rgba(0,0,0,0.8)' }}>
            {showPremiumInfo && (
                <div className="absolute inset-0 z-[10] flex flex-col animate-pop-in overflow-hidden rounded-2xl"
                    style={{ background: 'linear-gradient(160deg,#1a0a00 0%,#3a1800 40%,#0a0000 100%)' }}>
                    {/* Header row */}
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
                                    <div className="text-yellow-200 font-black text-[10px] tracking-wide leading-none">{p.title}</div>
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
                            className="btn-3d px-8 py-2.5 rounded-xl font-black text-sm tracking-widest text-black relative overflow-hidden"
                            style={{ background: 'linear-gradient(180deg,#fff8a0,#f0c000 40%,#c08000)', boxShadow: '0 4px 0 #7a5000,0 6px 16px rgba(0,0,0,0.5)' }}>
                            <span className="relative z-10">Unlock Premium</span>
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
                            <span className="font-black text-white text-xs tracking-widest shrink-0">Daily Missions</span>
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
                                <span className="font-black text-[9px] text-yellow-300">Lv.{missionState.passLevel}</span>
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
                    /* PASS topbar: title | spacer | currencies | X */
                    <div className={topbarBase} style={topbarStyle}>
                        <div className="flex items-center gap-2 px-3 h-[40px]">
                            {/* Title */}
                            <span className="font-black text-white text-xs tracking-widest shrink-0">Mission Pass</span>
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
                            <div className="round-btn shrink-0" onClick={onClose}>
                                <i className="ti ti-x"></i>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== CONTENT ===== */}

                {view === 'MISSIONS' && (
                    <div className="flex-1 flex items-stretch p-3 gap-3 overflow-hidden" style={{ background: 'transparent' }}>
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
                                            className="w-full py-1.5 text-[10px] font-black rounded-lg cursor-not-allowed"
                                            style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                                            ✓ Done
                                        </button>
                                    ) : mission.completed ? (
                                        <button onClick={() => onClaimMissionReward(mission)}
                                            className="btn-3d w-full py-1.5 text-[10px] font-black rounded-lg flex items-center justify-center gap-1"
                                            style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00', boxShadow: '0 3px 0 #7a4a00' }}>
                                            Claim Reward
                                        </button>
                                    ) : (
                                        <button onClick={() => onFinishMission(mission)}
                                            className="btn-3d w-full py-1.5 bg-gradient-to-b from-[#4a2e61] to-[#2e1845] text-cyan-200 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1">
                                            <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> Skip {diamondCostToSkip(mission.xpReward)}
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

                {view === 'PASS' && (
                    <div className="flex-1 flex flex-col relative" style={{ background: 'transparent' }}>
                        {/* Rewards horizontal scroll */}
                        <div ref={rewardsContainerRef} className="flex-1 overflow-x-auto flex items-center p-3 gap-3 no-scrollbar snap-x" style={{ background: 'transparent', alignItems: 'flex-start' }}>
                            {levels.map((lvl) => {
                                const rewards = missionState.passRewards.filter(r => r.level === lvl);
                                const freeReward = rewards.find(r => r.tier === 'FREE');
                                const premReward = rewards.find(r => r.tier === 'PREMIUM');
                                const isUnlocked = missionState.passLevel >= lvl;

                                const renderIcon = (reward: typeof freeReward) => {
                                    if (!reward) return null;
                                    const s = '4rem';
                                    if (reward.type === 'COINS') return <img src="/symbols/coin.png" alt="" style={{ width: s, height: s, objectFit: 'contain' }} />;
                                    if (reward.type === 'DIAMONDS') return <img src="/symbols/diamond.png" alt="" style={{ width: s, height: s, objectFit: 'contain' }} />;
                                    if (reward.type === 'PICKS') return <span style={{ fontSize: s, lineHeight: 1 }}>⛏️</span>;
                                    if (reward.type === 'DICE_CREDITS') return <span style={{ fontSize: s, lineHeight: 1 }}>🎲</span>;
                                    if (reward.type === 'CREDIT_BACK') return <span style={{ fontSize: s, lineHeight: 1 }}>🃏</span>;
                                    return <img src="/ui/star.png" alt="" style={{ width: s, height: s, objectFit: 'contain' }} />;
                                };

                                const freeBorder = {
                                    border: '3px solid #60a5fa',
                                    boxShadow: 'inset 0 3px 4px rgba(255,255,255,0.45), inset 0 -2px 4px rgba(0,10,60,0.6), 0 0 10px rgba(96,165,250,0.25)',
                                };
                                const premBorder = {
                                    border: '3px solid #fde047',
                                    boxShadow: 'inset 0 3px 4px rgba(255,250,180,0.45), inset 0 -2px 4px rgba(60,40,0,0.6), 0 0 10px rgba(253,224,71,0.3)',
                                };

                                return (
                                    <div key={lvl} className="flex-none flex flex-col gap-0 relative snap-center" style={{ width: '80px' }}>
                                        {/* FREE card — bright blue */}
                                        <div style={{
                                            background: 'linear-gradient(180deg,#3b82f6,#1d4ed8)',
                                            ...freeBorder,
                                            borderRadius: '12px',
                                            padding: '6px 4px',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                            opacity: freeReward?.claimed ? 0.55 : 1,
                                        }}>
                                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {renderIcon(freeReward)}
                                                <span style={{
                                                    position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                                                    fontSize: '10px', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', lineHeight: 1.3,
                                                    textShadow: '0 1px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.9)',
                                                }}>
                                                    {freeReward ? getDisplayValue(freeReward) : ''}
                                                </span>
                                            </div>
                                            {freeReward?.claimed ? (
                                                <button disabled
                                                    className="w-full py-0.5 text-[8px] font-black rounded-lg cursor-not-allowed"
                                                    style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                                                    ✓
                                                </button>
                                            ) : isUnlocked ? (
                                                <button onClick={() => freeReward && onClaimReward(freeReward)}
                                                    className="btn-3d w-full py-0.5 text-[8px] font-black rounded-lg"
                                                    style={{ background: 'linear-gradient(180deg,#60a5fa,#2563eb)', boxShadow: '0 2px 0 #1d4ed8', color: '#fff' }}>
                                                    Claim
                                                </button>
                                            ) : (
                                                <button disabled
                                                    className="w-full py-0.5 text-[8px] font-black rounded-lg cursor-not-allowed"
                                                    style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }}>
                                                    Locked
                                                </button>
                                            )}
                                        </div>

                                        {/* Level node */}
                                        <div className="flex items-center justify-center shrink-0 relative" style={{ height: 56 }}>
                                            <div className="absolute left-0 right-[50%]" style={{ top: '50%', height: 2, transform: 'translateY(-50%)', background: isUnlocked ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : '#1e1b4b' }} />
                                            <div className="absolute left-[50%] right-0" style={{ top: '50%', height: 2, transform: 'translateY(-50%)', background: isUnlocked ? 'linear-gradient(90deg,#a855f7,#7c3aed)' : '#1e1b4b' }} />
                                            {lvl === missionState.passLevel + 1 ? (
                                                <button onClick={onBuyLevel} className="relative z-10 btn-3d font-black text-[8px] rounded-lg text-white flex items-center justify-center gap-0.5"
                                                    style={{ width: 58, height: 20, background: 'linear-gradient(180deg,#6366f1,#3730a3)', boxShadow: '0 2px 0 #1e1b4b', flexShrink: 0 }}>
                                                    <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> 100
                                                </button>
                                            ) : (
                                                <div className="relative z-10 flex items-center justify-center font-black text-[9px] rounded-full"
                                                    style={{ width: 24, height: 24, background: isUnlocked ? 'linear-gradient(180deg,#c084fc,#7c3aed)' : '#111827', border: `2px solid ${isUnlocked ? '#e879f9' : '#374151'}`, boxShadow: isUnlocked ? '0 2px 8px rgba(168,85,247,0.6)' : 'none', color: isUnlocked ? 'white' : '#4b5563', flexShrink: 0 }}>
                                                    {lvl}
                                                </div>
                                            )}
                                        </div>

                                        {/* PREMIUM card — yellow */}
                                        <div style={{
                                            background: 'linear-gradient(180deg,#eab308,#a16207)',
                                            ...premBorder,
                                            borderRadius: '12px',
                                            padding: '6px 4px',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                            opacity: premReward?.claimed ? 0.55 : 1,
                                        }}>
                                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {renderIcon(premReward)}
                                                {!missionState.isPremium && (
                                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
                                                        <img src="/ui/lock.png" alt="" style={{ width: '1.6rem', height: '1.6rem', objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }} />
                                                    </div>
                                                )}
                                                <span style={{
                                                    position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                                                    fontSize: '10px', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', lineHeight: 1.3,
                                                    textShadow: '0 1px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.9)',
                                                }}>
                                                    {premReward ? getDisplayValue(premReward) : ''}
                                                </span>
                                            </div>
                                            {premReward?.claimed ? (
                                                <button disabled
                                                    className="w-full py-0.5 text-[8px] font-black rounded-lg cursor-not-allowed"
                                                    style={{ background: 'rgba(253,224,71,0.15)', color: '#fde047' }}>
                                                    ✓
                                                </button>
                                            ) : !missionState.isPremium ? (
                                                <button disabled
                                                    className="w-full py-0.5 text-[8px] font-black rounded-lg cursor-not-allowed"
                                                    style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }}>
                                                    Locked
                                                </button>
                                            ) : isUnlocked ? (
                                                <button onClick={() => premReward && onClaimReward(premReward)}
                                                    className="btn-3d w-full py-0.5 text-[8px] font-black rounded-lg"
                                                    style={{ background: 'linear-gradient(180deg,#fde68a,#d97706)', boxShadow: '0 2px 0 #92400e', color: '#1c0900' }}>
                                                    Claim
                                                </button>
                                            ) : (
                                                <button disabled
                                                    className="w-full py-0.5 text-[8px] font-black rounded-lg cursor-not-allowed"
                                                    style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }}>
                                                    Locked
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="w-6 shrink-0"></div>
                        </div>

                        {/* Bottom bar — Claim All + Unlock Premium */}
                        <div className="shrink-0 flex items-center justify-center gap-3 px-4 py-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <button onClick={rewardsToClaimCount > 0 ? onClaimAll : undefined}
                                className="btn-3d font-black text-[10px] rounded-xl px-5 py-2"
                                style={{
                                    background: rewardsToClaimCount > 0 ? 'linear-gradient(180deg,#22c55e,#15803d)' : 'rgba(255,255,255,0.06)',
                                    boxShadow: rewardsToClaimCount > 0 ? '0 3px 0 #14532d' : 'none',
                                    color: rewardsToClaimCount > 0 ? '#fff' : '#4b5563',
                                    cursor: rewardsToClaimCount > 0 ? 'pointer' : 'not-allowed',
                                }}>
                                Claim All {rewardsToClaimCount > 0 ? `(${rewardsToClaimCount})` : ''}
                            </button>
                            {!missionState.isPremium ? (
                                <button onClick={() => setShowPremiumInfo(true)}
                                    className="btn-3d font-black text-[10px] rounded-xl px-5 py-2 relative overflow-hidden"
                                    style={{ background: 'linear-gradient(180deg,#fde68a,#d97706)', boxShadow: '0 3px 0 #92400e', color: '#1c0900' }}>
                                    <span className="relative z-10">Unlock Premium</span>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                                </button>
                            ) : (
                                <div className="flex items-center gap-1 px-4 py-2 rounded-xl font-black text-[10px]"
                                    style={{ background: 'rgba(253,224,71,0.12)', color: '#fde047' }}>
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
