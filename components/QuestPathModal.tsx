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
        <div className="absolute inset-0 z-[140] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#07001a 0%,#0d0030 60%,#050015 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3"
                style={{ background: 'rgba(168,85,247,0.08)', borderBottom: '1px solid rgba(168,85,247,0.18)' }}>
                <button
                    onClick={onClose}
                    style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-x" style={{ fontSize: 14 }} />
                </button>
                <div className="flex items-center gap-2">
                    <i className="ti ti-route" style={{ fontSize: 16, color: '#a78bfa' }} />
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#e9d5ff', letterSpacing: 0.3 }}>Quest Path</span>
                </div>
                <div style={{ marginLeft: 'auto', background: 'rgba(168,85,247,0.15)', borderRadius: 8, padding: '3px 10px' }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: '#c4b5fd' }}>
                        Stage {Math.min(currentPathIndex + 1, pathGames.length)} / {pathGames.length}
                    </span>
                </div>
            </div>

            {/* Trail */}
            <div className="flex-1 flex items-center overflow-x-auto no-scrollbar" style={{ padding: '16px 20px', gap: 0 }}>
                {pathGames.map((game, pi) => {
                    const isDone = pi < currentPathIndex;
                    const isActive = pi === currentPathIndex;
                    const isLocked = pi > currentPathIndex;

                    return (
                        <React.Fragment key={game.id}>
                            {/* Stage node */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, width: 90 }}>
                                {/* Stage label */}
                                <span style={{
                                    fontSize: 8, fontWeight: 900, letterSpacing: 1,
                                    color: isActive ? '#a78bfa' : isDone ? '#4ade80' : '#374151',
                                }}>
                                    STAGE {pi + 1}
                                </span>

                                {/* Slot card */}
                                <div
                                    onClick={() => isActive ? (onPlaySlot(game.id), onClose()) : undefined}
                                    style={{
                                        width: 76, height: 76,
                                        borderRadius: 14,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        cursor: isActive ? 'pointer' : 'default',
                                        flexShrink: 0,
                                        boxShadow: isActive
                                            ? '0 0 0 2.5px #a78bfa, 0 0 20px rgba(168,85,247,0.6), 0 4px 16px rgba(0,0,0,0.8)'
                                            : isDone
                                            ? '0 0 0 2px #4ade80, 0 4px 12px rgba(0,0,0,0.7)'
                                            : '0 0 0 2px rgba(255,255,255,0.07), 0 4px 12px rgba(0,0,0,0.7)',
                                        filter: isLocked ? 'brightness(0.38) grayscale(0.6)' : isDone ? 'brightness(0.7)' : 'none',
                                        transition: 'all 0.2s',
                                        animation: isActive ? 'pulse 2.5s ease-in-out infinite' : 'none',
                                    }}>
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#7c3aed,#1e1b4b)' }} />
                                    {game.coverImage ? (
                                        <img src={game.coverImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {THEME_PNG[game.theme] ? (
                                                <img src={THEME_PNG[game.theme]} alt="" style={{ width: 46, height: 46, objectFit: 'contain' }} />
                                            ) : (
                                                <span style={{ fontSize: 32 }}>🎰</span>
                                            )}
                                        </div>
                                    )}
                                    {/* Overlays */}
                                    {isDone && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                                            <i className="ti ti-check" style={{ fontSize: 28, color: '#4ade80' }} />
                                        </div>
                                    )}
                                    {isLocked && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                                            <i className="ti ti-lock" style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)' }} />
                                        </div>
                                    )}
                                    {isActive && (
                                        <div style={{ position: 'absolute', top: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                                            <span style={{ background: 'rgba(168,85,247,0.92)', borderRadius: 4, padding: '1px 6px', fontSize: 7, fontWeight: 900, color: '#fff' }}>NOW</span>
                                        </div>
                                    )}
                                </div>

                                {/* Game name */}
                                <span style={{
                                    fontSize: 7, fontWeight: 700, textAlign: 'center',
                                    color: isActive ? '#c4b5fd' : isDone ? '#86efac' : '#374151',
                                    maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                    {game.name}
                                </span>

                                {/* Gift reward */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    <img
                                        src="/ui/gift_store.png"
                                        alt=""
                                        style={{
                                            width: 34, height: 34, objectFit: 'contain',
                                            filter: isDone ? 'grayscale(1) brightness(0.4)' : isLocked ? 'grayscale(1) brightness(0.25)' : 'drop-shadow(0 2px 6px rgba(251,191,36,0.5))',
                                        }}
                                    />
                                    <span style={{
                                        fontSize: 7, fontWeight: 900,
                                        color: isDone ? '#374151' : isActive ? '#fbbf24' : '#1f2937',
                                    }}>
                                        {isDone ? 'Claimed' : `+${formatK(rewardCoins)}`}
                                    </span>
                                </div>

                                {/* Play Now button for active slot only */}
                                {isActive && (
                                    <button
                                        className="pill-green"
                                        onClick={() => { onPlaySlot(game.id); onClose(); }}
                                        style={{ minWidth: 76 }}>
                                        <div className="pill-face" style={{ padding: '4px 10px', fontSize: '8px' }}>Play Now</div>
                                    </button>
                                )}
                            </div>

                            {/* Arrow connector */}
                            {pi < pathGames.length - 1 && (
                                <div style={{ flexShrink: 0, width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -30 }}>
                                    <i className="ti ti-chevron-right" style={{
                                        fontSize: 16,
                                        color: pi < currentPathIndex ? '#4ade80' : 'rgba(255,255,255,0.12)',
                                    }} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
                <div style={{ width: 20, flexShrink: 0 }} />
            </div>

            {/* Footer hint */}
            <div className="shrink-0 px-4 pb-4 pt-2 text-center"
                style={{ borderTop: '1px solid rgba(168,85,247,0.1)' }}>
                <span style={{ fontSize: 8, color: '#4b5563', fontWeight: 600 }}>
                    Complete all missions in each slot to unlock the next stage and claim your reward
                </span>
            </div>
        </div>
    );
};
