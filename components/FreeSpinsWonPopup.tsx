import React, { useEffect, useRef } from 'react';

interface FreeSpinsWonPopupProps {
    isOpen: boolean;
    count: number;
    onComplete: () => void;
}

export const FreeSpinsWonPopup: React.FC<FreeSpinsWonPopupProps> = ({ isOpen, count, onComplete }) => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                onComplete();
            }, 2000); // 2 Seconds
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isOpen, onComplete]);

    const handleStartNow = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        onComplete();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-pop-in">
            <div className="relative bg-gradient-to-b from-yellow-300 to-orange-500 p-0.5 rounded-xl shadow-[0_0_30px_rgba(255,165,0,0.5)]">
                 <div className="bg-gradient-to-b from-yellow-500 to-orange-600 rounded-xl p-5 md:p-8 flex flex-col items-center text-center min-w-[240px] md:min-w-[320px] shadow-inner relative overflow-hidden">
                    
                    {/* Background Rays */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.2)_20deg,transparent_40deg)] animate-[spin_10s_linear_infinite]"></div>

                    <div className="relative z-10 flex flex-col items-center gap-1">
                        
                        <h2 className="text-sm md:text-base font-black font-display text-white uppercase tracking-widest drop-shadow-[0_2px_0_rgba(0,0,0,0.3)] mb-1">
                            YOU WON FREE
                        </h2>

                        <div className="text-5xl md:text-6xl font-black font-display text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] my-2 animate-bounce">
                            {count}
                        </div>

                        <div className="text-sm md:text-base font-black font-display text-white uppercase tracking-[0.3em] drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">
                            SPINS
                        </div>

                        <button 
                            onClick={handleStartNow}
                            className="mt-4 px-6 py-1.5 bg-gradient-to-r from-red-600 to-red-500 text-white font-black uppercase text-xs tracking-widest rounded-lg shadow hover:scale-105 active:scale-95 transition-transform z-20"
                        >
                            Start Now
                        </button>
                    </div>
                 </div>
            </div>
        </div>
    );
};
