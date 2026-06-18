import React from 'react';
import { DAILY_LOGIN_REWARDS, formatCommaNumber, formatKShort } from '../constants';

interface LoginBonusModalProps {
    isOpen: boolean;
    currentDay: number;
    maxBet?: number;
    onClaim: () => void;
}

export const LoginBonusModal: React.FC<LoginBonusModalProps> = ({ isOpen, currentDay, maxBet, onClaim }) => {
    if (!isOpen) return null;

    const row1 = DAILY_LOGIN_REWARDS.slice(0, 3);
    const row2 = DAILY_LOGIN_REWARDS.slice(3, 7);

    const innerCardBase: React.CSSProperties = {
        background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(160,60,255,0.3) 10%,rgba(10,0,50,0.75) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)',
    };

    const renderDayCard = (reward: typeof DAILY_LOGIN_REWARDS[0]) => {
        const isToday = reward.day === currentDay;
        const isPast = reward.day < currentDay;
        const isGoldenDay = reward.day === 7;
        const coins = reward.multiplier * (maxBet ?? 0);

        let cardStyle: React.CSSProperties = { ...innerCardBase };
        let cardExtra = '';

        if (isPast) {
            cardStyle = { ...innerCardBase, opacity: 0.5, filter: 'grayscale(1)' };
        } else if (isGoldenDay) {
            cardStyle = {
                ...innerCardBase,
                boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,200,50,0.6), 0 0 12px rgba(255,200,50,0.4)',
            };
            cardExtra = 'animate-pulse';
        } else if (isToday) {
            cardStyle = {
                ...innerCardBase,
                boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5), 0 0 0 2px rgba(160,220,255,0.5)',
                transform: 'scale(1.05)',
            };
        }

        return (
            <div
                key={reward.day}
                className={`relative rounded-xl p-1.5 flex flex-col items-center justify-between overflow-hidden transition-all h-24 md:h-28 w-full ${cardExtra}`}
                style={cardStyle}
            >
                <div className={`text-[8px] font-black px-2 rounded-full mb-0.5 shadow-sm ${isGoldenDay ? 'bg-black text-yellow-400' : isToday ? 'bg-white text-black' : 'bg-black/40 text-white'}`}>
                    Day {reward.day}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center w-full">
                    <div className={`text-2xl md:text-3xl mb-0.5 drop-shadow-md ${isToday ? 'animate-bounce' : ''}`}>
                        {reward.day === 7 ? '👑' : reward.gems > 0 ? '💎' : '💰'}
                    </div>
                    <div className={`font-black text-[10px] md:text-sm leading-tight ${isGoldenDay ? 'text-yellow-300' : isToday ? 'text-white' : 'text-indigo-100'}`}>
                        {formatKShort(coins)}
                    </div>
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

                {isPast && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-2xl">✅</span>
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
                    background: 'linear-gradient(180deg,#9030d8 0%,#6018a8 18%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}
            >
                {/* Header */}
                <div className="shrink-0 px-4 pt-3 pb-1 text-center">
                    <h2 className="font-black text-white text-sm">Daily Login Bonus</h2>
                    <p className="text-purple-300/70 text-[10px] mt-0.5">Come back every day for bigger rewards!</p>
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
