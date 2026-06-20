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
            }, 2000);
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
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop-in select-none">
            <div className="w-full max-w-[260px] flex flex-col rounded-3xl overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}>
                {/* Header */}
                <div className="shrink-0 px-4 pt-3 pb-1 text-center">
                    <h2 className="text-sm font-black text-white">You Won Free Spins!</h2>
                </div>

                {/* Body */}
                <div className="flex flex-col items-center justify-center px-4 py-2 text-center">
                    <div className="text-5xl font-black text-white animate-bounce">
                        {count}
                    </div>
                    <div className="text-sm font-black text-purple-200/80 tracking-wider mt-1">
                        Spins
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 px-4 pb-3">
                    <button onClick={handleStartNow} className="pill-green w-full">
                        <div className="pill-face">Start Now</div>
                    </button>
                </div>
            </div>
        </div>
    );
};
