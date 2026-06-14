import React from 'react';

interface MiniGamesHubProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenWildQuest: () => void;
    onOpenDiceQuest: () => void;
    wildCredits: number;
    diceCredits: number;
    isQuestLocked: boolean;
}

export const MiniGamesHub: React.FC<MiniGamesHubProps> = ({
    isOpen, onClose, onOpenWildQuest, onOpenDiceQuest,
    wildCredits, diceCredits, isQuestLocked,
}) => {
    if (!isOpen) return null;

    const questBadge = (n: number) => n > 0 ? (
        <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center text-white font-black text-[9px] leading-none z-10"
            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>
            {n > 60 ? '60' : n}
        </div>
    ) : null;

    return (
        <div className="fixed inset-0 z-[160] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#0f0025 0%,#1a0040 50%,#090015 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3">
                <span className="font-black text-xl uppercase tracking-widest flex-1"
                    style={{ background: 'linear-gradient(180deg,#e8b8ff,#c060ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Mini Games
                </span>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}
                    style={{ background: 'linear-gradient(180deg,#a060ff,#6020c0)', boxShadow: '0 2px 0 #3010a0' }}>
                    <i className="ti ti-x"></i>
                </div>
            </div>

            <div className="flex-1 px-4 pb-4 grid grid-cols-2 gap-3 content-start pt-2">

                {/* Wild Quest */}
                <button
                    onClick={() => { if (!isQuestLocked) { onClose(); setTimeout(onOpenWildQuest, 50); } }}
                    className="relative flex flex-col items-center justify-center gap-2 rounded-2xl py-8 active:scale-95 transition-transform"
                    style={{
                        background: isQuestLocked ? 'rgba(255,255,255,0.04)' : 'rgba(120,40,200,0.25)',
                        opacity: isQuestLocked ? 0.5 : 1,
                    }}>
                    {questBadge(wildCredits)}
                    <span style={{ fontSize: '3.5rem', lineHeight: 1, filter: isQuestLocked ? 'grayscale(1)' : 'none' }}>🗿</span>
                    <span className="font-black text-[12px] uppercase tracking-widest text-purple-200">Wild Quest</span>
                    {!isQuestLocked && wildCredits > 0 && (
                        <span className="text-[10px] text-purple-300 font-bold">{wildCredits} / 60 credits</span>
                    )}
                    {isQuestLocked && <span className="text-[10px] text-gray-500 font-bold">Unlocks Lvl 20</span>}
                </button>

                {/* Dice Quest */}
                <button
                    onClick={() => { if (!isQuestLocked) { onClose(); setTimeout(onOpenDiceQuest, 50); } }}
                    className="relative flex flex-col items-center justify-center gap-2 rounded-2xl py-8 active:scale-95 transition-transform"
                    style={{
                        background: isQuestLocked ? 'rgba(255,255,255,0.04)' : 'rgba(40,100,200,0.25)',
                        opacity: isQuestLocked ? 0.5 : 1,
                    }}>
                    {questBadge(diceCredits)}
                    <span style={{ fontSize: '3.5rem', lineHeight: 1, filter: isQuestLocked ? 'grayscale(1)' : 'none' }}>🎲</span>
                    <span className="font-black text-[12px] uppercase tracking-widest text-blue-200">Dice Quest</span>
                    {!isQuestLocked && diceCredits > 0 && (
                        <span className="text-[10px] text-blue-300 font-bold">{diceCredits} / 60 credits</span>
                    )}
                    {isQuestLocked && <span className="text-[10px] text-gray-500 font-bold">Unlocks Lvl 20</span>}
                </button>

            </div>
        </div>
    );
};
