import React from 'react';

interface VipLoungeModalProps {
    isOpen: boolean;
    onClose: () => void;
    isVip: boolean;
    playerLevel: number;
    onJoinVip: () => void;
}

interface VipTier {
    name: string;
    icon: string;
    color: string;
    unlockLevel: number;
    benefits: string[];
}

const VIP_TIERS: VipTier[] = [
    {
        name: 'Bronze',
        icon: '🥉',
        color: '#cd7f32',
        unlockLevel: 20,
        benefits: ['5% daily cashback', '+5% Piggy Bank savings', '+10% XP Boost'],
    },
    {
        name: 'Silver',
        icon: '🥈',
        color: '#c0c0c0',
        unlockLevel: 40,
        benefits: ['10% daily cashback', '+8% Piggy Bank', '+15% XP', 'Weekly gems'],
    },
    {
        name: 'Gold',
        icon: '🥇',
        color: '#ffd700',
        unlockLevel: 60,
        benefits: ['15% daily cashback', '+10% Piggy Bank', '+20% XP', 'Weekly gems', '10% store discount'],
    },
    {
        name: 'Platinum',
        icon: '💎',
        color: '#e5e4e2',
        unlockLevel: 80,
        benefits: ['20% daily cashback', '+15% Piggy Bank', '+30% XP', 'Daily gems', '15% store discount', 'Exclusive slots'],
    },
];

const getCurrentTier = (playerLevel: number): VipTier | null => {
    let current: VipTier | null = null;
    for (const tier of VIP_TIERS) {
        if (playerLevel >= tier.unlockLevel) current = tier;
    }
    return current;
};

export const VipLoungeModal: React.FC<VipLoungeModalProps> = ({
    isOpen, onClose, isVip, playerLevel, onJoinVip
}) => {
    if (!isOpen) return null;

    const currentTier = getCurrentTier(playerLevel);

    return (
        <div className="fixed inset-0 z-[150] flex flex-col animate-pop-in select-none overflow-hidden"
            style={{ background: 'linear-gradient(160deg,#1c0900 0%,#2a1200 50%,#0f0600 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 relative">
                <span className="font-black text-xl uppercase tracking-widest flex-1"
                    style={{ background: 'linear-gradient(180deg,#fff8c0,#ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    VIP Lounge
                </span>

                {isVip && currentTier ? (
                    <div className="px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest shrink-0"
                        style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 2px 8px rgba(251,191,36,0.4)' }}>
                        {currentTier.icon} {currentTier.name}
                    </div>
                ) : (
                    <div className="px-3 py-1 rounded-full font-black text-[10px] uppercase tracking-widest shrink-0"
                        style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        LOCKED
                    </div>
                )}

                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}
                    style={{ background: 'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow: '0 2px 0 #5a3800' }}>
                    <i className="ti ti-x"></i>
                </div>
            </div>

            {/* Current tier banner */}
            {currentTier && (
                <div className="shrink-0 mx-4 mb-2 rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{ background: 'rgba(251,191,36,0.15)', border: `1.5px solid ${currentTier.color}44` }}>
                    <span style={{ fontSize: '2rem', lineHeight: 1 }}>{currentTier.icon}</span>
                    <div>
                        <div className="font-black text-sm uppercase tracking-widest" style={{ color: currentTier.color }}>
                            Current: {currentTier.name} VIP
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'rgba(253,230,138,0.6)' }}>
                            Level {playerLevel} — {currentTier.benefits[0]}
                        </div>
                    </div>
                </div>
            )}

            {/* Tier cards — 2×2 grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-1">
                <div className="grid grid-cols-2 gap-2.5">
                    {VIP_TIERS.map(tier => {
                        const isUnlocked = playerLevel >= tier.unlockLevel;
                        const isActive = currentTier?.name === tier.name;
                        return (
                            <div key={tier.name}
                                className="rounded-2xl px-3 py-3 flex flex-col gap-1.5 relative overflow-hidden"
                                style={{
                                    background: isActive
                                        ? `rgba(251,191,36,0.18)`
                                        : isUnlocked
                                            ? 'rgba(255,255,255,0.09)'
                                            : 'rgba(255,255,255,0.04)',
                                    border: isActive
                                        ? `1.5px solid ${tier.color}88`
                                        : '1.5px solid rgba(255,255,255,0.08)',
                                    boxShadow: isActive ? `0 0 14px ${tier.color}44` : 'none',
                                    opacity: isUnlocked ? 1 : 0.5,
                                }}>
                                {/* Lock badge */}
                                {!isUnlocked && (
                                    <div className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                        style={{ background: 'rgba(0,0,0,0.6)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)' }}>
                                        LVL {tier.unlockLevel}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{tier.icon}</span>
                                    <div>
                                        <div className="font-black text-[12px] uppercase tracking-wider" style={{ color: isUnlocked ? tier.color : '#6b7280' }}>
                                            {tier.name}
                                        </div>
                                        <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                            Lv {tier.unlockLevel}+
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    {tier.benefits.map(b => (
                                        <div key={b} className="text-[9px] leading-tight flex items-start gap-1"
                                            style={{ color: isUnlocked ? 'rgba(253,230,138,0.75)' : 'rgba(255,255,255,0.25)' }}>
                                            <span style={{ flexShrink: 0, marginTop: '1px' }}>•</span>
                                            <span>{b}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* CTA */}
            <div className="shrink-0 flex flex-col items-center gap-2 px-4 py-3">
                {!isVip ? (
                    <button onClick={onJoinVip}
                        className="btn-3d font-black text-sm uppercase tracking-widest text-black relative overflow-hidden px-10 py-3 rounded-xl w-full max-w-sm"
                        style={{ background: 'linear-gradient(180deg,#fff8a0,#f0c000 40%,#c08000)', boxShadow: '0 4px 0 #7a5000,0 6px 16px rgba(0,0,0,0.5)' }}>
                        <span className="relative z-10">Join VIP Lounge</span>
                        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                    </button>
                ) : (
                    <div className="text-yellow-200/60 text-[10px] text-center font-bold uppercase tracking-widest py-2">
                        {currentTier ? `${currentTier.icon} ${currentTier.name} VIP Active` : '✓ VIP Active'}
                    </div>
                )}
            </div>

        </div>
    );
};
