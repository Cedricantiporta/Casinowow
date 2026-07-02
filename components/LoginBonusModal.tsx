import React from 'react';
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
    if (!isOpen) return null;

    // "Today" is only truly claimable while claimedToday is false — once claimed,
    // currentDay has already advanced to tomorrow's (locked) day.
    const isPendingTomorrow = claimedToday;
    const activeDay = currentDay;
    const daysCompleted = isPendingTomorrow ? activeDay : activeDay - 1;
    const fillPct = Math.min(100, (daysCompleted / (DAILY_LOGIN_TOTAL_DAYS - 1)) * 100);

    const row1 = DAILY_LOGIN_REWARDS.slice(0, 3);
    const row2 = DAILY_LOGIN_REWARDS.slice(3, 7);

    const innerCardBase: React.CSSProperties = {
        background: 'linear-gradient(180deg,rgba(197,16,224,0.32) 0%,rgba(160,60,255,0.22) 20%,rgba(10,0,50,0.75) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)',
    };

    const renderDayCard = (reward: typeof DAILY_LOGIN_REWARDS[0]) => {
        const isToday = reward.day === activeDay && !isPendingTomorrow;
        const isPending = reward.day === activeDay && isPendingTomorrow;
        const isDone = reward.day < activeDay;
        const isGoldenDay = reward.day === DAILY_LOGIN_TOTAL_DAYS;
        const coins = reward.multiplier * (maxBet ?? 0);

        let cardStyle: React.CSSProperties = { ...innerCardBase };
        if (isDone) {
            cardStyle = { ...innerCardBase, opacity: 0.5, filter: 'grayscale(1)' };
        } else if (isGoldenDay && !isPending) {
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
        } else if (isPending) {
            cardStyle = { ...innerCardBase, opacity: 0.6 };
        }

        return (
            <div
                key={reward.day}
                className="relative rounded-xl p-1.5 flex flex-col items-center justify-between overflow-hidden transition-all h-24 md:h-28 w-full"
                style={cardStyle}
            >
                <div className={`text-[8px] font-black px-2 rounded-full mb-0.5 shadow-sm ${isGoldenDay ? 'bg-black text-yellow-400' : isToday ? 'bg-white text-black' : 'bg-black/40 text-white'}`}>
                    Day {reward.day}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center w-full gap-0.5">
                    {reward.multiplier > 0 && (
                        <>
                            <img src="/ui/collect.png" alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                            <div className={`font-black text-[10px] leading-tight ${isGoldenDay ? 'text-yellow-300' : isToday ? 'text-white' : 'text-indigo-100'}`}>
                                {formatKShort(coins)}
                            </div>
                        </>
                    )}
                    {reward.gems > 0 && (
                        <>
                            <img src="/symbols/diamond.png" alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                            <div className={`font-bold text-[9px] ${isGoldenDay ? 'text-yellow-200' : isToday ? 'text-cyan-200' : 'text-cyan-400'}`}>
                                {reward.gems}
                            </div>
                        </>
                    )}
                </div>

                {isToday && (
                    <button onClick={onClaim} className="pill-green w-full">
                        <div className="pill-face" style={{ padding: '5px 8px', fontSize: '9px' }}>Claim</div>
                    </button>
                )}

                {isDone && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <i className="ti ti-check text-green-400" style={{ fontSize: 22 }} />
                    </div>
                )}
            </div>
        );
    };

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
                <div className="relative shrink-0 px-4 pt-3 pb-0 text-center">
                    {onClose && (
                        <button className="round-btn cursor-pointer absolute top-2 right-3" onClick={onClose}><i className="ti ti-x" /></button>
                    )}
                    <h2 className="font-tanker text-white text-base">Daily Login Bonus</h2>
                </div>

                {/* 7-day streak progress bar — icons only, day number on the icon itself */}
                <div className="px-5 pt-2 pb-1">
                    <div className="relative flex items-center justify-between" style={{ height: 30 }}>
                        <div className="absolute left-0 right-0 rounded-full" style={{ top: '50%', height: 3, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.35)' }} />
                        <div className="absolute left-0 rounded-full" style={{
                            top: '50%', height: 3, transform: 'translateY(-50%)',
                            width: `${fillPct}%`,
                            background: 'linear-gradient(90deg,#facc15,#fde047)',
                        }} />
                        {DAILY_LOGIN_REWARDS.map(reward => {
                            const isDone = daysCompleted >= reward.day;
                            return (
                                <div key={reward.day} className="relative flex items-center justify-center shrink-0" style={{ zIndex: 1, width: 26, height: 26 }}>
                                    <img src={GIFT_ICON} alt="" style={{
                                        width: '100%', height: '100%', objectFit: 'contain',
                                        filter: isDone ? 'drop-shadow(0 0 8px rgba(250,204,21,0.7))' : 'grayscale(1)',
                                    }} />
                                    <span className="absolute font-black text-white" style={{
                                        fontSize: 8, bottom: 0, right: -1,
                                        textShadow: '0 0 3px #000, 0 1px 2px #000, 0 0 6px #000',
                                    }}>{reward.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Day cards */}
                <div className="px-3 pb-4 pt-2 flex flex-col gap-1.5">
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
