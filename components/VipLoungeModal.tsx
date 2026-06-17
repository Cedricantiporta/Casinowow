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
    onOpenHighLimit?: () => void;
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

const LOUNGE_FEATURES = [
    { icon: '/ui/piggy.png', label: 'Piggy Bonus', desc: '+5–15% fill' },
    { icon: '/ui/boost.png', label: 'XP Boost', desc: '+10–30% XP' },
    { icon: '/ui/collect.png', label: 'Cashback', desc: '5–20% back' },
    { icon: '/ui/pass.png', label: 'Pass Perks', desc: 'Bonus rewards' },
    { icon: '/ui/inbox.png', label: 'Gem Gifts', desc: 'Weekly / Daily' },
    { icon: '/ui/VIP.png', label: 'VIP Status', desc: 'Exclusive badge' },
];

const getCurrentTier = (vipLevel: number): VipTier | null => {
    let current: VipTier | null = null;
    for (const tier of VIP_TIERS) {
        if (vipLevel >= tier.unlockLevel) current = tier;
    }
    return current;
};

export const VipLoungeModal: React.FC<VipLoungeModalProps> = ({
    isOpen, onClose, isVip, playerLevel, vipLevel = 1, vipXp = 0, vipXpToNext = 500, onJoinVip, onOpenHighLimit
}) => {
    if (!isOpen) return null;

    const currentTier = getCurrentTier(vipLevel);
    const xpPct = Math.min(100, (vipXp / vipXpToNext) * 100);
    const hlUnlocked = playerLevel >= 35;

    return (
        <div className="absolute inset-0 z-[150] flex flex-col animate-pop-in select-none overflow-hidden"
            style={{ backgroundImage: 'url(/lobby-bg-vip.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>

            {/* Subtle overlay for legibility */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.18)' }} />

            {/* Content */}
            <div className="relative flex flex-col h-full z-10">

                {/* Header */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-2.5">
                    <span className="font-black text-lg tracking-widest flex-1"
                        style={{ background: 'linear-gradient(180deg,#fff8c0,#ffd700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        VIP Lounge
                    </span>
                    {isVip && currentTier ? (
                        <div className="px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-widest shrink-0"
                            style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00' }}>
                            {currentTier.icon.startsWith('/') ? <img src={currentTier.icon} alt="" style={{ width: 12, height: 12, display: 'inline', objectFit: 'contain' }} /> : currentTier.icon} {currentTier.name}
                        </div>
                    ) : (
                        <div className="px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-widest shrink-0"
                            style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                            Not VIP
                        </div>
                    )}
                    <div className="round-btn cursor-pointer shrink-0" onClick={onClose}
                        style={{ background: 'linear-gradient(180deg,#e0a820,#9a6800)', boxShadow: '0 2px 0 #5a3800' }}>
                        <i className="ti ti-x"></i>
                    </div>
                </div>

                {/* XP Bar — narrow and centered */}
                <div className="shrink-0 mb-3" style={{ width: '52%', marginLeft: 'auto', marginRight: 'auto' }}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black tracking-wider" style={{ color: 'rgba(253,230,138,0.9)' }}>
                            VIP Lv {vipLevel}
                        </span>
                        <span className="text-[9px] font-bold" style={{ color: 'rgba(253,230,138,0.6)' }}>
                            {vipXp.toLocaleString()} / {vipXpToNext.toLocaleString()} XP
                        </span>
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                            style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg,#fbbf24,#f59e0b)' }} />
                    </div>
                </div>

                {/* Main body — two columns */}
                <div className="flex-1 flex gap-2.5 px-4 pb-4 min-h-0">

                    {/* LEFT — Lounge Benefits */}
                    <div className="flex-[3] flex flex-col rounded-2xl overflow-hidden"
                        style={{ background: 'linear-gradient(160deg,#6b21a8,#3b0764)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>

                        {/* Section header — no separator */}
                        <div className="shrink-0 px-3 pt-3 pb-1 text-center">
                            <span className="font-black text-[12px] tracking-widest" style={{ color: '#e9d5ff' }}>Lounge Benefits</span>
                        </div>

                        {/* 2×3 benefit grid */}
                        <div className="flex-1 grid grid-cols-3 gap-2 p-3 content-start">
                            {LOUNGE_FEATURES.map((feat, i) => {
                                const locked = !isVip && i > 0;
                                return (
                                    <div key={feat.label}
                                        className="flex flex-col items-center gap-1 rounded-xl py-2 px-1 relative"
                                        style={{ background: locked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)', opacity: locked ? 0.55 : 1 }}>
                                        <div className="relative">
                                            <img src={feat.icon} alt="" style={{ width: 36, height: 36, objectFit: 'contain', filter: locked ? 'grayscale(1) brightness(0.6)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }} />
                                            {locked && (
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                                                    style={{ background: '#b91c1c', border: '1px solid #f0c000' }}>
                                                    <i className="ti ti-lock" style={{ fontSize: 8, color: '#fff' }} />
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-black text-[8px] text-center leading-tight" style={{ color: locked ? '#6b7280' : '#e9d5ff' }}>{feat.label}</span>
                                        <span className="text-[7px] text-center leading-tight" style={{ color: locked ? '#4b5563' : 'rgba(200,160,255,0.7)' }}>{feat.desc}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Join / Active CTA */}
                        <div className="shrink-0 px-3 pb-3">
                            {!isVip ? (
                                <button onClick={onJoinVip}
                                    className="btn-3d font-black text-xs tracking-widest text-black relative overflow-hidden px-4 py-2 rounded-xl w-full"
                                    style={{ background: 'linear-gradient(180deg,#fff8a0,#f0c000 40%,#c08000)', boxShadow: '0 3px 0 #7a5000' }}>
                                    <span className="relative z-10">Join VIP Lounge</span>
                                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                                </button>
                            ) : (
                                <div className="text-center text-[9px] font-black tracking-widest py-1" style={{ color: 'rgba(253,230,138,0.6)' }}>
                                    {currentTier ? `${currentTier.name} VIP Active — 30 day` : 'VIP Active'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — High Limit */}
                    <div className="flex-[2] flex flex-col rounded-2xl overflow-hidden"
                        style={{ background: 'linear-gradient(160deg,#c87800,#8a4e00)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>

                        {/* Section header — no separator */}
                        <div className="shrink-0 px-3 pt-3 pb-1 text-center">
                            <span className="font-black text-[12px] tracking-widest" style={{ color: '#fff3c0' }}>High Limit</span>
                        </div>

                        {/* Big icon */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-3">
                            <img src="/ui/high_roller.png" alt=""
                                style={{ width: 110, height: 110, objectFit: 'contain', filter: hlUnlocked ? 'drop-shadow(0 4px 16px rgba(255,200,50,0.8))' : 'grayscale(1) brightness(0.5)' }} />
                            <div className="text-center">
                                <div className="font-black text-[11px] tracking-wide" style={{ color: hlUnlocked ? '#fff3c0' : '#6b7280' }}>
                                    {hlUnlocked ? '10× Bet Amounts' : `Unlocks at Lv.35`}
                                </div>
                                {hlUnlocked && (
                                    <div className="text-[8px] mt-0.5" style={{ color: 'rgba(255,240,160,0.6)' }}>
                                        Massive wins await
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Enter button */}
                        <div className="shrink-0 px-3 pb-3">
                            <button
                                onClick={() => { if (hlUnlocked) { onClose(); setTimeout(() => onOpenHighLimit?.(), 50); } }}
                                disabled={!hlUnlocked}
                                className="btn-3d w-full py-2 rounded-xl font-black text-xs tracking-widest relative overflow-hidden"
                                style={hlUnlocked ? {
                                    background: 'linear-gradient(180deg,#ffe066,#d48800)',
                                    boxShadow: '0 3px 0 #7a5000', color: '#1c0900',
                                } : {
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#4b5563', cursor: 'not-allowed', boxShadow: 'none',
                                }}>
                                {hlUnlocked ? (
                                    <>
                                        <span className="relative z-10">Enter</span>
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                                    </>
                                ) : `Lv.35`}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
