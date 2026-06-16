
import React from 'react';
import { QuestState } from '../types';

interface QuestSidebarProps {
    quest: QuestState;
    onClaim: () => void;
    xpMultiplier?: number;
    xpBoostEndTime?: number;
    picks?: number;
}

const MAX_CREDITS = 60;
const DOT = 'absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center text-white text-[9px] font-black shadow-lg z-20';
const DOT_STYLE = { background: '#dc2626', border: '1.5px solid #f0c000' };

export const QuestSidebar: React.FC<QuestSidebarProps> = ({ quest, onClaim }) => {
    const wildCredits = quest.wildCredits ?? 0;
    const diceCredits = quest.diceCredits ?? 0;
    const wildFull = wildCredits >= MAX_CREDITS;
    const diceFull = diceCredits >= MAX_CREDITS;

    return (
        <div className="flex flex-col items-center gap-2 pointer-events-auto relative">
            {/* Mine Button */}
            <button
                onClick={onClaim}
                className="group relative w-20 h-20 rounded-full shadow-xl flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all overflow-visible"
                style={{ background: 'linear-gradient(180deg,#2a1b3d,#1a1025)' }}
            >
                <img src="/ui/coinmine.png" alt="" style={{ width: 50, height: 50, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="absolute bottom-2 text-[8px] md:text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">Mine</span>
                {wildCredits > 0 && (
                    <div className={DOT} style={DOT_STYLE}>
                        {wildFull ? 'MAX' : Math.floor(wildCredits)}
                    </div>
                )}
            </button>

            {/* Dice Button */}
            <button
                onClick={onClaim}
                className="group relative w-20 h-20 rounded-full shadow-xl flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all overflow-visible"
                style={{ background: 'linear-gradient(180deg,#1a2b3d,#101a25)' }}
            >
                <img src="/ui/dice.png" alt="" style={{ width: 50, height: 50, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }} className="group-hover:-translate-y-0.5 transition-transform" />
                <span className="absolute bottom-2 text-[8px] md:text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">Dice</span>
                {diceCredits > 0 && (
                    <div className={DOT} style={DOT_STYLE}>
                        {diceFull ? 'MAX' : Math.floor(diceCredits)}
                    </div>
                )}
            </button>
        </div>
    );
};
