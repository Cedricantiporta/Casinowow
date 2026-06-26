import React, { useState, useRef, useEffect } from 'react';
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
    maxBet: number;
    allMissionsDone?: boolean;
    onClaim?: () => void;
}

export const QuestPathModal: React.FC<QuestPathModalProps> = ({
    isOpen, onClose, pathSlotIds, currentPathIndex, onPlaySlot, maxBet,
    allMissionsDone = false, onClaim,
}) => {
    const [unlockingIndex, setUnlockingIndex] = useState<number | null>(null);
    const trailRef = useRef<HTMLDivElement>(null);

    // Mousewheel → horizontal scroll
    useEffect(() => {
        const el = trailRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [isOpen]);

    if (!isOpen) return null;

    const pathGames = pathSlotIds
        .map(id => GAMES_CONFIG.find(g => g.id === id))
        .filter(Boolean) as typeof GAMES_CONFIG;

    // Per-stage reward: stage i = maxBet * (i+1) * 10
    const stageReward = (i: number) => maxBet * (i + 1) * 10;
    const grandPrize = maxBet * 100;

    // Total earned = sum of completed stage rewards
    const totalEarned = Array.from({ length: Math.min(currentPathIndex, pathGames.length) }, (_, i) => stageReward(i))
        .reduce((a, b) => a + b, 0);

    const allStagesDone = currentPathIndex >= pathGames.length;

    const handleClaim = () => {
        const nextIdx = currentPathIndex + 1;
        setUnlockingIndex(nextIdx);
        setTimeout(() => setUnlockingIndex(null), 900);
        onClaim?.();
    };

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/10 backdrop-blur-md p-4 animate-pop-in select-none"
            onClick={onClose}>
            <div className="w-full max-w-[560px] rounded-3xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)',
                }}>

                {/* Header — total earned centered, close on right */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-2.5 relative">
                    {totalEarned > 0 && (
                        <div className="absolute left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none">
                            <img src="/new_coinicon.png" alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                            <span className="font-black text-amber-300" style={{ fontSize: 12 }}>+{formatK(totalEarned)} earned</span>
                        </div>
                    )}
                    <button className="round-btn cursor-pointer shrink-0 ml-auto z-10" onClick={onClose}><i className="ti ti-x" /></button>
                </div>

                {/* Trail — horizontal scroll, mousewheel + swipe */}
                <div
                    ref={trailRef}
                    className="flex items-start overflow-x-auto no-scrollbar"
                    style={{ padding: '8px 16px 18px', gap: 0, WebkitOverflowScrolling: 'touch' }}
                >
                    {pathGames.map((game, pi) => {
                        const isDone = pi < currentPathIndex;
                        const isActive = pi === currentPathIndex;
                        const isLocked = pi > currentPathIndex;
                        const isUnlocking = pi === unlockingIndex;
                        const reward = stageReward(pi);

                        return (
                            <React.Fragment key={game.id}>
                                <div className="flex flex-col items-center shrink-0" style={{ width: 92, gap: 6 }}>
                                    {/* Stage label */}
                                    <span className={`font-black ${isActive ? 'text-fuchsia-200' : isDone ? 'text-green-300' : 'text-white/30'}`} style={{ fontSize: 10 }}>
                                        Stage {pi + 1}
                                    </span>

                                    {/* Slot card */}
                                    <button
                                        onClick={() => { if (isActive) { onPlaySlot(game.id); onClose(); } }}
                                        className={`relative overflow-hidden ${isActive ? 'active:scale-95 transition-transform' : ''} ${isUnlocking ? 'animate-pop-in' : ''}`}
                                        style={{
                                            width: 78, height: 78, borderRadius: 16,
                                            boxShadow: isActive
                                                ? 'inset 0 3px 0 rgba(220,170,255,0.9), inset 0 -3px 0 rgba(50,0,120,0.8), 0 0 18px rgba(168,85,247,0.7), 0 6px 18px rgba(0,0,0,0.7)'
                                                : 'inset 0 3px 0 rgba(220,170,255,0.5), inset 0 -3px 0 rgba(50,0,120,0.6), 0 4px 12px rgba(0,0,0,0.6)',
                                            filter: isLocked ? 'brightness(0.45) grayscale(0.5)' : 'none',
                                            cursor: isActive ? 'pointer' : 'default',
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
                                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
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

                                    {/* Reward */}
                                    <div className="flex flex-col items-center" style={{ gap: 2 }}>
                                        <img src="/ui/collect.png" alt=""
                                            style={{ width: 36, height: 36, objectFit: 'contain', filter: isDone || isLocked ? 'grayscale(1) brightness(0.4)' : 'drop-shadow(0 2px 6px rgba(251,191,36,0.5))' }} />
                                        <span className={`font-black ${isDone ? 'text-white/30' : isActive ? 'text-amber-300' : 'text-white/40'}`} style={{ fontSize: 10 }}>
                                            {isDone ? 'Claimed' : `+${formatK(reward)}`}
                                        </span>
                                    </div>

                                    {/* Stage button */}
                                    {isDone && (
                                        <button disabled className="pill-green w-full opacity-40">
                                            <div className="pill-face" style={{ padding: '4px 8px', fontSize: '10px' }}>Claimed</div>
                                        </button>
                                    )}
                                    {isActive && allMissionsDone && (
                                        <button className="pill-green w-full" onClick={handleClaim}>
                                            <div className="pill-face" style={{ padding: '4px 8px', fontSize: '10px' }}>Claim</div>
                                        </button>
                                    )}
                                    {isActive && !allMissionsDone && (
                                        <button className="pill-green w-full" onClick={() => { onPlaySlot(game.id); onClose(); }}>
                                            <div className="pill-face" style={{ padding: '4px 8px', fontSize: '10px' }}>Play Now</div>
                                        </button>
                                    )}
                                    {isLocked && (
                                        <button disabled className="pill-green w-full opacity-30">
                                            <div className="pill-face" style={{ padding: '4px 8px', fontSize: '10px' }}>Locked</div>
                                        </button>
                                    )}
                                </div>

                                {/* Connector */}
                                <div className="shrink-0 flex items-center justify-center" style={{ width: 18, marginTop: 34 }}>
                                    <i className={`ti ti-chevron-right ${pi < currentPathIndex ? 'text-green-400' : 'text-white/15'}`} style={{ fontSize: 16 }} />
                                </div>
                            </React.Fragment>
                        );
                    })}

                    {/* Grand prize element */}
                    <div className="flex flex-col items-center shrink-0" style={{ width: 92, gap: 6 }}>
                        <span className="font-black text-amber-300" style={{ fontSize: 10 }}>Grand Prize</span>

                        <div className={`relative flex items-center justify-center overflow-hidden`}
                            style={{
                                width: 78, height: 78, borderRadius: 16,
                                background: allStagesDone
                                    ? 'linear-gradient(135deg,#fbbf24,#d97706,#92400e)'
                                    : 'rgba(255,255,255,0.05)',
                                boxShadow: allStagesDone
                                    ? 'inset 0 3px 0 rgba(255,220,120,0.9), 0 0 22px rgba(251,191,36,0.6), 0 6px 18px rgba(0,0,0,0.7)'
                                    : 'inset 0 3px 0 rgba(220,170,255,0.3), 0 4px 12px rgba(0,0,0,0.6)',
                                filter: allStagesDone ? 'none' : 'brightness(0.45) grayscale(0.5)',
                            }}>
                            <img src="/new_coinicon.png" alt="" style={{ width: 52, height: 52, objectFit: 'contain', filter: allStagesDone ? 'drop-shadow(0 2px 8px rgba(251,191,36,0.8))' : undefined }} />
                            {!allStagesDone && (
                                <img src="/ui/lock.png" alt="" className="absolute z-30 pointer-events-none select-none"
                                    style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.95))' }} />
                            )}
                        </div>

                        <span className={`font-bold text-center ${allStagesDone ? 'text-amber-300' : 'text-white/30'}`}
                            style={{ fontSize: 10 }}>Complete All</span>

                        <div className="flex flex-col items-center" style={{ gap: 2 }}>
                            <img src="/new_coinicon.png" alt=""
                                style={{ width: 36, height: 36, objectFit: 'contain', filter: allStagesDone ? 'drop-shadow(0 2px 6px rgba(251,191,36,0.5))' : 'grayscale(1) brightness(0.4)' }} />
                            <span className={`font-black ${allStagesDone ? 'text-amber-300' : 'text-white/40'}`} style={{ fontSize: 10 }}>
                                +{formatK(grandPrize)}
                            </span>
                        </div>

                        <button disabled className={`pill-green w-full ${allStagesDone ? 'opacity-100' : 'opacity-30'}`}>
                            <div className="pill-face" style={{
                                padding: '4px 8px', fontSize: '10px',
                                ...(allStagesDone ? { background: 'linear-gradient(180deg,#fbbf24,#d97706)' } : {}),
                            }}>
                                {allStagesDone ? 'Earned!' : 'Locked'}
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
