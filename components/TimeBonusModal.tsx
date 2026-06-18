
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

    const getBtnStyle = (id: number, isReady: boolean) => {
        if (!isReady) return { background: 'rgba(0,0,0,0.4)', color: '#555', boxShadow: 'none', cursor: 'default' as const };
        if (id === 0) return { background: 'linear-gradient(180deg,#5fa8ff,#2b7fe8)', boxShadow: '0 3px 0 #13408a', color: '#fff', cursor: 'pointer' as const };
        if (id === 1) return { background: 'linear-gradient(180deg,#ff5a5a,#c81010)', boxShadow: '0 3px 0 #8a0000', color: '#fff', cursor: 'pointer' as const };
        return { background: 'linear-gradient(180deg,#ffe066,#d48800)', boxShadow: '0 3px 0 #7a5000', color: '#000', cursor: 'pointer' as const };
    };

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-pop-in select-none">
        <div className="w-full max-w-[480px] flex flex-col rounded-3xl overflow-hidden"
            style={{ background: 'linear-gradient(180deg,#9030d8 0%,#6018a8 18%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-2.5">
                <span className="text-white font-black text-base flex-1">Golden Treasury</span>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x"></i></div>
            </div>

            {/* Body */}
            <div className="flex gap-3 px-4 pb-5 pt-1">
                {timers.map((timer) => {
                    const timeLeft = Math.max(0, timer.endTime - currentTime);
                    const isReady = timeLeft === 0;

                    return (
                        <div key={timer.id} className="flex flex-col items-center flex-1 gap-2 rounded-2xl p-3"
                            style={{ background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(160,60,255,0.3) 10%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)' }}>
                            <div className={`transition-all duration-300 ${isReady ? 'scale-105' : 'brightness-50 grayscale'}`}>
                                <img
                                    src={timer.id === 0 ? '/ui/double.png' : timer.id === 1 ? '/ui/roller.png' : '/ui/jackpot.png'}
                                    alt=""
                                    style={{ width: '96px', height: '96px', objectFit: 'contain' }}
                                />
                            </div>
                            <div className="text-[10px] font-black text-white/80 tracking-wider text-center">{timer.label}</div>
                            <div className="text-sm font-black text-white text-center drop-shadow-md">{formatCommaNumber(timer.reward)}</div>
                            <button
                                onClick={() => isReady ? onClaim(timer.id, timer.reward) : undefined}
                                disabled={!isReady}
                                className="btn-3d w-full py-1.5 rounded-xl font-black uppercase text-xs tracking-wider"
                                style={getBtnStyle(timer.id, isReady)}
                            >
                                {isReady ? 'Collect' : formatTime(timeLeft)}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
        </div>
    );
};
