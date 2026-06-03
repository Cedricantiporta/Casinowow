import React from 'react';

interface FeatureUnlockModalProps {
    isOpen: boolean;
    featureName: string;
    icon: string;
    description: string;
    onOpenFeature: () => void;
    onClose: () => void;
}

export const FeatureUnlockModal: React.FC<FeatureUnlockModalProps> = ({ isOpen, featureName, icon, description, onOpenFeature, onClose }) => {
    if (!isOpen) return null;

    const handleGoTo = () => {
        onOpenFeature();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-lg animate-pop-in">
            <div className="relative w-full max-w-xs p-3">
                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full blur-[60px] opacity-30 animate-pulse"></div>

                <div className="relative bg-gradient-to-b from-indigo-900 to-purple-900 rounded-xl p-5 flex flex-col items-center text-center shadow-xl overflow-hidden">

                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>

                    <h2 className="text-lg font-black font-display text-white uppercase tracking-widest mb-1 drop-shadow-lg animate-bounce">
                        UNLOCKED!
                    </h2>

                    <div className="my-4 relative">
                        <div className="text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse">{icon}</div>
                    </div>

                    <h3 className="text-sm font-black text-indigo-200 uppercase tracking-wide mb-1">{featureName}</h3>
                    <p className="text-white text-xs font-bold mb-4 leading-tight">{description}</p>

                    <div className="flex flex-col gap-2 w-full relative z-10">
                        <button
                            onClick={handleGoTo}
                            className="btn-3d w-full py-2.5 bg-gradient-to-b from-green-400 to-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-lg"
                        >
                            GO TO {featureName}
                        </button>
                        <button
                            onClick={onClose}
                            className="btn-3d w-full py-2 bg-gradient-to-b from-white/20 to-white/5 text-white text-xs font-black uppercase tracking-widest rounded-lg"
                            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
