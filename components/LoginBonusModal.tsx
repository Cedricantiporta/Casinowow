import React from 'react';
import { DAILY_LOGIN_REWARDS, DAILY_LOGIN_DAYS_PER_STOP, DAILY_LOGIN_STOPS, formatKShort } from '../constants';

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
    if (!isOpen) return null;

    // "Today" is only truly claimable while claimedToday is false — once claimed,
    // currentDay has already advanced to tomorrow's (locked) day.
    const isPendingTomorrow = claimedToday;
    const activeDay = currentDay;
    const reward = DAILY_LOGIN_REWARDS.find(r => r.day === activeDay) ?? DAILY_LOGIN_REWARDS[0];
    const stopIndex = reward.stop; // 0-based, 0..DAILY_LOGIN_STOPS-1
    const dayInStop = ((activeDay - 1) % DAILY_LOGIN_DAYS_PER_STOP) + 1;
    const coins = reward.multiplier * (maxBet ?? 0);

    const stopHasCoins = (stopMultiplier: number) => stopMultiplier > 0;

    return (
        <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop-in">
            <div
                className="w-full max-w-[380px] flex flex-col rounded-3xl overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}
            >
                {/* Header — no title/text, just the close button */}
                <div className="shrink-0 flex justify-end px-3 pt-3">
                    {onClose && (
                        <button className="round-btn cursor-pointer" onClick={onClose}><i className="ti ti-x" /></button>
                    )}
                </div>

                {/* 6-stop streak progress bar */}
                <div className="px-5 pt-1 pb-3">
                    <div className="relative flex items-center justify-between">
                        {/* Track line, behind the icons */}
                        <div className="absolute left-0 right-0 rounded-full" style={{ top: '50%', height: 4, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)' }} />
                        <div className="absolute left-0 rounded-full" style={{
                            top: '50%', height: 4, transform: 'translateY(-50%)',
                            width: `${(Math.min(stopIndex, DAILY_LOGIN_STOPS - 1) / (DAILY_LOGIN_STOPS - 1)) * 100}%`,
                            background: 'linear-gradient(90deg,#facc15,#fde047)',
                        }} />
                        {Array.from({ length: DAILY_LOGIN_STOPS }, (_, i) => {
                            const stopDef = DAILY_LOGIN_REWARDS[i * DAILY_LOGIN_DAYS_PER_STOP];
                            const isDone = i < stopIndex;
                            const isCurrent = i === stopIndex;
                            const isFuture = i > stopIndex;
                            return (
                                <div key={i} className="relative flex flex-col items-center gap-1" style={{ zIndex: 1 }}>
                                    <div
                                        className={`relative rounded-full flex items-center justify-center ${isCurrent ? 'animate-bounce-sm' : ''}`}
                                        style={{
                                            width: isCurrent ? 40 : 32, height: isCurrent ? 40 : 32,
                                            background: isDone
                                                ? 'linear-gradient(180deg,#4ade80,#16a34a)'
                                                : isCurrent
                                                ? 'linear-gradient(180deg,#fde047,#f59e0b)'
                                                : 'rgba(0,0,0,0.35)',
                                            boxShadow: isCurrent ? '0 0 14px rgba(250,204,21,0.8)' : 'inset 0 1px 2px rgba(0,0,0,0.4)',
                                            opacity: isFuture ? 0.5 : 1,
                                        }}
                                    >
                                        {isDone ? (
                                            <i className="ti ti-check text-white" style={{ fontSize: 16 }} />
                                        ) : (
                                            <img src={GIFT_ICON} alt="" style={{ width: '68%', height: '68%', objectFit: 'contain' }} />
                                        )}
                                    </div>
                                    <span className="font-black text-white/70" style={{ fontSize: 8 }}>
                                        Day {stopDef.day + DAILY_LOGIN_DAYS_PER_STOP - 1}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Current stop reward + claim */}
                <div className="px-4 pb-4">
                    <div className="rounded-2xl p-4 flex flex-col items-center gap-2"
                        style={{ background: 'rgba(0,0,0,0.25)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                        <span className="font-black text-white/70 uppercase tracking-widest" style={{ fontSize: 9 }}>
                            Day {activeDay} of {DAILY_LOGIN_DAYS_PER_STOP * DAILY_LOGIN_STOPS} · Stop {stopIndex + 1}/{DAILY_LOGIN_STOPS} ({dayInStop}/{DAILY_LOGIN_DAYS_PER_STOP})
                        </span>
                        <div className="flex items-center gap-4">
                            {stopHasCoins(reward.multiplier) && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <img src="/ui/collect.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                                    <span className="font-black text-white" style={{ fontSize: 13 }}>{formatKShort(coins)}</span>
                                </div>
                            )}
                            {reward.gems > 0 && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <img src="/symbols/diamond.png" alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                                    <span className="font-black text-cyan-200" style={{ fontSize: 13 }}>{reward.gems}</span>
                                </div>
                            )}
                        </div>
                        {isPendingTomorrow ? (
                            <div className="w-full text-center rounded-full mt-1" style={{ background: 'rgba(0,0,0,0.35)', padding: '7px 8px' }}>
                                <span className="font-black text-white/70" style={{ fontSize: 10 }}>Come back tomorrow</span>
                            </div>
                        ) : (
                            <button onClick={onClaim} className="pill-green w-full mt-1">
                                <div className="pill-face" style={{ padding: '7px 8px', fontSize: '11px' }}>Claim</div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
