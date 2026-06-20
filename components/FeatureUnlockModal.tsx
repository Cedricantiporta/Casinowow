import React, { useEffect } from 'react';
import { audioService } from '../services/audioService';

interface FeatureUnlockModalProps {
    isOpen: boolean;
    featureName: string;
    icon: string;
    description: string;
    onOpenFeature: () => void;
    onClose: () => void;
}

export const FeatureUnlockModal: React.FC<FeatureUnlockModalProps> = ({ isOpen, featureName, icon, description, onOpenFeature, onClose }) => {
    useEffect(() => { if (isOpen) audioService.playUnlock(); }, [isOpen]);
    useEffect(() => {
        if (!isOpen) return;
        const t = setTimeout(onClose, 2000);
        return () => clearTimeout(t);
    }, [isOpen, onClose]);
    if (!isOpen) return null;

    const handleGoTo = () => {
        onOpenFeature();
        onClose();
    };

    return (
        <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in">
            <div
                className="w-full max-w-xs flex flex-col rounded-3xl overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}
            >
                {/* Header */}
                <div className="shrink-0 px-4 py-2.5">
                    <h2 className="font-black text-white text-sm">Feature Unlocked</h2>
                </div>

                {/* Body */}
                <div className="px-4 pb-4 flex flex-col items-center text-center gap-3">
                    {/* Icon */}
                    <div className="drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse">
                        {icon.startsWith('/') ? (
                            <img src={icon} alt={featureName} className="w-16 h-16 object-contain" />
                        ) : (
                            <span className="text-5xl">{icon}</span>
                        )}
                    </div>

                    <div>
                        <h3 className="text-white font-black text-sm">{featureName}</h3>
                        <p className="text-purple-200/80 text-xs mt-1 leading-tight">{description}</p>
                    </div>

                    <div className="flex flex-col gap-2 w-full">
                        <button onClick={handleGoTo} className="pill-green w-full">
                            <div className="pill-face">Open {featureName}</div>
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2 rounded-full text-white/60 text-xs font-bold"
                        >
                            Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
