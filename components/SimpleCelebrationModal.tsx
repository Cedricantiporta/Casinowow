import React, { useEffect } from 'react';

interface SimpleCelebrationModalProps {
    isOpen: boolean;
    message: string;
    onClose: () => void;
}

export const SimpleCelebrationModal: React.FC<SimpleCelebrationModalProps> = ({ isOpen, message, onClose }) => {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(onClose, 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, message, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
            <div className="animate-pop-in flex flex-col items-center">
                <h2 className="text-3xl md:text-4xl font-black font-display text-white text-center"
                    style={{ textShadow: '0 0 10px black, 0 0 20px black', WebkitTextStroke: '1.5px #000', paintOrder: 'stroke fill' }}>
                    {message}
                </h2>
            </div>
        </div>
    );
};
