import React from 'react';
import { DAILY_LOGIN_REWARDS, formatK } from '../constants';

interface LoginBonusModalProps {
    isOpen: boolean;
    currentDay: number;
    maxBet: number;
    onClaim: () => void;
}

export const LoginBonusModal: React.FC<LoginBonusModalProps> = ({ isOpen, currentDay, maxBet, onClaim }) => {
    if (!isOpen) return null;

    const row1 = DAILY_LOGIN_REWARDS.slice(0, 3);
    const row2 = DAILY_LOGIN_REWARDS.slice(3, 7);

    const renderDayCard = (reward: typeof DAILY_LOGIN_REWARDS[0]) => {
        const isToday = reward.day === currentDay;
        const isPast = reward.day < currentDay;
        const isFuture = reward.day > currentDay;
        const isGoldenDay = reward.day === 7;
        const coins = reward.multiplier * maxBet;

        return (
            <div
                key={reward.day}
                className={`
                    relative rounded-xl p-1.5 flex flex-col items-center justify-between overflow-hidden shadow-md transition-all h-24 md:h-28 w-full
                    ${isGoldenDay ? 'bg-gradient-to-b from-yellow-500 via-gold-600 to-yellow-800 shadow-[0_0_20px_rgba(255,215,0,0.5)] animate-pulse' : ''}
                    ${isToday && !isGoldenDay ? 'bg-gradient-to-b from-blue-600 to-blue-800 z-10 shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-105' : ''}
                    ${isPast ? 'bg-gray-800 grayscale opacity-60' : ''}
                    ${isFuture && !isGoldenDay ? 'bg-[#2e2a5a]' : ''}
                `}
            >
                <div className={`text-[8px] font-black uppercase px-2 rounded-full mb-0.5 shadow-sm ${isGoldenDay ? 'bg-black text-gold-400' : isToday ? 'bg-white text-black' : 'bg-black/40 text-white'}`}>
                    Day {reward.day}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center w-full">
                    <div className={`text-2xl md:text-3xl mb-0.5 drop-shadow-md ${isToday ? 'animate-bounce' : ''}`}>
                        {reward.day === 7 ? '👑' : reward.gems > 0 ? '💎' : '💰'}
                    </div>
                    <div className={`font-black text-[10px] md:text-sm leading-tight ${isGoldenDay ? 'text-black' : isToday ? 'text-white' : 'text-indigo-100'}`}>
                        {formatK(coins)}
                    </div>
                    {reward.gems > 0 && (
                        <div className={`font-bold text-[8px] md:text-[9px] mt-0.5 ${isGoldenDay ? 'text-red-950' : isToday ? 'text-cyan-200' : 'text-cyan-400'}`}>
                            + {reward.gems} Gems
                        </div>
                    )}
                </div>

                {isToday && (
                    <button
                        onClick={onClaim}
                        className="w-full py-1 bg-green-500 hover:bg-green-400 text-white font-black uppercase text-[8px] rounded-md shadow-md animate-pulse mt-0.5"
                    >
                        Claim
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
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-md animate-pop-in">
            <div className="relative w-full max-w-sm p-3">
                <div className="bg-gradient-to-b from-indigo-900 to-[#1e1b4b] rounded-2xl p-4 shadow-[0_0_30px_rgba(79,70,229,0.4)] flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.1)_20deg,transparent_40deg)] animate-[spin_15s_linear_infinite] pointer-events-none"></div>

                    <h2 className="text-sm md:text-base font-black font-display text-white uppercase tracking-widest mb-0.5 drop-shadow-lg opacity-90">
                        Daily Login Bonus
                    </h2>
                    <p className="text-indigo-300 text-[9px] md:text-[10px] font-bold uppercase tracking-wide mb-3 opacity-80">
                        Come back every day for bigger rewards!
                    </p>

                    <div className="grid grid-cols-3 gap-1.5 w-full max-w-xs mb-2">
                        {row1.map(reward => renderDayCard(reward))}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 w-full max-w-sm">
                        {row2.map(reward => renderDayCard(reward))}
                    </div>
                </div>
            </div>
        </div>
    );
};
