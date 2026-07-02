import React from 'react';
import { DAILY_LOGIN_REWARDS, DAILY_LOGIN_DAYS_PER_STOP, DAILY_LOGIN_STOPS, DAILY_LOGIN_TOTAL_DAYS, formatKShort } from '../constants';

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
    const isGoldenDay = activeDay === DAILY_LOGIN_TOTAL_DAYS;

    // Continuous fill across the full 30-day track — reaches a stop's node
    // only once that stop's last day is actually claimed, not the instant
    // the player enters that stop.
    const daysCompleted = isPendingTomorrow ? activeDay - 1 : activeDay - 1 + (dayInStop - 1) / DAILY_LOGIN_DAYS_PER_STOP;
    const fillPct = Math.min(100, (daysCompleted / DAILY_LOGIN_TOTAL_DAYS) * 100);

    const innerCardBase: React.CSSProperties = {
        background: 'linear-gradient(180deg,rgba(197,16,224,0.32) 0%,rgba(160,60,255,0.22) 20%,rgba(10,0,50,0.75) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)',
    };

    let cardStyle: React.CSSProperties = { ...innerCardBase };
    if (isGoldenDay && !isPendingTomorrow) {
        cardStyle = {
            background: 'linear-gradient(180deg,rgba(255,215,50,0.55) 0%,rgba(180,100,0,0.98) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,245,150,0.6), 0 3px 10px rgba(0,0,0,0.5)',
        };
    } else if (isPendingTomorrow) {
        cardStyle = { ...innerCardBase, opacity: 0.6 };
    }

    return (
        <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop-in">
            <div
                className="w-full max-w-[420px] flex flex-col rounded-3xl overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}
            >
                {/* Header */}
                <div className="relative shrink-0 px-4 pt-4 pb-1 text-center">
                    {onClose && (
                        <button className="round-btn cursor-pointer absolute top-3 right-3" onClick={onClose}><i className="ti ti-x" /></button>
                    )}
                    <h2 className="font-tanker text-white text-base">Daily Login Bonus</h2>
                    <p className="text-purple-300/70 text-[10px] mt-0.5">Come back every day for bigger rewards!</p>
                </div>

                {/* 6-stop streak progress bar (no circle containers, continuous fill) */}
                <div className="px-6 pt-4 pb-2">
                    <div className="relative" style={{ height: 34 }}>
                        <div className="absolute left-0 right-0 rounded-full" style={{ top: 4, height: 4, background: 'rgba(0,0,0,0.35)' }} />
                        <div className="absolute left-0 rounded-full" style={{
                            top: 4, height: 4,
                            width: `${fillPct}%`,
                            background: 'linear-gradient(90deg,#facc15,#fde047)',
                        }} />
                        {Array.from({ length: DAILY_LOGIN_STOPS }, (_, i) => {
                            const stopDay = (i + 1) * DAILY_LOGIN_DAYS_PER_STOP;
                            const isDone = daysCompleted >= stopDay;
                            const leftPct = (stopDay / DAILY_LOGIN_TOTAL_DAYS) * 100;
                            return (
                                <div key={i} className="absolute flex flex-col items-center gap-1" style={{ left: `${leftPct}%`, top: 0, transform: 'translateX(-50%)' }}>
                                    <div className="rounded-full shrink-0" style={{ width: 10, height: 10, marginTop: -3, background: isDone ? '#facc15' : 'rgba(255,255,255,0.3)', boxShadow: isDone ? '0 0 8px rgba(250,204,21,0.8)' : 'none' }} />
                                    <img src={GIFT_ICON} alt="" style={{ width: 18, height: 18, objectFit: 'contain', opacity: isDone ? 1 : 0.45, filter: isDone ? 'none' : 'grayscale(1)' }} />
                                    <span className="font-black text-white/70" style={{ fontSize: 8 }}>Day {stopDay}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Current day reward card */}
                <div className="px-4 pb-4 pt-2">
                    <div
                        className="relative rounded-2xl p-4 flex flex-col items-center justify-between overflow-hidden transition-all"
                        style={cardStyle}
                    >
                        <div className={`text-[9px] font-black px-2.5 py-1 rounded-full mb-1.5 shadow-sm ${isGoldenDay ? 'bg-black text-yellow-400' : 'bg-white text-black'}`}>
                            Day {activeDay} of {DAILY_LOGIN_TOTAL_DAYS}
                        </div>

                        <div className="flex items-center gap-5 my-1">
                            {reward.multiplier > 0 && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <img src="/ui/collect.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                                    <span className={`font-black ${isGoldenDay ? 'text-yellow-300' : 'text-white'}`} style={{ fontSize: 14 }}>{formatKShort(coins)}</span>
                                </div>
                            )}
                            {reward.gems > 0 && (
                                <div className="flex flex-col items-center gap-0.5">
                                    <img src="/symbols/diamond.png" alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                                    <span className={`font-black ${isGoldenDay ? 'text-yellow-200' : 'text-cyan-200'}`} style={{ fontSize: 14 }}>{reward.gems}</span>
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
