import React from 'react';
import { formatNumber } from '../constants';

interface BankruptcyModalProps {
    isOpen: boolean;
    onCollect: () => void;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({ isOpen, onCollect }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop-in">
            <div
                className="w-full max-w-xs flex flex-col rounded-3xl overflow-hidden"
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}
            >
                {/* Header */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-2.5">
                    <h2 className="font-black text-white text-sm">Ran Out of Coins?</h2>
                </div>

                {/* Body */}
                <div className="px-4 pb-4 flex flex-col gap-3">
                    <p className="text-purple-200/80 text-xs leading-tight">
                        Don't worry! Here's a rescue bonus to keep you spinning.
                    </p>

                    {/* Reward Display */}
                    <div
                        className="rounded-2xl p-3 flex flex-col items-center"
                        style={{
                            background: 'linear-gradient(180deg,rgba(197,16,224,0.32) 0%,rgba(160,60,255,0.22) 20%,rgba(10,0,50,0.75) 100%)',
                            boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div className="text-yellow-300 font-black text-2xl">
                            {formatNumber(100000)}
                        </div>
                        <div className="text-purple-200/70 text-[9px] font-bold mt-0.5">Free Coins</div>
                    </div>

                    <button onClick={onCollect} className="pill-green w-full">
                        <div className="pill-face">Collect</div>
                    </button>
                </div>
            </div>
        </div>
    );
};
