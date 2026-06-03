
import React, { useEffect, useState } from 'react';
import { formatTime, formatCommaNumber } from '../constants';

interface TimeBonusModalProps {
    isOpen: boolean;
    onClose: () => void;
    timers: { id: number; endTime: number; reward: number; label: string }[];
    onClaim: (id: number, reward: number) => void;
}

export const TimeBonusModal: React.FC<TimeBonusModalProps> = ({ isOpen, onClose, timers, onClaim }) => {
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        if (isOpen) {
            const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getTimerColor = (id: number) => {
        // 0: Quick(Blue), 1: Daily(Red), 2: Mega(Gold)
        if (id === 0) return { bg: 'bg-blue-900/40', text: 'text-blue-300', btn: 'bg-blue-600' };
        if (id === 1) return { bg: 'bg-red-900/40', text: 'text-red-300', btn: 'bg-red-600' };
        return { bg: 'bg-yellow-900/40', text: 'text-yellow-300', btn: 'bg-yellow-600' };
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center animate-pop-in">
            <div className="relative w-full h-full p-0">
                {/* Main Card - FULLSCREEN PURPLE BG */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#4c1d95] via-[#3b0764] to-[#2e1065] p-4 md:p-6 flex flex-col items-center text-center shadow-[0_0_40px_rgba(147,51,234,0.4)] overflow-auto">
                    
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
                    
                    <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 bg-black/20 hover:bg-black/40 rounded-full text-white font-bold flex items-center justify-center z-50 text-xs">✕</button>

                    <h2 className="relative z-10 text-xl md:text-2xl font-black font-display text-white uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] mb-1 text-shadow-lg">Golden Treasury</h2>
                    <p className="relative z-10 text-purple-200 font-bold text-[10px] md:text-xs uppercase tracking-wide mb-4">Wait longer for bigger rewards!</p>

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 w-full px-4 md:px-8">
                        {timers.map((timer) => {
                            const timeLeft = Math.max(0, timer.endTime - currentTime);
                            const isReady = timeLeft === 0;
                            const colors = getTimerColor(timer.id);

                            return (
                                <div key={timer.id} className={`rounded-xl p-2.5 ${colors.bg} shadow-md flex flex-col items-center justify-between min-h-[140px] relative group overflow-hidden transition-all`}>
                                    {isReady && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent animate-shine pointer-events-none"></div>}
                                    <div className={`text-[9px] font-black uppercase ${colors.text} tracking-widest bg-black/40 px-2 py-0.5 rounded-full mb-1.5`}>{timer.label}</div>
                                    <div className={`text-4xl md:text-5xl transition-transform duration-300 ${isReady ? 'scale-110 animate-bounce' : 'opacity-50 grayscale scale-90'}`}>
                                        {timer.id === 0 ? '💎' : timer.id === 1 ? '🧧' : '👑'}
                                    </div>
                                    <div className="mt-2 w-full">
                                        <div className="text-sm md:text-base font-black text-white drop-shadow-md mb-1.5 font-mono">
                                            {formatCommaNumber(timer.reward)}
                                        </div>
                                        <button 
                                            onClick={() => isReady ? onClaim(timer.id, timer.reward) : null}
                                            disabled={!isReady}
                                            className={`w-full py-1.5 rounded-lg font-black uppercase text-[10px] tracking-wider shadow-md transition-all ${isReady ? `${colors.btn} text-white hover:scale-105 cursor-pointer` : 'bg-gray-800/80 text-gray-500 cursor-default'}`}
                                        >
                                            {isReady ? 'COLLECT' : formatTime(timeLeft)}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
