import React, { useState } from 'react';
import { DAILY_LOGIN_REWARDS, DAILY_LOGIN_TOTAL_DAYS, LOGIN_STREAK_MILESTONES, formatKShort } from '../constants';

interface LoginBonusModalProps {
    isOpen: boolean;
    currentDay: number;
    claimedToday?: boolean;
    maxBet?: number;
    onClaim: () => void;
    onClose?: () => void;
    currentStreak: number;
    claimedMilestones: number[];
    onClaimMilestone: (days: number) => void;
}

const GIFT_ICON = '/ui/gift_store.png';

export const LoginBonusModal: React.FC<LoginBonusModalProps> = ({
    isOpen, currentDay, claimedToday = false, maxBet, onClaim, onClose,
    currentStreak, claimedMilestones, onClaimMilestone,
}) => {
    const [openMilestone, setOpenMilestone] = useState<number | null>(null);

    if (!isOpen) return null;

    const row1 = DAILY_LOGIN_REWARDS.slice(0, 3);
    const row2 = DAILY_LOGIN_REWARDS.slice(3, 7);

    const innerCardBase: React.CSSProperties = {
        background: 'linear-gradient(180deg,rgba(197,16,224,0.32) 0%,rgba(160,60,255,0.22) 20%,rgba(10,0,50,0.75) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)',
    };

    const renderDayCard = (reward: typeof DAILY_LOGIN_REWARDS[0]) => {
        const isToday = reward.day === currentDay && !claimedToday;
        const isPendingTomorrow = reward.day === currentDay && claimedToday;
        const isPast = reward.day < currentDay;
        const isGoldenDay = reward.day === DAILY_LOGIN_TOTAL_DAYS;
        const coins = reward.multiplier * (maxBet ?? 0);

        let cardStyle: React.CSSProperties = { ...innerCardBase };
        if (isPast) {
            cardStyle = { ...innerCardBase, opacity: 0.5, filter: 'grayscale(1)' };
        } else if (isGoldenDay && !isPendingTomorrow) {
            cardStyle = {
                background: 'linear-gradient(180deg,rgba(255,215,50,0.55) 0%,rgba(180,100,0,0.98) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,245,150,0.6), 0 3px 10px rgba(0,0,0,0.5)',
            };
        } else if (isToday) {
            cardStyle = {
                ...innerCardBase,
                boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5), 0 0 0 2px rgba(160,220,255,0.5)',
                transform: 'scale(1.05)',
            };
        } else if (isPendingTomorrow) {
            cardStyle = { ...innerCardBase, opacity: 0.6 };
        }

        return (
            <div
                key={reward.day}
                className={`relative rounded-xl p-1.5 flex flex-col items-center justify-between overflow-hidden transition-all h-24 md:h-28 w-full`}
                style={cardStyle}
            >
                <div className={`text-[8px] font-black px-2 rounded-full mb-0.5 shadow-sm ${isGoldenDay ? 'bg-black text-yellow-400' : isToday ? 'bg-white text-black' : 'bg-black/40 text-white'}`}>
                    Day {reward.day}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center w-full">
                    <div className="mb-0.5 drop-shadow-md">
                        <img
                            src={reward.gems > 0 ? '/symbols/diamond.png' : '/ui/collect.png'}
                            alt=""
                            style={{ width: 36, height: 36, objectFit: 'contain' }}
                        />
                    </div>
                    {reward.multiplier > 0 && (
                        <div className={`font-black text-[10px] md:text-sm leading-tight ${isGoldenDay ? 'text-yellow-300' : isToday ? 'text-white' : 'text-indigo-100'}`}>
                            {formatKShort(coins)}
                        </div>
                    )}
                    {reward.gems > 0 && (
                        <div className={`font-bold text-[8px] md:text-[9px] mt-0.5 ${isGoldenDay ? 'text-yellow-200' : isToday ? 'text-cyan-200' : 'text-cyan-400'}`}>
                            + {reward.gems} Gems
                        </div>
                    )}
                </div>

                {isToday && (
                    <button onClick={onClaim} className="pill-green w-full">
                        <div className="pill-face" style={{ padding: '5px 8px', fontSize: '9px' }}>Claim</div>
                    </button>
                )}

                {isPendingTomorrow && (
                    <div className="w-full text-center rounded-full" style={{ background: 'rgba(0,0,0,0.35)', padding: '5px 8px' }}>
                        <span className="font-black text-white/70" style={{ fontSize: 9 }}>Tomorrow</span>
                    </div>
                )}

                {isPast && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <i className="ti ti-check text-green-400" style={{ fontSize: 22 }} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop-in" onClick={() => setOpenMilestone(null)}>
            <div
                className="w-full max-w-[380px] flex flex-col rounded-3xl overflow-visible"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}
            >
                {/* Header */}
                <div className="relative shrink-0 px-4 pt-3 pb-1 text-center rounded-t-3xl overflow-hidden">
                    {onClose && (
                        <button className="round-btn cursor-pointer absolute top-2 right-3" onClick={onClose}><i className="ti ti-x" /></button>
                    )}
                    <h2 className="font-tanker text-white text-base">Daily Login Bonus</h2>
                </div>

                {/* SYSTEM 2: 30-day consecutive login streak — independent of the 7-day
                    rewards below. Missing a day resets currentStreak to 0. */}
                <div className="relative px-6 pt-2 pb-3">
                    <div className="flex items-center justify-between px-0.5 mb-1">
                        <span className="font-black text-white/60 uppercase tracking-widest" style={{ fontSize: 8.5 }}>Login Streak</span>
                        <span className="font-black text-yellow-300" style={{ fontSize: 9.5 }}>{currentStreak} Day{currentStreak !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="relative flex items-center justify-between" style={{ height: 34 }}>
                        <div className="absolute left-0 right-0 rounded-full" style={{ top: '50%', height: 3, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)' }} />
                        <div className="absolute left-0 rounded-full" style={{
                            top: '50%', height: 3, transform: 'translateY(-50%)',
                            width: `${Math.min(100, (currentStreak / LOGIN_STREAK_MILESTONES[LOGIN_STREAK_MILESTONES.length - 1].days) * 100)}%`,
                            background: 'linear-gradient(90deg,#facc15,#fde047)',
                        }} />
                        {LOGIN_STREAK_MILESTONES.map(m => {
                            const done = claimedMilestones.includes(m.days);
                            const ready = currentStreak >= m.days && !done;
                            return (
                                <div key={m.days} className="relative flex flex-col items-center justify-center shrink-0" style={{ zIndex: 1, width: 30, height: 30 }}>
                                    <div className={`relative cursor-pointer transition-transform ${ready ? 'animate-bounce-sm' : ''}`}
                                        style={{ width: '100%', height: '100%' }}
                                        onClick={(e) => { e.stopPropagation(); setOpenMilestone(prev => prev === m.days ? null : m.days); }}>
                                        <img src={GIFT_ICON} alt="" style={{
                                            width: '100%', height: '100%', objectFit: 'contain',
                                            filter: done || ready ? 'drop-shadow(0 0 8px rgba(250,204,21,0.8))' : 'grayscale(1)',
                                        }} />
                                        {done && (
                                            <i className="ti ti-check absolute text-green-400" style={{ fontSize: 12, top: -2, right: -2, background: '#111', borderRadius: '50%', padding: 1 }} />
                                        )}
                                    </div>
                                    <span className="absolute font-black text-white" style={{ fontSize: 8, bottom: -12, textShadow: '0 0 3px #000, 0 1px 2px #000' }}>{m.days}</span>

                                    {/* Small anchored popup — not a full modal */}
                                    {openMilestone === m.days && (
                                        <div className="absolute z-10 flex flex-col items-center gap-1.5 rounded-2xl px-3 py-2"
                                            style={{
                                                bottom: '120%', left: '50%', transform: 'translateX(-50%)', width: 120,
                                                background: 'linear-gradient(180deg,#6a1eb0 0%,#380870 100%)',
                                                boxShadow: 'inset 0 1px 0 rgba(180,100,255,0.4), 0 4px 14px rgba(0,0,0,0.85)',
                                            }}
                                            onClick={e => e.stopPropagation()}>
                                            <span className="font-black text-white" style={{ fontSize: 9.5 }}>{m.days}-Day Streak</span>
                                            <div className="flex items-center gap-1.5">
                                                {m.multiplier > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <img src="/ui/collect.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                                                        <span className="font-black text-white" style={{ fontSize: 10.5 }}>{formatKShort(m.multiplier * (maxBet ?? 0))}</span>
                                                    </div>
                                                )}
                                                {m.gems > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <img src="/symbols/diamond.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                                                        <span className="font-black text-cyan-200" style={{ fontSize: 10.5 }}>{m.gems}</span>
                                                    </div>
                                                )}
                                            </div>
                                            {done ? (
                                                <span className="font-black text-green-400 flex items-center gap-1" style={{ fontSize: 9 }}><i className="ti ti-check" />Claimed</span>
                                            ) : ready ? (
                                                <button onClick={() => { onClaimMilestone(m.days); setOpenMilestone(null); }} className="pill-green w-full">
                                                    <div className="pill-face" style={{ padding: '4px 8px', fontSize: '9px' }}>Claim</div>
                                                </button>
                                            ) : (
                                                <span className="font-bold text-white/45" style={{ fontSize: 8.5 }}>Reach day {m.days}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ height: 1, margin: '0 16px', background: 'rgba(255,255,255,0.12)' }} />

                {/* SYSTEM 1: classic 7-day loop */}
                <div className="px-3 pb-4 pt-3 flex flex-col gap-1.5">
                    <div className="grid grid-cols-3 gap-1.5 w-full">
                        {row1.map(reward => renderDayCard(reward))}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 w-full">
                        {row2.map(reward => renderDayCard(reward))}
                    </div>
                </div>
            </div>
        </div>
    );
};
