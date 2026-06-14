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
        <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
            <div className="animate-pop-in flex flex-col items-center">
                <div
                    className="flex items-center justify-center px-6 py-2"
                    style={{ background: 'transparent', borderRadius: 0 }}
                >
                    <span
                        className="text-2xl md:text-3xl font-black"
                        style={{
                            fontFamily: "'Archivo Black', sans-serif",
                            color: '#ffffff',
                            textShadow: '2px 2px 0 #000, 0 0 8px rgba(0,0,0,0.9)',
                            WebkitTextStroke: '1.5px #000',
                            paintOrder: 'stroke fill',
                        }}
                    >
                        {message}
                    </span>
                </div>
            </div>
        </div>
    );
};
