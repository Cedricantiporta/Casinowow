import React, { useState } from 'react';
import { DAILY_LOGIN_REWARDS, DAILY_LOGIN_TOTAL_DAYS, formatKShort } from '../constants';

interface LoginBonusModalProps {
    isOpen: boolean;
    currentDay: number;
    claimedToday?: boolean;
    maxBet?: number;
    onClaim: () => void;
    onClose?: () => void;
}

const GIFT_ICON = '/ui/gift_store.png';

export const LoginBonusModal: React.FC<LoginBonusModalProps> = ({ isOpen, currentDay, claimedToday = false, maxBet, onClaim, onClose }) => {
    // Default to the milestone currently reached (if unclaimed) or the next one coming up.
    const defaultDay = DAILY_LOGIN_REWARDS.find(r => r.day >= currentDay)?.day ?? DAILY_LOGIN_REWARDS[0].day;
    const [selectedDay, setSelectedDay] = useState<number>(defaultDay);

    if (!isOpen) return null;

    const selected = DAILY_LOGIN_REWARDS.find(r => r.day === selectedDay) || DAILY_LOGIN_REWARDS[0];
    const isReached = currentDay >= selected.day;
    const isCurrent = currentDay === selected.day;
    const isClaimed = currentDay > selected.day || (isCurrent && claimedToday);
    const canClaim = isCurrent && !claimedToday;
    const coins = selected.multiplier * (maxBet ?? 0);

    return (
        <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop-in">
            <div
                className="w-full max-w-[380px] flex flex-col rounded-3xl overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}
            >
                {/* Header */}
                <div className="relative shrink-0 px-4 pt-4 pb-1 text-center">
                    {onClose && (
                        <button className="round-btn cursor-pointer absolute top-2 right-3" onClick={onClose}><i className="ti ti-x" /></button>
                    )}
                    <h2 className="font-tanker text-white text-base">Daily Login Bonus</h2>
                    <p className="text-purple-300/70 font-bold" style={{ fontSize: 10 }}>Day {currentDay} of {DAILY_LOGIN_TOTAL_DAYS} — tap a milestone to view its reward</p>
                </div>

                {/* Streak bar — tap an icon to preview/claim its reward */}
                <div className="px-5 pt-4 pb-2">
                    <div className="relative flex items-center justify-between" style={{ height: 46 }}>
                        <div className="absolute left-0 right-0 rounded-full" style={{ top: '50%', height: 4, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)' }} />
                        <div className="absolute left-0 rounded-full" style={{
                            top: '50%', height: 4, transform: 'translateY(-50%)',
                            width: `${Math.min(100, (currentDay / DAILY_LOGIN_TOTAL_DAYS) * 100)}%`,
                            background: 'linear-gradient(90deg,#facc15,#fde047)',
                        }} />
                        {DAILY_LOGIN_REWARDS.map(r => {
                            const done = currentDay > r.day || (currentDay === r.day && claimedToday);
                            const ready = currentDay === r.day && !claimedToday;
                            const isSel = selectedDay === r.day;
                            return (
                                <div key={r.day} onClick={() => setSelectedDay(r.day)}
                                    className={`relative flex flex-col items-center justify-center shrink-0 cursor-pointer transition-transform ${ready ? 'animate-bounce-sm' : ''}`}
                                    style={{ zIndex: 1, width: 38, height: 38, transform: isSel ? 'scale(1.15)' : 'scale(1)' }}>
                                    <img src={GIFT_ICON} alt="" style={{
                                        width: '100%', height: '100%', objectFit: 'contain',
                                        filter: done || ready ? 'drop-shadow(0 0 8px rgba(250,204,21,0.8))' : 'grayscale(1)',
                                    }} />
                                    {done && (
                                        <i className="ti ti-check absolute text-green-400" style={{ fontSize: 12, top: -2, right: -2, background: '#111', borderRadius: '50%', padding: 1 }} />
                                    )}
                                    <span className="absolute font-black text-white" style={{
                                        fontSize: 9, bottom: -13,
                                        textShadow: '0 0 3px #000, 0 1px 2px #000, 0 0 6px #000',
                                    }}>{r.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected milestone reward */}
                <div className="px-4 pb-4 pt-3">
                    <div className="relative rounded-2xl p-4 flex flex-col items-center gap-2"
                        style={{
                            background: selected.day === DAILY_LOGIN_TOTAL_DAYS
                                ? 'linear-gradient(180deg,rgba(255,215,50,0.55) 0%,rgba(180,100,0,0.98) 100%)'
                                : 'rgba(0,0,0,0.25)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                        }}>
                        <span className="font-black text-white/70 uppercase tracking-widest" style={{ fontSize: 9 }}>
                            Day {selected.day} Streak
                        </span>
                        <div className="flex items-center gap-4">
                            {selected.multiplier > 0 && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <img src="/ui/collect.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain', opacity: isReached ? 1 : 0.5 }} />
                                    <span className="font-black text-white" style={{ fontSize: 14 }}>{formatKShort(coins)}</span>
                                </div>
                            )}
                            {selected.gems > 0 && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <img src="/symbols/diamond.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain', opacity: isReached ? 1 : 0.5 }} />
                                    <span className="font-black text-cyan-200" style={{ fontSize: 14 }}>{selected.gems}</span>
                                </div>
                            )}
                        </div>
                        {isClaimed ? (
                            <div className="w-full text-center rounded-full mt-1" style={{ background: 'rgba(0,0,0,0.35)', padding: '7px 8px' }}>
                                <span className="font-black text-green-400 flex items-center justify-center gap-1" style={{ fontSize: 10 }}><i className="ti ti-check" />Claimed</span>
                            </div>
                        ) : canClaim ? (
                            <button onClick={onClaim} className="pill-green w-full mt-1">
                                <div className="pill-face" style={{ padding: '7px 8px', fontSize: '11px' }}>Claim</div>
                            </button>
                        ) : (
                            <div className="w-full text-center rounded-full mt-1" style={{ background: 'rgba(0,0,0,0.35)', padding: '7px 8px' }}>
                                <span className="font-black text-white/50" style={{ fontSize: 10 }}>Reach Day {selected.day} to unlock</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
