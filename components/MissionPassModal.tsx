import React, { useState, useEffect, useRef } from 'react';
import { Mission, MissionState, PassReward, MissionFrequency } from '../types';
import { formatNumber, formatCommaNumber, SCALE_COIN_REWARD } from '../constants';

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
    playerLevel
}) => {
    const [view, setView] = useState<'MISSIONS' | 'PASS'>('MISSIONS');
    const [activeTab, setActiveTab] = useState<MissionFrequency>('DAILY');
    const [showPremiumInfo, setShowPremiumInfo] = useState(false);
    const rewardsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setView(initialView);
            setShowPremiumInfo(false);
        }
    }, [isOpen, initialView]);

    if (!isOpen) return null;

    const currentMissions = missionState.activeMissions
        .filter(m => m.frequency === activeTab && !m.claimed)
        .slice(0, 4);

    const levels = Array.from(new Set(missionState.passRewards.map(r => r.level))).sort((a: number, b: number) => a - b);
    const rewardsToClaimCount = missionState.passRewards.filter(r =>
        r.level <= missionState.passLevel &&
        !r.claimed &&
        (r.tier === 'FREE' || (r.tier === 'PREMIUM' && missionState.isPremium))
    ).length;

    const diamondCostToSkip = (xp: number) => Math.max(1, Math.ceil(xp / 500));
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
        if (reward.type === 'COINS') return formatNumber(SCALE_COIN_REWARD(reward.value, playerLevel));
        return reward.label;
    };

    const fmt = (n: number) => n.toLocaleString('en-US');

    const passBtn = "btn-3d font-black uppercase text-[8px] rounded-lg flex items-center justify-center";
    const passBtnSize = { width: '54px', height: '26px', flexShrink: 0 as const };

    const topbarBase = "font-nunito w-full flex flex-col shrink-0 select-none";
    const topbarStyle = { background: 'linear-gradient(180deg,#7c3fb5,#4a1880)', borderBottom: '1.5px solid #38106e', boxShadow: '0 4px 8px rgba(0,0,0,0.4)' };

    return (
        <div className="fixed inset-0 z-[150] flex flex-col bg-[#0d0814] animate-pop-in">
            {showPremiumInfo && (
                <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-3 animate-pop-in">
                    <div className="relative bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-2xl p-0.5 w-full max-w-sm shadow-xl">
                        <div className="bg-gradient-to-b from-black/95 to-black/90 rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                            <div className="round-btn absolute top-3 right-3 z-50 cursor-pointer" onClick={() => setShowPremiumInfo(false)}><i className="ti ti-x"></i></div>
                            <h2 className="text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 uppercase tracking-widest mb-2">Premium Pass</h2>
                            <div className="text-4xl mb-3">👑</div>
                            <ul className="space-y-2 mb-4 text-left w-full max-w-xs relative z-10 text-xs">
                                <li className="flex items-center gap-2"><span>🚀</span><span className="text-white font-bold">Unlock Premium Rewards</span></li>
                                <li className="flex items-center gap-2"><span>⚡</span><span className="text-white font-bold">+20 Instant Levels</span></li>
                                <li className="flex items-center gap-2"><span>💎</span><span className="text-white font-bold">Exclusive Gem Packs</span></li>
                                <li className="flex items-center gap-2"><span>⛏️</span><span className="text-white font-bold">Extra Quest Picks</span></li>
                            </ul>
                            <div className="bg-yellow-900/30 rounded-lg p-3 mb-4 w-full">
                                <div className="text-yellow-400 font-black text-lg">₱ 0.00</div>
                                <div className="text-yellow-200 text-[10px] uppercase">Free with Demo Account!</div>
                            </div>
                            <button onClick={handlePremiumPurchase} className="btn-3d w-full py-2 bg-gradient-to-b from-yellow-300 to-yellow-600 text-black font-black text-xs uppercase tracking-widest rounded-lg relative z-20">
                                Unlock Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full h-full flex flex-col relative overflow-hidden">

                {/* ===== TOPBAR ===== */}
                {view === 'MISSIONS' ? (
                    /* MISSIONS topbar: single row — back | pills | spacer | tabs */
                    <div className={topbarBase} style={topbarStyle}>
                        <div className="flex items-center gap-1.5 px-3 h-[38px]">
                            <div className="round-btn shrink-0" onClick={onClose}>
                                <i className="ti ti-arrow-left"></i>
                            </div>
                            <div className="currency-pill flex items-center gap-1 shrink-0">
                                <div className="coin">$</div>
                                <span className="num">{fmt(Math.floor(balance))}</span>
                            </div>
                            <div className="currency-pill flex items-center gap-1 shrink-0">
                                <div className="gem"></div>
                                <span className="num">{fmt(diamonds)}</span>
                            </div>
                            <div className="flex-1"></div>
                            {/* Tabs — right side */}
                            <div className="flex items-center gap-0.5 shrink-0">
                                {(['DAILY', 'WEEKLY', 'MONTHLY'] as MissionFrequency[]).map(tab => {
                                    const unclaimedCount = missionState.activeMissions.filter(m => m.frequency === tab && m.completed && !m.claimed).length;
                                    return (
                                        <button key={tab} onClick={() => setActiveTab(tab)}
                                            className={`relative px-2 py-1 rounded-md font-black uppercase text-[9px] leading-none transition-all ${activeTab === tab ? 'btn-3d bg-gradient-to-b from-fuchsia-500 to-purple-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            {tab === 'DAILY' ? 'Daily' : tab === 'WEEKLY' ? 'Weekly' : 'Monthly'}
                                            {unclaimedCount > 0 && (
                                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border border-white/60"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* PASS topbar: back | coins | gems | title + XP | spacer | action buttons */
                    <div className={topbarBase} style={topbarStyle}>
                        <div className="flex items-center gap-1.5 px-3 h-[40px]">
                            <div className="round-btn shrink-0" onClick={() => setView('MISSIONS')}>
                                <i className="ti ti-arrow-left"></i>
                            </div>
                            <div className="currency-pill flex items-center gap-1 shrink-0">
                                <div className="coin">$</div>
                                <span className="num">{fmt(Math.floor(balance))}</span>
                            </div>
                            <div className="currency-pill flex items-center gap-1 shrink-0">
                                <div className="gem"></div>
                                <span className="num">{fmt(diamonds)}</span>
                            </div>
                            {/* Pass level + XP bar */}
                            <div className="flex items-center gap-1.5 ml-1 shrink-0">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center shadow-md">
                                    <span className="font-black text-[10px] text-white">{missionState.passLevel}</span>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <span className="text-white font-black text-[9px] uppercase leading-none">Season Pass</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <div className="w-16 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                                            <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all" style={{ width: `${(missionState.passXP / missionState.passXpToNext) * 100}%` }}></div>
                                        </div>
                                        <span className="text-yellow-300 font-mono text-[7px]">{missionState.passXP}/{missionState.passXpToNext}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1"></div>
                            {/* Action buttons — all same size */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={jumpToCurrentLevel}
                                    className={`${passBtn} bg-gradient-to-b from-white/20 to-white/5 text-white`}
                                    style={{ ...passBtnSize, border: '1px solid rgba(255,255,255,0.2)' }}>
                                    JUMP
                                </button>
                                <button onClick={rewardsToClaimCount > 0 ? onClaimAll : undefined}
                                    className={`${passBtn} ${rewardsToClaimCount > 0 ? 'bg-gradient-to-b from-green-400 to-green-700 text-white' : 'text-gray-500'}`}
                                    style={{ ...passBtnSize, background: rewardsToClaimCount > 0 ? undefined : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {rewardsToClaimCount > 0 ? `CLAIM(${rewardsToClaimCount})` : 'CLAIM'}
                                </button>
                                <button onClick={onBuyLevel}
                                    className={`${passBtn} bg-gradient-to-b from-indigo-500 to-indigo-800 text-white`}
                                    style={passBtnSize}>
                                    +LVL💎100
                                </button>
                                {!missionState.isPremium ? (
                                    <button onClick={() => setShowPremiumInfo(true)}
                                        className={`${passBtn} bg-gradient-to-b from-yellow-300 to-yellow-600 text-black`}
                                        style={passBtnSize}>
                                        PREMIUM
                                    </button>
                                ) : (
                                    <div className="flex items-center justify-center text-yellow-300 font-black text-[9px]" style={passBtnSize}>
                                        👑 VIP
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== CONTENT ===== */}

                {view === 'MISSIONS' && (
                    <div className="flex-1 flex items-stretch p-3 gap-3 overflow-hidden bg-gradient-to-b from-[#1a1025] to-[#0d0814]">
                        {currentMissions.map((mission) => (
                            <div key={mission.id}
                                className={`flex-1 flex flex-col gap-2 rounded-xl p-3 relative overflow-hidden shadow-lg border ${mission.completed ? 'bg-gradient-to-b from-[#0a2e0a] to-[#0e1c0e] border-green-900/40' : 'bg-gradient-to-b from-[#2a233e] to-[#1a1230] border-white/5'}`}>
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>

                                {/* Icon */}
                                <div className="flex-1 bg-black/30 rounded-xl flex items-center justify-center shrink-0 shadow-inner mx-auto relative z-10 min-h-0" style={{ fontSize: 'clamp(3rem, 8vw, 5rem)' }}>
                                    {mission.type === 'SPIN_COUNT' ? '🎰' : mission.type === 'WIN_COINS' ? '💰' : mission.type === 'BET_COINS' ? '🪙' : mission.type === 'BIG_WIN_COUNT' ? '🏆' : mission.type === 'LEVEL_UP' ? '⬆️' : '⭐'}
                                </div>

                                {/* Label */}
                                <div className="text-fuchsia-400 text-[9px] font-bold uppercase text-center leading-none relative z-10">Mission</div>

                                {/* Description */}
                                <div className="text-white font-black text-[12px] leading-snug text-center flex-1 relative z-10">{mission.description}</div>

                                {/* Progress */}
                                <div className="flex items-center gap-1.5 relative z-10">
                                    <div className="flex-1 h-2 bg-black rounded-full overflow-hidden">
                                        <div className={`h-full ${mission.completed ? 'bg-green-500' : 'bg-fuchsia-500'}`}
                                            style={{ width: `${Math.min(100, (mission.current / mission.target) * 100)}%` }}></div>
                                    </div>
                                    <span className="text-purple-300 font-mono text-[9px] shrink-0 whitespace-nowrap">
                                        {mission.completed ? '✓' : `${formatNumber(mission.current)}/${formatNumber(mission.target)}`}
                                    </span>
                                </div>

                                {/* Rewards */}
                                <div className="flex items-center justify-between relative z-10">
                                    <span className={`font-mono text-[9px] font-black ${isXpBoosted ? 'text-yellow-400' : 'text-fuchsia-300'}`}>
                                        +{isXpBoosted ? mission.xpReward * missionState.passBoostMultiplier : mission.xpReward} XP
                                    </span>
                                    <span className="text-yellow-300 font-mono text-[9px] font-black">+{formatNumber(mission.coinReward)}</span>
                                </div>

                                {/* Action */}
                                <div className="relative z-10">
                                    {mission.completed ? (
                                        <button onClick={() => onClaimMissionReward(mission)}
                                            className="btn-3d w-full py-1.5 bg-gradient-to-b from-green-500 to-green-700 text-white text-[10px] font-black uppercase rounded-lg">
                                            CLAIM
                                        </button>
                                    ) : (
                                        <button onClick={() => onFinishMission(mission)}
                                            className="btn-3d w-full py-1.5 bg-gradient-to-b from-[#4a2e61] to-[#2e1845] text-cyan-200 text-[9px] font-bold uppercase rounded-lg flex items-center justify-center gap-1">
                                            SKIP 💎{diamondCostToSkip(mission.xpReward)}
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
                    <div className="flex-1 flex flex-col bg-black relative">
                        {/* Scroll arrows */}
                        <div className="absolute top-[45%] left-0 right-0 z-20 pointer-events-none flex justify-between px-2">
                            <button onClick={() => handleScroll('LEFT')} className="btn-3d w-8 h-8 bg-gradient-to-b from-[#6030a8] to-[#3a1870] text-white rounded-full flex items-center justify-center pointer-events-auto text-xs font-black">◀</button>
                            <button onClick={() => handleScroll('RIGHT')} className="btn-3d w-8 h-8 bg-gradient-to-b from-[#6030a8] to-[#3a1870] text-white rounded-full flex items-center justify-center pointer-events-auto text-xs font-black">▶</button>
                        </div>

                        {/* Rewards horizontal scroll */}
                        <div ref={rewardsContainerRef} className="flex-1 overflow-x-auto flex items-stretch p-3 gap-3 no-scrollbar bg-gradient-to-b from-[#1a1025] to-black snap-x">
                            {levels.map((lvl) => {
                                const rewards = missionState.passRewards.filter(r => r.level === lvl);
                                const freeReward = rewards.find(r => r.tier === 'FREE');
                                const premReward = rewards.find(r => r.tier === 'PREMIUM');
                                const isUnlocked = missionState.passLevel >= lvl;

                                return (
                                    <div key={lvl} className="flex-none flex flex-col gap-1 relative snap-center h-full" style={{ width: '110px' }}>
                                        {/* FREE card */}
                                        <div className={`flex-1 bg-gradient-to-b from-[#382952] to-[#231833] rounded-xl p-1.5 flex flex-col items-center justify-between relative shadow ${freeReward?.claimed ? 'opacity-50 grayscale' : ''}`}>
                                            <span className="text-[8px] text-gray-300 uppercase font-bold bg-black/50 px-2 py-0.5 rounded-full mt-0.5">Free</span>
                                            <div className="flex-1 flex flex-col items-center justify-center w-full gap-1">
                                                <div className="text-5xl">{freeReward?.type === 'COINS' ? '🪙' : freeReward?.type === 'DIAMONDS' ? '💎' : '📦'}</div>
                                                <span className="font-black text-white text-[12px] text-center leading-tight drop-shadow-md">{freeReward ? getDisplayValue(freeReward) : ''}</span>
                                            </div>
                                            <button onClick={() => freeReward && onClaimReward(freeReward)} disabled={!isUnlocked || freeReward?.claimed}
                                                className={`btn-3d w-full py-1 text-[9px] font-black uppercase rounded-lg ${isUnlocked && !freeReward?.claimed ? 'bg-gradient-to-b from-green-400 to-green-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                                                {freeReward?.claimed ? 'Claimed' : isUnlocked ? 'Claim' : 'Locked'}
                                            </button>
                                        </div>

                                        {/* LVL label — between the two cards */}
                                        <div className={`text-center font-black text-[10px] shrink-0 py-0.5 ${isUnlocked ? 'text-white' : 'text-gray-600'}`}>LVL {lvl}</div>

                                        {/* PREMIUM card — greyed/grayscale when locked, no blur */}
                                        <div className={`flex-1 bg-gradient-to-b ${missionState.isPremium ? 'from-[#451a03] to-[#2e1065]' : 'from-gray-800 to-black'} rounded-xl p-1.5 flex flex-col items-center justify-between relative shadow ${!missionState.isPremium ? 'grayscale opacity-60' : premReward?.claimed ? 'opacity-50 grayscale' : ''}`}>
                                            <span className={`text-[8px] uppercase font-bold px-2 py-0.5 rounded-full mt-0.5 ${missionState.isPremium ? 'text-yellow-400 bg-black/50' : 'text-gray-500 bg-black/20'}`}>Premium</span>
                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative gap-1">
                                                {!missionState.isPremium && <div className="absolute inset-0 flex items-center justify-center z-10"><span className="text-4xl text-gray-400">🔒</span></div>}
                                                <div className="text-5xl">{premReward?.type === 'COINS' ? '💰' : premReward?.type === 'DIAMONDS' ? '💎' : premReward?.type === 'PICKS' ? '⛏️' : '👑'}</div>
                                                <span className={`font-black text-[12px] text-center leading-tight drop-shadow-md ${missionState.isPremium ? 'text-yellow-100' : 'text-gray-500'}`}>{premReward ? getDisplayValue(premReward) : ''}</span>
                                            </div>
                                            <button onClick={() => premReward && onClaimReward(premReward)} disabled={!isUnlocked || premReward?.claimed || !missionState.isPremium}
                                                className={`btn-3d w-full py-1 text-[9px] font-black uppercase rounded-lg ${isUnlocked && !premReward?.claimed && missionState.isPremium ? 'bg-gradient-to-b from-yellow-300 to-yellow-600 text-black' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
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
    );
};
