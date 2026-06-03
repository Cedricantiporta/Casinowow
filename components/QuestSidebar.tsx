
import React, { useState, useEffect } from 'react';
import { QuestState } from '../types';
import { formatTime } from '../constants';

interface QuestSidebarProps {
    quest: QuestState;
    onClaim: () => void;
    xpMultiplier?: number;
    xpBoostEndTime?: number;
    picks?: number;
}

export const QuestSidebar: React.FC<QuestSidebarProps> = ({ quest, onClaim, xpMultiplier = 1, xpBoostEndTime = 0, picks = 0 }) => {
    const isMax = quest.credits >= quest.max;

    const getIcon = () => {
        if (quest.activeGame === 'DICE') return '🎲';
        if (quest.activeGame === 'WILD') return '🗿';
        return '🗺️'; // Default
    };

    const getLabel = () => {
        if (quest.activeGame === 'DICE') return 'DICE';
        if (quest.activeGame === 'WILD') return 'WILD';
        return 'QUEST';
    }

    return (
        <div className="flex flex-col items-center gap-1 self-center pointer-events-auto relative">
            {/* Quest Button - Clean Circle, Icon Only */}
            <button 
                onClick={onClaim}
                className={`
                    relative w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer overflow-visible
                    hover:scale-105 active:scale-95
                    ${isMax ? 'bg-gradient-to-b from-fuchsia-600 to-purple-900' : 'bg-gradient-to-b from-[#2a1b3d] to-[#1a1025]'}
                `}
            >
                 {/* Always show Icon */}
                <div className="flex flex-col items-center justify-center">
                    <span className="text-2xl md:text-4xl drop-shadow-md mb-1">{getIcon()}</span>
                    <span className="absolute bottom-2 text-[8px] md:text-[10px] font-black text-white uppercase tracking-wider drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-10">
                        {getLabel()}
                    </span>
                </div>

                 {/* Credits Counter Badge */}
                 {isMax ? (
                    <div className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg border-2 border-white z-20 animate-pulse">
                        MAX
                    </div>
                 ) : quest.credits > 0 && (
                    <div className="absolute -top-2 -right-2 min-w-[24px] h-6 px-1 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg border-2 border-white z-20">
                        {Math.floor(quest.credits)}
                    </div>
                 )}
            </button>
            
            {isMax && (
                <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase drop-shadow-md animate-pulse shadow-lg border border-green-400">
                    COLLECT
                </span>
            )}
        </div>
    );
};
