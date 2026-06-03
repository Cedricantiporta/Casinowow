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

    const diamondCostToSkip = (xp: number) => Math.ceil(xp / 50) * 10;
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

    return (
        <div className="fixed inset-0 z-[150] flex flex-col bg-[#0d0814] animate-pop-in">
            {showPremiumInfo && (
                <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-3 animate-pop-in">
                    <div className="relative bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-2xl p-0.5 w-full max-w-sm shadow-xl">
                        <div className="bg-gradient-to-b from-black/95 to-black/90 rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                            <button onClick={() => setShowPremiumInfo(false)} className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition z-50 text-xs">✕</button>
                            <h2 className="text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-500 uppercase tracking-widest mb-2">Premium Pass</h2>
                            <div className="text-4xl mb-3 animate-bounce">👑</div>
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

            <div className="w-full h-full flex flex-col relative">

                {/* Header — coins/gems pills + close */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ background:'linear-gradient(180deg,#7c3fb5,#4a1880)', borderBottom:'1.5px solid #38106e' }}>
                    <div className="flex items-center gap-2">
                        {view === 'PASS' && (
                            <button onClick={() => setView('MISSIONS')} className="text-white text-lg font-bold px-1 mr-1 active:scale-95 transition-transform">⬅</button>
                        )}
                        <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                            <div className="coin">$</div>
                            <span className="num font-mono">{fmt(Math.floor(balance))}</span>
                        </div>
                        <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                            <div className="gem"></div>
                            <span className="num font-mono">{fmt(diamonds)}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-sm transition-all hover:bg-white/20 active:scale-95"
                        style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)' }}
                    >✕</button>
                </div>

                {view === 'MISSIONS' && (
                    <div className="flex-1 flex flex-col relative overflow-hidden">
                        {/* Pass level + tab row */}
                        <div className="px-3 py-2 bg-gradient-to-b from-[#1e142b] to-[#120b1c] flex items-center justify-between gap-2 shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shrink-0">
                                    <span className="font-black text-sm text-white">{missionState.passLevel}</span>
                                </div>
                                <div>
                                    <div className="text-purple-300 text-[8px] font-black uppercase tracking-widest">Pass Level</div>
                                    <div className="w-24 h-1.5 bg-black rounded-full mt-0.5 shadow-inner overflow-hidden">
                                        <div className="h-full bg-purple-600" style={{ width: `${(missionState.passXP / missionState.passXpToNext) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setView('PASS')} className="btn-3d bg-gradient-to-b from-fuchsia-500 to-purple-700 text-white font-black uppercase text-[10px] px-3 py-1.5 rounded-lg relative active:scale-95 shrink-0">
                                Rewards
                                {rewardsToClaimCount > 0 && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] font-black animate-pulse">{rewardsToClaimCount}</div>}
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex justify-center py-2 shrink-0">
                            <div className="bg-black/40 p-0.5 rounded-lg flex shadow-inner">
                                {(['DAILY', 'WEEKLY', 'MONTHLY'] as MissionFrequency[]).map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)}
                                        className={`px-3 py-1 rounded-md font-black uppercase tracking-wider text-[10px] transition-all ${activeTab === tab ? 'btn-3d bg-gradient-to-b from-fuchsia-500 to-purple-700 text-white' : 'text-gray-500 hover:text-white'}`}>
                                        {tab.charAt(0) + tab.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-3 pb-3">
                            <div className="flex flex-col gap-2 max-w-xl mx-auto w-full">
                                {currentMissions.map((mission) => (
                                    <div key={mission.id} className={`rounded-xl ${mission.completed ? 'bg-gradient-to-r from-green-950 to-[#0e1c0e]' : 'bg-gradient-to-r from-[#2a233e] to-[#1e172e]'} flex items-center p-2.5 relative overflow-hidden shadow-md group gap-2.5 border border-white/5`}>
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>

                                        <div className="relative z-10 w-10 h-10 bg-black/45 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-inner">
                                            {mission.type === 'SPIN_COUNT' ? '🎰' : mission.type === 'WIN_COINS' ? '💰' : '⭐'}
                                        </div>

                                        <div className="relative z-10 flex-grow min-w-0 pr-1 select-none">
                                            <div className="text-fuchsia-400 text-[8px] font-bold uppercase tracking-widest leading-none">Mission</div>
                                            <div className="text-white font-black text-[11px] leading-snug drop-shadow-sm mb-1 truncate">{mission.description}</div>
                                            <div className="w-full flex items-center gap-1.5">
                                                <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden shadow-inner">
                                                    <div className={`h-full bg-gradient-to-r ${mission.completed ? 'from-green-500 to-emerald-500' : 'from-fuchsia-500 to-purple-500'}`} style={{ width: `${Math.min(100, (mission.current / mission.target) * 100)}%` }}></div>
                                                </div>
                                                <span className="text-purple-300 font-mono text-[9px] font-black shrink-0">{mission.completed ? '100%' : `${mission.current}/${mission.target}`}</span>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex flex-col items-end justify-between self-stretch shrink-0 min-w-[70px] pl-2.5" style={{ borderLeft:'1px solid rgba(255,255,255,0.08)' }}>
                                            <div className="flex flex-col items-end leading-none text-right mb-1.5">
                                                <span className={`font-mono text-[9px] font-black ${isXpBoosted ? 'text-yellow-400' : 'text-fuchsia-300'}`}>
                                                    +{isXpBoosted ? mission.xpReward * missionState.passBoostMultiplier : mission.xpReward} XP
                                                </span>
                                                <span className="text-gold-300 font-mono text-[8px] font-bold mt-0.5">+{formatNumber(mission.coinReward)}</span>
                                            </div>
                                            {mission.completed ? (
                                                <button onClick={() => onClaimMissionReward(mission)} className="btn-3d w-full py-1 bg-gradient-to-b from-green-500 to-green-700 rounded-lg text-white text-[9px] font-black uppercase">CLAIM</button>
                                            ) : (
                                                <button onClick={() => onFinishMission(mission)} className="btn-3d w-full py-1 bg-gradient-to-b from-[#4a2e61] to-[#2e1845] rounded-lg text-cyan-200 text-[9px] font-bold uppercase flex items-center justify-center gap-0.5 active:scale-95">
                                                    <span>Skip</span><span className="text-[8px] text-cyan-300">💎{diamondCostToSkip(mission.xpReward)}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {currentMissions.length === 0 && (
                                    <div className="flex flex-col items-center justify-center bg-white/5 rounded-xl h-36 text-gray-500 font-bold uppercase tracking-widest text-center text-xs p-4 border border-dashed border-white/10">
                                        <span>🎉</span>
                                        <span className="mt-2 text-[10px] tracking-widest text-purple-300">All missions completed</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'PASS' && (
                    <div className="flex-1 flex flex-col bg-black relative">
                        <div className="absolute top-[45%] left-0 right-0 z-20 pointer-events-none flex justify-between px-2">
                            <button onClick={() => handleScroll('LEFT')} className="btn-3d w-8 h-8 bg-gradient-to-b from-[#6030a8] to-[#3a1870] text-white rounded-full flex items-center justify-center pointer-events-auto text-xs font-black">◀</button>
                            <button onClick={() => handleScroll('RIGHT')} className="btn-3d w-8 h-8 bg-gradient-to-b from-[#6030a8] to-[#3a1870] text-white rounded-full flex items-center justify-center pointer-events-auto text-xs font-black">▶</button>
                        </div>

                        {/* Pass header — compact, no separator */}
                        <div className="px-3 py-2 bg-gradient-to-b from-[#1e142b] to-[#0f0816] shrink-0 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-orange-600 flex items-center justify-center shadow shrink-0">
                                    <span className="font-black text-sm text-white">{missionState.passLevel}</span>
                                </div>
                                <div>
                                    <h3 className="text-white font-black uppercase text-[10px] tracking-wider italic leading-none">Season Pass</h3>
                                    <span className="text-gold-400 font-mono text-[9px] font-bold">{missionState.passXP}/{missionState.passXpToNext} XP</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <button onClick={jumpToCurrentLevel} className="btn-3d bg-gradient-to-b from-white/20 to-white/5 text-white text-[8px] font-bold px-2 py-1.5 rounded-lg uppercase" style={{ border:'1px solid rgba(255,255,255,0.15)' }}>
                                    Jump
                                </button>
                                {rewardsToClaimCount > 0 && (
                                    <button onClick={onClaimAll} className="btn-3d bg-gradient-to-b from-green-400 to-green-700 text-white text-[9px] font-black px-2 py-1.5 rounded-lg uppercase">Claim All ({rewardsToClaimCount})</button>
                                )}
                                <button onClick={onBuyLevel} className="btn-3d bg-gradient-to-b from-indigo-600 to-indigo-900 text-white text-[8px] font-bold px-2 py-1.5 rounded-lg uppercase">
                                    +Lvl 💎100
                                </button>
                                {!missionState.isPremium ? (
                                    <button onClick={() => setShowPremiumInfo(true)} className="btn-3d px-2 py-1.5 bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-lg">
                                        <span className="font-black text-black text-[9px] uppercase italic tracking-wider">GET PREMIUM</span>
                                    </button>
                                ) : (
                                    <span className="text-gold-300 font-black uppercase tracking-widest text-[9px] bg-gold-950/40 px-2 py-1 rounded-md">👑 Premium</span>
                                )}
                            </div>
                        </div>

                        <div ref={rewardsContainerRef} className="flex-1 overflow-x-auto flex items-center p-3 gap-3 no-scrollbar bg-gradient-to-b from-[#1a1025] to-black snap-x">
                            {levels.map((lvl) => {
                                const rewards = missionState.passRewards.filter(r => r.level === lvl);
                                const freeReward = rewards.find(r => r.tier === 'FREE');
                                const premReward = rewards.find(r => r.tier === 'PREMIUM');
                                const isUnlocked = missionState.passLevel >= lvl;

                                return (
                                    <div key={lvl} className="flex-none w-32 flex flex-col gap-2 relative snap-center">
                                        <div className={`text-center font-black text-sm ${isUnlocked ? 'text-white' : 'text-gray-600'}`}>LEVEL {lvl}</div>
                                        <div className={`aspect-[3/4] bg-gradient-to-b from-[#382952] to-[#231833] rounded-lg p-1.5 flex flex-col items-center justify-between relative shadow ${freeReward?.claimed ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                                            <div className="flex-1 flex flex-col items-center justify-center w-full">
                                                <div className="text-3xl mb-1">{freeReward?.type === 'COINS' ? '🪙' : freeReward?.type === 'DIAMONDS' ? '💎' : '📦'}</div>
                                                <span className="font-black text-white text-[10px] text-center leading-tight mb-1 drop-shadow-md">{freeReward ? getDisplayValue(freeReward) : ''}</span>
                                                <span className="text-[8px] text-gray-300 uppercase font-bold bg-black/50 px-2 py-0.5 rounded-full">Free</span>
                                            </div>
                                            <button onClick={() => freeReward && onClaimReward(freeReward)} disabled={!isUnlocked || freeReward?.claimed}
                                                className={`btn-3d w-full py-1 text-[9px] font-black uppercase rounded-md ${isUnlocked && !freeReward?.claimed ? 'bg-gradient-to-b from-green-400 to-green-700 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                                                {freeReward?.claimed ? 'Claimed' : isUnlocked ? 'Claim' : 'Locked'}
                                            </button>
                                        </div>
                                        <div className={`aspect-[3/4] bg-gradient-to-b ${missionState.isPremium ? 'from-[#451a03] to-[#2e1065]' : 'from-gray-800 to-black'} rounded-lg p-1.5 flex flex-col items-center justify-between relative shadow ${premReward?.claimed ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                                            <div className="flex-1 flex flex-col items-center justify-center w-full relative">
                                                {!missionState.isPremium && <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-[1px]"><span className="text-3xl text-white">🔒</span></div>}
                                                <div className="text-3xl mb-1">{premReward?.type === 'COINS' ? '💰' : premReward?.type === 'DIAMONDS' ? '💎' : premReward?.type === 'PICKS' ? '⛏️' : '👑'}</div>
                                                <span className={`font-black text-[10px] text-center leading-tight mb-1 drop-shadow-md ${missionState.isPremium ? 'text-gold-100' : 'text-gray-500'}`}>{premReward ? getDisplayValue(premReward) : ''}</span>
                                                <span className={`text-[8px] uppercase font-bold px-2 py-0.5 rounded-full ${missionState.isPremium ? 'text-gold-400 bg-black/50' : 'text-gray-600 bg-black/20'}`}>Premium</span>
                                            </div>
                                            <button onClick={() => premReward && onClaimReward(premReward)} disabled={!isUnlocked || premReward?.claimed || !missionState.isPremium}
                                                className={`btn-3d w-full py-1 text-[9px] font-black uppercase rounded-md ${isUnlocked && !premReward?.claimed && missionState.isPremium ? 'bg-gradient-to-b from-yellow-300 to-yellow-600 text-black' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
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
