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

    const games = [
        {
            key: 'wild',
            icon: '/ui/coinmine.png',
            label: 'Wild Quest',
            credits: wildCredits,
            accentColor: '#a855f7',
            bg: isQuestLocked ? 'rgba(255,255,255,0.04)' : 'rgba(120,40,200,0.18)',
            labelColor: '#e9d5ff',
            creditColor: '#c084fc',
            onOpen: onOpenWildQuest,
        },
        {
            key: 'dice',
            icon: '/ui/dice.png',
            label: 'Dice Quest',
            credits: diceCredits,
            accentColor: '#3b82f6',
            bg: isQuestLocked ? 'rgba(255,255,255,0.04)' : 'rgba(40,100,200,0.18)',
            labelColor: '#bfdbfe',
            creditColor: '#60a5fa',
            onOpen: onOpenDiceQuest,
        },
    ];

    return (
        <div className="absolute inset-0 z-[160] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#0f0025 0%,#1a0040 50%,#090015 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3">
                <span className="font-black text-xl tracking-widest flex-1"
                    style={{ background: 'linear-gradient(180deg,#e8b8ff,#c060ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Mini Games
                </span>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}
                    style={{ background: 'linear-gradient(180deg,#a060ff,#6020c0)', boxShadow: '0 2px 0 #3010a0' }}>
                    <i className="ti ti-x"></i>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center gap-4 px-4 pb-4">
                {games.map(game => (
                    <button
                        key={game.key}
                        onClick={() => { if (!isQuestLocked) { onClose(); setTimeout(game.onOpen, 50); } }}
                        className="relative flex flex-col items-center rounded-2xl py-7 px-4 active:scale-[0.97] transition-transform"
                        style={{
                            background: game.bg,
                            opacity: isQuestLocked ? 0.5 : 1,
                            flex: '1 1 0',
                            minHeight: '200px',
                            maxWidth: '160px',
                            gap: '14px',
                        }}>
                        {questBadge(game.credits)}
                        <img
                            src={game.icon}
                            alt=""
                            style={{
                                width: '5rem',
                                height: '5rem',
                                objectFit: 'contain',
                                flexShrink: 0,
                                filter: isQuestLocked ? 'grayscale(1)' : `drop-shadow(0 0 14px ${game.accentColor}99)`,
                            }}
                        />
                        <div className="flex flex-col items-center gap-1 text-center">
                            <span className="font-black text-sm uppercase tracking-widest" style={{ color: game.labelColor }}>{game.label}</span>
                            {!isQuestLocked && game.credits > 0 && (
                                <span className="text-xs font-bold" style={{ color: game.creditColor }}>{game.credits} / 60</span>
                            )}
                            {isQuestLocked && <span className="text-[10px] text-gray-500 font-bold">Unlocks at Lv.20</span>}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
