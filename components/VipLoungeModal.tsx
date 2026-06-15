import React from 'react';

interface VipLoungeModalProps {
    isOpen: boolean;
    onClose: () => void;
    isVip: boolean;
    playerLevel: number;
    vipLevel?: number;
    vipXp?: number;
    vipXpToNext?: number;
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
    { name: 'Bronze', icon: '🥉', color: '#cd7f32', unlockLevel: 1, benefits: ['5% cashback', '+5% Piggy Bank', '+10% XP'] },
    { name: 'Silver', icon: '🥈', color: '#c0c0c0', unlockLevel: 5, benefits: ['10% cashback', '+8% Piggy Bank', '+15% XP', 'Weekly gems'] },
    { name: 'Gold', icon: '🥇', color: '#ffd700', unlockLevel: 15, benefits: ['15% cashback', '+10% Piggy', '+20% XP', '10% store off'] },
    { name: 'Platinum', icon: '/symbols/diamond.png', color: '#b8d4ff', unlockLevel: 30, benefits: ['20% cashback', '+15% Piggy', '+30% XP', 'Daily gems'] },
];

const getCurrentTier = (vipLevel: number): VipTier | null => {
    let current: VipTier | null = null;
    for (const tier of VIP_TIERS) {
        if (vipLevel >= tier.unlockLevel) current = tier;
    }
    return current;
};

export const VipLoungeModal: React.FC<VipLoungeModalProps> = ({
    isOpen, onClose, isVip, playerLevel, vipLevel = 1, vipXp = 0, vipXpToNext = 500, onJoinVip
}) => {
    if (!isOpen) return null;

    const currentTier = getCurrentTier(vipLevel);

    return (
        <div className="absolute inset-0 z-[150] flex flex-col animate-pop-in select-none overflow-hidden"
            style={{ background: 'linear-gradient(160deg,#1c0900 0%,#2a1200 50%,#0f0600 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-2.5">
                <span className="font-black text-lg uppercase tracking-widest flex-1"
                    style={{ background: 'linear-gradient(180deg,#fff8c0,#ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    VIP Lounge
                </span>
                {isVip && currentTier ? (
                    <div className="px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-widest shrink-0"
                        style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00' }}>
                        {currentTier.icon} {currentTier.name}
                    </div>
                ) : (
                    <div className="px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-widest shrink-0"
                        style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                        NOT VIP
                    </div>
                )}
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}
                    style={{ background: 'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow: '0 2px 0 #5a3800' }}>
                    <i className="ti ti-x"></i>
                </div>
            </div>

            {/* VIP XP bar */}
            <div className="shrink-0 mx-4 mb-2">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'rgba(253,230,138,0.8)' }}>
                        VIP Lv {vipLevel}
                    </span>
                    <span className="text-[9px] font-bold" style={{ color: 'rgba(253,230,138,0.5)' }}>
                        {vipXp.toLocaleString()} / {vipXpToNext.toLocaleString()} XP
                    </span>
                </div>
                <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (vipXp / vipXpToNext) * 100)}%`, background: 'linear-gradient(90deg,#fbbf24,#f59e0b)' }} />
                </div>
            </div>

            {/* Current tier highlight — compact */}
            {isVip && currentTier && (
                <div className="shrink-0 mx-4 mb-2 rounded-xl px-3 py-2 flex items-center gap-2.5"
                    style={{ background: `rgba(251,191,36,0.12)` }}>
                    {currentTier.icon.startsWith('/') ? <img src={currentTier.icon} alt="" style={{ width: '1.6rem', height: '1.6rem', objectFit: 'contain' }} /> : <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{currentTier.icon}</span>}
                    <div>
                        <div className="font-black text-[11px] uppercase tracking-widest" style={{ color: currentTier.color }}>
                            {currentTier.name} VIP Active
                        </div>
                        <div className="text-[9px]" style={{ color: 'rgba(253,230,138,0.55)' }}>{currentTier.benefits[0]}</div>
                    </div>
                </div>
            )}

            {/* Tier grid — 2×2, no overflow */}
            <div className="flex-1 px-4 pb-2 grid grid-cols-2 gap-2 min-h-0">
                {VIP_TIERS.map(tier => {
                    const isUnlocked = vipLevel >= tier.unlockLevel;
                    const isActive = currentTier?.name === tier.name && isVip;
                    return (
                        <div key={tier.name}
                            className="rounded-xl px-2.5 py-2 flex flex-col gap-1 relative overflow-hidden"
                            style={{
                                background: isActive ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                                boxShadow: isActive ? `0 0 10px ${tier.color}33` : 'none',
                                opacity: isUnlocked ? 1 : 0.45,
                            }}>
                            {!isUnlocked && (
                                <div className="absolute top-1.5 right-1.5 text-[8px] font-black px-1 py-0.5 rounded-full"
                                    style={{ background: 'rgba(0,0,0,0.55)', color: '#9ca3af' }}>
                                    Lv {tier.unlockLevel}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                {tier.icon.startsWith('/') ? <img src={tier.icon} alt="" style={{ width: '1.25rem', height: '1.25rem', objectFit: 'contain' }} /> : <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{tier.icon}</span>}
                                <div>
                                    <div className="font-black text-[11px] uppercase tracking-wide" style={{ color: isUnlocked ? tier.color : '#6b7280' }}>
                                        {tier.name}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                {tier.benefits.map(b => (
                                    <div key={b} className="text-[8.5px] leading-tight flex items-start gap-1"
                                        style={{ color: isUnlocked ? 'rgba(253,230,138,0.7)' : 'rgba(255,255,255,0.2)' }}>
                                        <span className="shrink-0 mt-px">•</span>
                                        <span>{b}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* CTA */}
            <div className="shrink-0 px-4 pb-3">
                {!isVip ? (
                    <button onClick={onJoinVip}
                        className="btn-3d font-black text-sm uppercase tracking-widest text-black relative overflow-hidden px-10 py-2.5 rounded-xl w-full"
                        style={{ background: 'linear-gradient(180deg,#fff8a0,#f0c000 40%,#c08000)', boxShadow: '0 3px 0 #7a5000' }}>
                        <span className="relative z-10">Join VIP Lounge</span>
                        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                    </button>
                ) : (
                    <div className="text-yellow-200/50 text-[10px] text-center font-bold uppercase tracking-widest py-1">
                        {currentTier ? `${currentTier.icon} ${currentTier.name} VIP — 30 day membership` : '✓ VIP Active'}
                    </div>
                )}
            </div>

        </div>
    );
};
