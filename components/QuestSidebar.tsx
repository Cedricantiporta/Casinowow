
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
    const wildFull = quest.wildCredits >= MAX_CREDITS;
    const diceFull = quest.diceCredits >= MAX_CREDITS;

    return (
        <div className="flex flex-col items-center gap-1.5 self-center pointer-events-auto relative">
            {/* Wild Button */}
            <button
                onClick={onClaim}
                className="relative w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all cursor-pointer overflow-visible hover:scale-105 active:scale-95 bg-gradient-to-b from-[#2a1b3d] to-[#1a1025]"
            >
                <span className="text-xl drop-shadow-md leading-none">🗿</span>
                <span className="text-[7px] font-black text-white uppercase tracking-wider mt-0.5">WILD</span>
                {quest.wildCredits > 0 && (
                    <div className={DOT} style={DOT_STYLE}>
                        {wildFull ? 'MAX' : Math.floor(quest.wildCredits)}
                    </div>
                )}
            </button>

            {/* Dice Button */}
            <button
                onClick={onClaim}
                className="relative w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all cursor-pointer overflow-visible hover:scale-105 active:scale-95 bg-gradient-to-b from-[#2a1b3d] to-[#1a1025]"
            >
                <span className="text-xl drop-shadow-md leading-none">🎲</span>
                <span className="text-[7px] font-black text-white uppercase tracking-wider mt-0.5">DICE</span>
                {quest.diceCredits > 0 && (
                    <div className={DOT} style={DOT_STYLE}>
                        {diceFull ? 'MAX' : Math.floor(quest.diceCredits)}
                    </div>
                )}
            </button>
        </div>
    );
};
