import React, { useEffect, useState } from 'react';

interface SimpleCelebrationModalProps {
    isOpen: boolean;
    message: string;
    onClose: () => void;
}

export const SimpleCelebrationModal: React.FC<SimpleCelebrationModalProps> = ({ isOpen, message, onClose }) => {
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCanClose(false);
            const timer = setTimeout(() => setCanClose(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, message]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[300] flex items-center justify-center transition-all ${canClose ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
            onClick={canClose ? onClose : undefined}
        >
            <div className="animate-pop-in flex flex-col items-center">
                <h2 className="text-3xl md:text-4xl font-black font-display text-white text-center mb-1 drop-shadow-[0_4px_4px_rgba(0,0,0,1)]" style={{ textShadow: '0 0 10px black, 0 0 20px black' }}>
                    {message}
                </h2>
                <div className="text-white font-black uppercase tracking-[0.2em] text-lg md:text-xl animate-pulse drop-shadow-[0_2px_2px_rgba(0,0,0,1)]" style={{ textShadow: '0 0 5px black, 0 0 15px black' }}>
                    CLAIMED
                </div>
                {canClose && (
                    <div className="mt-3 text-white/70 text-xs font-bold uppercase tracking-widest animate-pulse" style={{ textShadow: '0 0 4px black' }}>
                        tap to close
                    </div>
                )}
            </div>
        </div>
    );
};
