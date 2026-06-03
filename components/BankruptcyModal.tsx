import React from 'react';
import { formatNumber } from '../constants';

interface BankruptcyModalProps {
    isOpen: boolean;
    onCollect: () => void;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({ isOpen, onCollect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md animate-pop-in">
            <div className="relative w-full max-w-xs p-3">
                {/* Card Container */}
                <div className="relative bg-gradient-to-b from-red-800 to-red-950 rounded-2xl p-5 flex flex-col items-center text-center shadow-[0_0_30px_rgba(220,38,38,0.4)] overflow-hidden">
                    
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                    <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-500 rounded-full blur-3xl opacity-30"></div>
                    
                    <div className="relative z-10 flex flex-col items-center w-full">
                        <div className="text-4xl mb-2 animate-bounce">💸</div>
                        
                        <h2 className="text-lg font-black font-display text-white uppercase tracking-widest mb-1 drop-shadow-lg">
                            Ran Out of Coins?
                        </h2>
                        
                        <p className="text-red-200 font-bold text-xs mb-3 leading-tight">
                            Don't worry! Here's a rescue bonus to keep you spinning.
                        </p>

                        {/* Reward Display */}
                        <div className="bg-black/40 rounded-xl p-3 mb-4 w-full backdrop-blur-sm shadow-inner">
                            <div className="text-3xl font-mono font-black text-yellow-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                {formatNumber(100000)}
                            </div>
                            <div className="text-white text-[9px] uppercase mt-1 font-bold tracking-widest">Free Coins</div>
                        </div>

                        <button 
                            onClick={onCollect}
                            className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md active:scale-95 transition-all"
                        >
                            COLLECT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
