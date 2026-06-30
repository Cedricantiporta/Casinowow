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

    const games = [
        {
            key: 'wild',
            icon: '/ui/coinmine.png',
            label: 'Coin Mine',
            blurb: 'Dig for coins, gems and multipliers',
            credits: wildCredits,
            glow: 'rgba(168,85,247,0.55)',
            onOpen: onOpenWildQuest,
        },
        {
            key: 'dice',
            icon: '/ui/dice.png',
            label: 'Dice Roll',
            blurb: 'Roll across the board for big rewards',
            credits: diceCredits,
            glow: 'rgba(56,189,248,0.55)',
            onOpen: onOpenDiceQuest,
        },
    ];

    return (
        <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none"
            onClick={onClose}>
            <div className="w-full max-w-sm rounded-3xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}>

                {/* Header */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 relative">
                    <span className="absolute left-0 right-0 text-center text-white font-tanker text-base drop-shadow pointer-events-none">Quest</span>
                    <button className="round-btn cursor-pointer shrink-0 ml-auto z-10" onClick={onClose}><i className="ti ti-x" /></button>
                </div>

                {/* Tiles */}
                <div className="flex gap-2.5 px-4 pb-5 pt-1">
                    {games.map(game => (
                        <div key={game.key} className="tcard flex flex-col items-center flex-1 gap-2.5 p-3 relative">
                            {/* Credit badge */}
                            {!isQuestLocked && game.credits > 0 && (
                                <div className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 z-10"
                                    style={{
                                        background: 'radial-gradient(circle at 40% 28%, #ff7070, #cc0000 60%, #990000)',
                                        boxShadow: 'inset 0 2px 2px rgba(255,255,255,0.65), inset 0 -1px 2px rgba(0,0,0,0.5), 0 2px 5px rgba(0,0,0,0.9)',
                                    }}>
                                    <span className="font-black text-white leading-none" style={{ fontSize: 9 }}>{game.credits > 60 ? 60 : game.credits}</span>
                                </div>
                            )}

                            <div className={`flex items-center justify-center ${isQuestLocked ? 'grayscale opacity-60' : ''}`} style={{ width: 80, height: 80 }}>
                                <img src={game.icon} alt=""
                                    style={{ width: 80, height: 80, objectFit: 'contain', filter: isQuestLocked ? undefined : `drop-shadow(0 0 12px ${game.glow})` }} />
                            </div>

                            <div className="font-black text-white text-center" style={{ fontSize: 13 }}>{game.label}</div>
                            <div className="text-white/55 text-center" style={{ fontSize: 10, lineHeight: 1.3, minHeight: 26 }}>{game.blurb}</div>

                            <button
                                onClick={() => { if (!isQuestLocked) { onClose(); setTimeout(game.onOpen, 50); } }}
                                disabled={isQuestLocked}
                                className={`pill-green w-full ${isQuestLocked ? 'opacity-40' : ''}`}>
                                <div className="pill-face" style={{ padding: '6px 10px', fontSize: '10px' }}>
                                    {isQuestLocked ? 'Lv.20' : !isQuestLocked && game.credits > 0 ? `Play ${game.credits}/60` : 'Play'}
                                </div>
                            </button>
                        </div>
                    ))}
                </div>

                {isQuestLocked && (
                    <div className="text-center text-white/50 pb-4" style={{ fontSize: 10, marginTop: -8 }}>
                        Unlocks at level 20
                    </div>
                )}
            </div>
        </div>
    );
};
