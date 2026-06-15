
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
        <div className="flex flex-col gap-2 pointer-events-auto relative">
            {/* Wild Card */}
            <button
                onClick={onClaim}
                className="relative flex items-center gap-2 px-2 py-2 rounded-xl shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#2a1b3d,#1a1025)', minWidth: 80 }}
            >
                <img src="/ui/coinmine.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }} />
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-[9px] font-black text-white uppercase tracking-wide">Mine</span>
                    <span className="text-[8px] text-purple-300 font-bold">{Math.floor(wildCredits)}/{MAX_CREDITS}</span>
                </div>
                {wildCredits > 0 && (
                    <div className={DOT} style={DOT_STYLE}>
                        {wildFull ? 'MAX' : Math.floor(wildCredits)}
                    </div>
                )}
            </button>

            {/* Dice Card */}
            <button
                onClick={onClaim}
                className="relative flex items-center gap-2 px-2 py-2 rounded-xl shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#1a2b3d,#101a25)', minWidth: 80 }}
            >
                <img src="/ui/dice.png" alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }} />
                <div className="flex flex-col items-start leading-tight">
                    <span className="text-[9px] font-black text-white uppercase tracking-wide">Dice</span>
                    <span className="text-[8px] text-blue-300 font-bold">{Math.floor(diceCredits)}/{MAX_CREDITS}</span>
                </div>
                {diceCredits > 0 && (
                    <div className={DOT} style={DOT_STYLE}>
                        {diceFull ? 'MAX' : Math.floor(diceCredits)}
                    </div>
                )}
            </button>
        </div>
    );
};
