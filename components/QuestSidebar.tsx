
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
    const activeCredits = quest.activeGame === 'DICE' ? quest.diceCredits : quest.wildCredits;

    const getIcon = () => {
        if (quest.activeGame === 'DICE') return '🎲';
        if (quest.activeGame === 'WILD') return '🗿';
        return '🗺️';
    };

    const getLabel = () => {
        if (quest.activeGame === 'DICE') return 'DICE';
        if (quest.activeGame === 'WILD') return 'WILD';
        return 'QUEST';
    };

    const wildFull = quest.wildCredits >= MAX_CREDITS;
    const diceFull = quest.diceCredits >= MAX_CREDITS;

    return (
        <div className="flex flex-col items-center gap-1 self-center pointer-events-auto relative">
            {/* Quest Button */}
            <button
                onClick={onClaim}
                className="relative w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer overflow-visible hover:scale-105 active:scale-95 bg-gradient-to-b from-[#2a1b3d] to-[#1a1025]"
            >
                <div className="flex flex-col items-center justify-center">
                    <span className="text-2xl md:text-4xl drop-shadow-md mb-1">{getIcon()}</span>
                    <span className="absolute bottom-2 text-[8px] md:text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-10">
                        {getLabel()}
                    </span>
                </div>
                {activeCredits > 0 && (
                    <div className={DOT} style={DOT_STYLE}>
                        {activeCredits >= MAX_CREDITS ? 'FULL' : Math.floor(activeCredits)}
                    </div>
                )}
            </button>

            {/* Per-quest credit pills */}
            <div className="flex gap-1 mt-0.5 justify-center">
                <span className="text-[9px] font-black text-white rounded-full px-1.5 py-0.5 leading-none bg-indigo-900/90"
                    style={wildFull ? { border: '1px solid #f0c000', color: '#fde68a' } : undefined}>
                    🗿 {wildFull ? 'FULL' : quest.wildCredits}
                </span>
                <span className="text-[9px] font-black text-white rounded-full px-1.5 py-0.5 leading-none bg-purple-900/90"
                    style={diceFull ? { border: '1px solid #f0c000', color: '#fde68a' } : undefined}>
                    🎲 {diceFull ? 'FULL' : quest.diceCredits}
                </span>
            </div>
        </div>
    );
};
