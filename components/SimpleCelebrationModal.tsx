import React, { useEffect } from 'react';

interface SimpleCelebrationModalProps {
    isOpen: boolean;
    message: string;
    onClose: () => void;
}

export const SimpleCelebrationModal: React.FC<SimpleCelebrationModalProps> = ({ isOpen, message, onClose }) => {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(onClose, 1800);
            return () => clearTimeout(timer);
        }
    }, [isOpen, message, onClose]);

    if (!isOpen || !message) return null;

    return (
        <div className="absolute inset-0 z-[300] flex items-center justify-center pointer-events-none">
            <div className="animate-pop-in flex flex-col items-center gap-1 rounded-2xl px-7 py-4 text-center"
                style={{ background: 'linear-gradient(180deg,#9333ea 0%,#5b21b6 18%,#2e1065 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>
                <span className="text-purple-300/60 text-[9px] font-black uppercase tracking-widest">Reward</span>
                <span className="font-black text-white text-lg leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    {message}
                </span>
            </div>
        </div>
    );
};
