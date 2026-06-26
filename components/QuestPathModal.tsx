import React from 'react';
import { GAMES_CONFIG, formatK } from '../constants';

const THEME_PNG: Partial<Record<string, string>> = {
    DRAGON: '/dragon/dragon-11.png',
    EGYPT:  '/egypt/wild.png',
    NEON:   '/symbols/seven.png',
    CANDY:  '/candy/sugar1.png',
    PIRATE: '/pirate/skull.png',
    PIGGY:  '/piggy/pig.png',
    ARCTIC: '/arctic/penguin.png',
    SPACE:  '/space/alien.png',
};

interface QuestPathModalProps {
    isOpen: boolean;
    onClose: () => void;
    pathSlotIds: string[];
    currentPathIndex: number;
    onPlaySlot: (slotId: string) => void;
    rewardCoins: number;
}

export const QuestPathModal: React.FC<QuestPathModalProps> = ({
    isOpen, onClose, pathSlotIds, currentPathIndex, onPlaySlot, rewardCoins,
}) => {
    if (!isOpen) return null;

    const pathGames = pathSlotIds
        .map(id => GAMES_CONFIG.find(g => g.id === id))
        .filter(Boolean) as typeof GAMES_CONFIG;

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none"
            onClick={onClose}>
            <div className="w-full max-w-[560px] rounded-3xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}>

                {/* Header */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 relative">
                    <span className="absolute left-0 right-0 text-center text-white font-tanker text-base drop-shadow pointer-events-none">Quest Path</span>
                    <div className="flex items-center z-10">
                        <span className="font-black text-white/60" style={{ fontSize: 10 }}>
                            Stage {Math.min(currentPathIndex + 1, pathGames.length)} / {pathGames.length}
                        </span>
                    </div>
                    <button className="round-btn cursor-pointer shrink-0 ml-auto z-10" onClick={onClose}><i className="ti ti-x" /></button>
                </div>

                {/* Trail */}
                <div className="flex items-center overflow-x-auto no-scrollbar" style={{ padding: '8px 16px 18px', gap: 0 }}>
                    {pathGames.map((game, pi) => {
                        const isDone = pi < currentPathIndex;
                        const isActive = pi === currentPathIndex;
                        const isLocked = pi > currentPathIndex;

                        return (
                            <React.Fragment key={game.id}>
                                <div className="flex flex-col items-center shrink-0" style={{ width: 92, gap: 6 }}>
                                    {/* Stage label */}
                                    <span className={`font-black ${isActive ? 'text-fuchsia-200' : isDone ? 'text-green-300' : 'text-white/30'}`} style={{ fontSize: 10 }}>
                                        Stage {pi + 1}
                                    </span>

                                    {/* Slot card — slot-style chrome (inset highlights, no colored borders) */}
                                    <button
                                        onClick={() => { if (isActive) { onPlaySlot(game.id); onClose(); } }}
                                        className={`relative overflow-hidden ${isActive ? 'active:scale-95 transition-transform' : ''}`}
                                        style={{
                                            width: 78, height: 78, borderRadius: 16,
                                            boxShadow: isActive
                                                ? 'inset 0 3px 0 rgba(220,170,255,0.9), inset 0 -3px 0 rgba(50,0,120,0.8), 0 0 18px rgba(168,85,247,0.7), 0 6px 18px rgba(0,0,0,0.7)'
                                                : 'inset 0 3px 0 rgba(220,170,255,0.5), inset 0 -3px 0 rgba(50,0,120,0.6), 0 4px 12px rgba(0,0,0,0.6)',
                                            filter: isLocked ? 'brightness(0.45) grayscale(0.5)' : isDone ? 'brightness(0.7)' : 'none',
                                            cursor: isActive ? 'pointer' : 'default',
                                            animation: isActive ? 'piggyShake 0.8s ease-in-out infinite' : 'none',
                                        }}>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${game.color}`} style={{ borderRadius: 14 }} />
                                        {game.coverImage ? (
                                            <img src={game.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ borderRadius: 14 }} />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {THEME_PNG[game.theme]
                                                    ? <img src={THEME_PNG[game.theme]} alt="" style={{ width: 46, height: 46, objectFit: 'contain' }} />
                                                    : <span style={{ fontSize: 32 }}>🎰</span>}
                                            </div>
                                        )}
                                        {isDone && (
                                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                                                <i className="ti ti-check text-green-400" style={{ fontSize: 28 }} />
                                            </div>
                                        )}
                                        {isLocked && (
                                            <img src="/ui/lock.png" alt="" className="absolute z-30 pointer-events-none select-none"
                                                style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.95))' }} />
                                        )}
                                        {isActive && (
                                            <div className="absolute top-1 left-0 right-0 flex justify-center">
                                                <span className="font-black text-white" style={{ background: 'rgba(124,58,237,0.92)', borderRadius: 4, padding: '1px 7px', fontSize: 8 }}>Now</span>
                                            </div>
                                        )}
                                    </button>

                                    {/* Game name */}
                                    <span className={`font-bold text-center ${isActive ? 'text-fuchsia-100' : isDone ? 'text-green-200' : 'text-white/30'}`}
                                        style={{ fontSize: 10, maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {game.name}
                                    </span>

                                    {/* Gift reward */}
                                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                                        <img src="/ui/collect.png" alt=""
                                            style={{ width: 36, height: 36, objectFit: 'contain', filter: isDone || isLocked ? 'grayscale(1) brightness(0.4)' : 'drop-shadow(0 2px 6px rgba(251,191,36,0.5))' }} />
                                        <span className={`font-black ${isDone ? 'text-white/30' : isActive ? 'text-amber-300' : 'text-white/40'}`} style={{ fontSize: 10 }}>
                                            {isDone ? 'Claimed' : `+${formatK(rewardCoins)}`}
                                        </span>
                                    </div>

                                    {/* Play button for active stage */}
                                    {isActive && (
                                        <button className="pill-green" onClick={() => { onPlaySlot(game.id); onClose(); }}>
                                            <div className="pill-face" style={{ padding: '4px 12px', fontSize: '10px' }}>Play Now</div>
                                        </button>
                                    )}
                                </div>

                                {/* Connector */}
                                {pi < pathGames.length - 1 && (
                                    <div className="shrink-0 flex items-center justify-center" style={{ width: 18, marginTop: -34 }}>
                                        <i className={`ti ti-chevron-right ${pi < currentPathIndex ? 'text-green-400' : 'text-white/15'}`} style={{ fontSize: 16 }} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
