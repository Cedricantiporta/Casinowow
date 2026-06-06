import React from 'react';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    isVip: boolean;
    isPremium: boolean;
    onBuyVip: () => void;
    onBuyPremium: () => void;
}

const CARD_W = 200;
const CARD_H = 300;

const bundles = [
    {
        id: 'starter',
        name: 'Starter Bundle',
        tag: '50% OFF',
        tagColor: '#22c55e',
        bg: 'linear-gradient(160deg,#052e16,#166534,#052e16)',
        border: '#22c55e',
        items: [
            { icon: '🪙', label: '500,000 Coins' },
            { icon: '💎', label: '200 Gems' },
            { icon: '📦', label: '5 Pack Credits' },
        ],
        origPrice: '₱ 200',
        price: 'FREE',
    },
    {
        id: 'gem',
        name: 'Gem Bundle',
        tag: '60% OFF',
        tagColor: '#a855f7',
        bg: 'linear-gradient(160deg,#2e1065,#5b21b6,#2e1065)',
        border: '#a855f7',
        items: [
            { icon: '💎', label: '2,000 Gems' },
            { icon: '🪙', label: '1,000,000 Coins' },
            { icon: '🚀', label: '2× XP Boost (1h)' },
        ],
        origPrice: '₱ 500',
        price: 'FREE',
    },
    {
        id: 'quest',
        name: 'Quest Bundle',
        tag: '55% OFF',
        tagColor: '#0ea5e9',
        bg: 'linear-gradient(160deg,#0c1a5e,#1e3a8a,#0c1a5e)',
        border: '#0ea5e9',
        items: [
            { icon: '⛏️', label: '+20 Wild Credits' },
            { icon: '🎲', label: '+20 Dice Credits' },
            { icon: '💎', label: '500 Gems' },
            { icon: '🪙', label: '250,000 Coins' },
        ],
        origPrice: '₱ 350',
        price: 'FREE',
    },
    {
        id: 'mega',
        name: 'Mega Bundle',
        tag: '70% OFF',
        tagColor: '#f59e0b',
        bg: 'linear-gradient(160deg,#451a03,#92400e,#451a03)',
        border: '#f59e0b',
        items: [
            { icon: '🪙', label: '5,000,000 Coins' },
            { icon: '💎', label: '5,000 Gems' },
            { icon: '📦', label: '50 Pack Credits' },
            { icon: '🚀', label: '3× XP Boost (24h)' },
            { icon: '⛏️', label: '+50 Quest Credits' },
        ],
        origPrice: '₱ 1,499',
        price: 'FREE',
    },
];

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, isVip, isPremium, onBuyVip, onBuyPremium }) => {
    if (!isOpen) return null;

    const vipBenefits = ['10% Piggy Bank savings', '2× XP from spins', 'High-Limit Room access', 'VIP gold UI theme', '20% store discounts', '+Weekly gems'];
    const passBenefits = ['Premium reward track', 'Exclusive gem rewards', 'XP mission booster', 'Monthly bonus coins', 'Prestige profile badge', 'Unlimited daily bonus'];

    return (
        <div className="fixed inset-0 z-[200] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(180deg,#0d0814 0%,#1a0535 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-2">
                <span className="text-xl">🏷️</span>
                <h2 className="font-black text-white text-base uppercase tracking-widest flex-1">Sale</h2>
                <div className="round-btn cursor-pointer" onClick={onClose}><i className="ti ti-x" /></div>
            </div>

            {/* Horizontal scroll row */}
            <div className="flex-1 overflow-x-auto no-scrollbar px-4 pb-4">
                <div className="flex gap-3 h-full items-stretch" style={{ minWidth: 'max-content' }}>

                    {/* VIP Lounge Card */}
                    <div className="flex flex-col rounded-2xl overflow-hidden shrink-0"
                        style={{ width: CARD_W, background: 'linear-gradient(160deg,#2a1500,#5c3000,#2a1500)', border: '1.5px solid rgba(251,191,36,0.4)' }}>
                        {/* Top accent */}
                        <div className="shrink-0 px-4 pt-4 pb-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-2xl">👑</span>
                                {isVip
                                    ? <span className="text-[9px] font-black bg-yellow-500 text-black px-2 py-0.5 rounded-full uppercase">ACTIVE</span>
                                    : <span className="text-[9px] font-black text-green-400 uppercase tracking-wide">FREE</span>}
                            </div>
                            <div className="font-black text-yellow-300 text-sm uppercase tracking-wider leading-none">VIP Lounge</div>
                            <div className="text-yellow-200/50 text-[10px] mt-0.5 leading-tight">Exclusive high-roller access</div>
                        </div>
                        {/* Benefits — no container */}
                        <div className="flex-1 px-4 py-2 flex flex-col gap-1.5">
                            {vipBenefits.map((b, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                    <span className="text-yellow-400 text-[10px] leading-none mt-0.5 shrink-0">✦</span>
                                    <span className="text-yellow-100/80 text-[10px] leading-tight">{b}</span>
                                </div>
                            ))}
                        </div>
                        {/* CTA */}
                        <div className="shrink-0 px-3 pb-3 pt-1">
                            <button onClick={onBuyVip} disabled={isVip}
                                className="w-full py-2.5 rounded-xl font-black uppercase text-xs btn-3d tracking-widest"
                                style={{ background: isVip ? 'rgba(0,0,0,0.4)' : 'linear-gradient(180deg,#fbbf24,#b45309)', boxShadow: isVip ? 'none' : '0 3px 0 #78350f', color: isVip ? 'rgba(255,255,255,0.3)' : '#fff', cursor: isVip ? 'not-allowed' : 'pointer' }}>
                                {isVip ? '✓ Active' : '👑 Activate FREE'}
                            </button>
                        </div>
                    </div>

                    {/* Monthly Pass Card */}
                    <div className="flex flex-col rounded-2xl overflow-hidden shrink-0"
                        style={{ width: CARD_W, background: 'linear-gradient(160deg,#0e0030,#2d0060,#0e0030)', border: '1.5px solid rgba(168,85,247,0.4)' }}>
                        <div className="shrink-0 px-4 pt-4 pb-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-2xl">📜</span>
                                {isPremium
                                    ? <span className="text-[9px] font-black bg-purple-500 text-white px-2 py-0.5 rounded-full uppercase">ACTIVE</span>
                                    : <span className="text-[9px] font-black text-green-400 uppercase tracking-wide">FREE</span>}
                            </div>
                            <div className="font-black text-purple-300 text-sm uppercase tracking-wider leading-none">Monthly Pass</div>
                            <div className="text-purple-200/50 text-[10px] mt-0.5 leading-tight">30-day premium reward track</div>
                        </div>
                        <div className="flex-1 px-4 py-2 flex flex-col gap-1.5">
                            {passBenefits.map((b, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                    <span className="text-purple-400 text-[10px] leading-none mt-0.5 shrink-0">✦</span>
                                    <span className="text-purple-100/80 text-[10px] leading-tight">{b}</span>
                                </div>
                            ))}
                        </div>
                        <div className="shrink-0 px-3 pb-3 pt-1">
                            <button onClick={onBuyPremium} disabled={isPremium}
                                className="w-full py-2.5 rounded-xl font-black uppercase text-xs btn-3d tracking-widest"
                                style={{ background: isPremium ? 'rgba(0,0,0,0.4)' : 'linear-gradient(180deg,#a855f7,#6d28d9)', boxShadow: isPremium ? 'none' : '0 3px 0 #4c1d95', color: isPremium ? 'rgba(255,255,255,0.3)' : '#fff', cursor: isPremium ? 'not-allowed' : 'pointer' }}>
                                {isPremium ? '✓ Active' : '📜 Activate FREE'}
                            </button>
                        </div>
                    </div>

                    {/* Bundle Cards */}
                    {bundles.map(bundle => (
                        <div key={bundle.id} className="flex flex-col rounded-2xl overflow-hidden shrink-0"
                            style={{ width: CARD_W, background: bundle.bg, border: `1.5px solid ${bundle.border}44` }}>
                            <div className="shrink-0 px-4 pt-4 pb-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                                        style={{ background: bundle.tagColor, color: '#000' }}>{bundle.tag}</span>
                                    <span className="text-[9px] font-black line-through" style={{ color: 'rgba(255,255,255,0.3)' }}>{bundle.origPrice}</span>
                                </div>
                                <div className="font-black text-white text-sm uppercase tracking-wider leading-none mt-1">{bundle.name}</div>
                                <div className="font-black text-green-400 text-xs uppercase mt-0.5">FREE</div>
                            </div>
                            {/* Items — no container */}
                            <div className="flex-1 px-4 py-2 flex flex-col gap-2">
                                {bundle.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-base leading-none shrink-0">{item.icon}</span>
                                        <span className="text-white/90 text-[11px] leading-tight font-bold">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="shrink-0 px-3 pb-3 pt-1">
                                <button className="w-full py-2.5 rounded-xl font-black uppercase text-xs btn-3d tracking-widest text-white"
                                    style={{ background: `linear-gradient(180deg,${bundle.tagColor},${bundle.border}99)`, boxShadow: `0 3px 0 rgba(0,0,0,0.5)` }}>
                                    Claim FREE
                                </button>
                            </div>
                        </div>
                    ))}

                </div>
            </div>
        </div>
    );
};
