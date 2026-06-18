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
    onOpenPremium?: () => void;
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
    isOpen, onClose, isVip, playerLevel, vipLevel = 1, vipXp = 0, vipXpToNext = 500, onJoinVip, onOpenHighLimit, onOpenPremium
}) => {
    if (!isOpen) return null;

    const currentTier = getCurrentTier(vipLevel);
    const xpPct = Math.min(100, (vipXp / vipXpToNext) * 100);
    const hlUnlocked = playerLevel >= 35 && isVip;

    return (
        <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-pop-in select-none">
            <div className="w-full max-w-[480px] flex flex-col rounded-3xl overflow-hidden"
                style={{ height: 'min(90%, 400px)', background: 'linear-gradient(180deg,#9030d8 0%,#6018a8 18%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }}>

                {/* Header */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-2.5">
                    <span className="font-black text-white text-sm flex-1">VIP Lounge</span>
                    {isVip && currentTier ? (
                        <div className="px-2.5 py-0.5 rounded-full font-black text-[10px] tracking-widest shrink-0"
                            style={{ background: 'linear-gradient(180deg,#fbbf24,#d97706)', color: '#1c0a00' }}>
                            {currentTier.icon.startsWith('/') ? <img src={currentTier.icon} alt="" style={{ width: 12, height: 12, display: 'inline', objectFit: 'contain' }} /> : currentTier.icon} {currentTier.name}
                        </div>
                    ) : (
                        <button onClick={() => { onClose(); setTimeout(() => onOpenPremium?.(), 50); }} className="pill-green shrink-0">
                            <div className="pill-face" style={{ fontSize: '10px', padding: '5px 12px', background: 'linear-gradient(180deg,#ffd700 0%,#e6a500 50%,#cc8800 100%)', color: '#3a1a00', textShadow: '0 1px 2px rgba(100,60,0,0.4)' }}>Unlock VIP</div>
                        </button>
                    )}
                    <div className="round-btn cursor-pointer shrink-0" onClick={onClose}>
                        <i className="ti ti-x"></i>
                    </div>
                </div>

                {/* XP Bar */}
                <div className="shrink-0 mb-3 px-4">
                    <div className="relative mx-auto overflow-hidden"
                        style={{
                            height: 22, borderRadius: 11,
                            background: 'linear-gradient(180deg,#7a5000,#4a2800)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.4)',
                            width: '55%',
                        }}>
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: `${xpPct}%`,
                            background: 'linear-gradient(180deg,#ffe066,#e8a800 60%,#b07000)',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6)',
                            transition: 'width 0.4s ease',
                        }} />
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 8px' }}>
                            <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}>VIP Lv {vipLevel}</span>
                            <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,240,180,0.8)' }}>{vipXp}/{vipXpToNext} XP</span>
                        </div>
                    </div>
                </div>

                {/* Main body — two columns */}
                <div className="flex-1 flex gap-2.5 px-4 pb-4 min-h-0">

                    {/* LEFT — Lounge Benefits */}
                    <div className="flex-[3] flex flex-col rounded-2xl overflow-hidden"
                        style={{ background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(160,60,255,0.3) 10%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)' }}>

                        <div className="shrink-0 px-3 pt-3 pb-1 text-center">
                            <span className="font-black text-[12px] tracking-widest" style={{ color: '#e9d5ff' }}>Lounge Benefits</span>
                        </div>

                        {/* 2×3 benefit grid — all visible */}
                        <div className="flex-1 grid grid-cols-3 gap-2 p-3 content-start">
                            {LOUNGE_FEATURES.map((feat) => (
                                <div key={feat.label}
                                    className="flex flex-col items-center gap-1 rounded-xl py-2 px-1"
                                    style={{ background: 'rgba(255,255,255,0.08)' }}>
                                    <img src={feat.icon} alt="" style={{ width: 36, height: 36, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }} />
                                    <span className="font-black text-[8px] text-center leading-tight" style={{ color: '#e9d5ff' }}>{feat.label}</span>
                                    <span className="text-[7px] text-center leading-tight" style={{ color: 'rgba(200,160,255,0.7)' }}>{feat.desc}</span>
                                </div>
                            ))}
                        </div>

                        <div className="shrink-0 px-3 pb-3">
                            {!isVip ? (
                                <button onClick={onJoinVip} className="pill-green w-full">
                                    <div className="pill-face">Join VIP Lounge</div>
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
                        style={{ background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(160,60,255,0.3) 10%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)' }}>

                        <div className="shrink-0 px-3 pt-3 pb-1 text-center">
                            <span className="font-black text-[12px] tracking-widest" style={{ color: '#e9d5ff' }}>High Limit</span>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-3">
                            <img src="/ui/high_roller.png" alt=""
                                style={{ width: 110, height: 110, objectFit: 'contain', filter: hlUnlocked ? 'drop-shadow(0 4px 16px rgba(255,220,50,0.9))' : 'grayscale(1) brightness(0.5)' }} />
                            {!hlUnlocked && (
                                <div className="text-center">
                                    <div className="font-black text-[11px] tracking-wide" style={{ color: '#6b7280' }}>
                                        {playerLevel < 35 ? `Unlocks at Lv.35` : 'VIP Required'}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="shrink-0 px-3 pb-3">
                            <button
                                onClick={() => { if (hlUnlocked) { onClose(); setTimeout(() => onOpenHighLimit?.(), 50); } }}
                                className={`pill-green w-full${!hlUnlocked ? ' opacity-40' : ''}`}>
                                <div className="pill-face">
                                    {hlUnlocked ? 'Enter' : (!isVip ? 'VIP Only' : 'Lv.35')}
                                </div>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
