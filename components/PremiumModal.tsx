import React, { useEffect, useRef } from 'react';

import { formatCommaNumber } from '../constants';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    isVip: boolean;
    isPremium: boolean;
    onBuyVip: () => void;
    onBuyPremium: () => void;
    maxBet?: number;
}

const CARD_W = 200;

const getBundles = (maxBet: number) => [
    {
        id: 'starter',
        name: 'Starter Bundle',
        tag: '50% OFF',
        tagColor: '#22c55e',
        bg: 'linear-gradient(160deg,#052e16,#166534,#052e16)',
        items: [
            { icon: '🪙', label: `${formatCommaNumber(Math.round(maxBet * 50))} Coins` },
            { icon: '💎', label: '200 Gems' },
            { icon: '📦', label: '5 Card Packs' },
        ],
        origPrice: '₱ 200',
        price: '₱ 99',
    },
    {
        id: 'gem',
        name: 'Gem Bundle',
        tag: '60% OFF',
        tagColor: '#a855f7',
        bg: 'linear-gradient(160deg,#2e1065,#5b21b6,#2e1065)',
        items: [
            { icon: '💎', label: '2,000 Gems' },
            { icon: '🪙', label: `${formatCommaNumber(Math.round(maxBet * 100))} Coins` },
            { icon: '🚀', label: '2× XP Boost (1h)' },
        ],
        origPrice: '₱ 500',
        price: '₱ 199',
    },
    {
        id: 'quest',
        name: 'Quest Bundle',
        tag: '55% OFF',
        tagColor: '#0ea5e9',
        bg: 'linear-gradient(160deg,#0c1a5e,#1e3a8a,#0c1a5e)',
        items: [
            { icon: '⛏️', label: '+20 Picks' },
            { icon: '🎲', label: '+20 Dice' },
            { icon: '💎', label: '500 Gems' },
            { icon: '🪙', label: `${formatCommaNumber(Math.round(maxBet * 25))} Coins` },
        ],
        origPrice: '₱ 350',
        price: '₱ 159',
    },
    {
        id: 'mega',
        name: 'Mega Bundle',
        tag: '70% OFF',
        tagColor: '#f59e0b',
        bg: 'linear-gradient(160deg,#451a03,#92400e,#451a03)',
        items: [
            { icon: '🪙', label: `${formatCommaNumber(Math.round(maxBet * 500))} Coins` },
            { icon: '💎', label: '5,000 Gems' },
            { icon: '📦', label: '50 Card Packs' },
            { icon: '🚀', label: '3× XP Boost (24h)' },
            { icon: '⛏️', label: '+50 Picks' },
        ],
        origPrice: '₱ 1,499',
        price: '₱ 449',
    },
    {
        id: 'vip-boost',
        name: 'VIP Boost Pack',
        tag: '65% OFF',
        tagColor: '#f43f5e',
        bg: 'linear-gradient(160deg,#4c0519,#9f1239,#4c0519)',
        items: [
            { icon: '👑', label: 'VIP Access (7 Days)' },
            { icon: '🪙', label: `${formatCommaNumber(Math.round(maxBet * 200))} Coins` },
            { icon: '💎', label: '1,000 Gems' },
            { icon: '🎲', label: '+10 Dice' },
            { icon: '⛏️', label: '+10 Picks' },
        ],
        origPrice: '₱ 799',
        price: '₱ 279',
    },
    {
        id: 'diamond',
        name: 'Diamond Pack',
        tag: '75% OFF',
        tagColor: '#22d3ee',
        bg: 'linear-gradient(160deg,#083344,#0e7490,#083344)',
        items: [
            { icon: '💎', label: '10,000 Gems' },
            { icon: '🪙', label: `${formatCommaNumber(Math.round(maxBet * 300))} Coins` },
            { icon: '📦', label: '100 Card Packs' },
            { icon: '📜', label: 'Monthly Pass (30d)' },
        ],
        origPrice: '₱ 3,999',
        price: '₱ 999',
    },
];

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, isVip, isPremium, onBuyVip, onBuyPremium, maxBet = 10000 }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bundles = getBundles(maxBet);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            el.scrollBy({ left: e.deltaY * 2, behavior: 'auto' });
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [isOpen]);

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
            <div ref={scrollRef} className="flex-1 overflow-x-auto no-scrollbar px-4 pb-4">
                <div className="flex gap-3 h-full items-stretch" style={{ minWidth: 'max-content' }}>

                    {/* VIP Lounge Card */}
                    <div className="flex flex-col rounded-2xl overflow-hidden shrink-0"
                        style={{ width: CARD_W, background: 'linear-gradient(160deg,#2a1500,#5c3000,#2a1500)' }}>
                        <div className="shrink-0 px-4 pt-4 pb-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-2xl">👑</span>
                                {isVip
                                    ? <span className="text-[9px] font-black bg-yellow-500 text-black px-2 py-0.5 rounded-full uppercase">ACTIVE</span>
                                    : <span className="text-[9px] font-black text-yellow-400 uppercase tracking-wide">₱ 299</span>}
                            </div>
                            <div className="font-black text-yellow-300 text-sm uppercase tracking-wider leading-none">VIP Lounge</div>
                            <div className="text-yellow-200/50 text-[10px] mt-0.5 leading-tight">Exclusive high-roller access</div>
                        </div>
                        <div className="flex-1 px-4 py-2 flex flex-col gap-1.5">
                            {vipBenefits.map((b, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                    <span className="text-yellow-400 text-[10px] leading-none mt-0.5 shrink-0">✦</span>
                                    <span className="text-yellow-100/80 text-[10px] leading-tight">{b}</span>
                                </div>
                            ))}
                        </div>
                        <div className="shrink-0 px-3 pb-3 pt-1">
                            <button onClick={onBuyVip} disabled={isVip}
                                className="w-full py-2.5 rounded-xl font-black uppercase text-xs btn-3d tracking-widest"
                                style={{ background: isVip ? 'linear-gradient(180deg,#6b7280,#374151)' : 'linear-gradient(180deg,#fbbf24,#b45309)', boxShadow: isVip ? '0 3px 0 #1f2937' : '0 3px 0 #78350f', color: '#fff', cursor: isVip ? 'not-allowed' : 'pointer' }}>
                                {isVip ? '✓ Active' : '👑 Get VIP'}
                            </button>
                        </div>
                    </div>

                    {/* Monthly Pass Card */}
                    <div className="flex flex-col rounded-2xl overflow-hidden shrink-0"
                        style={{ width: CARD_W, background: 'linear-gradient(160deg,#0e0030,#2d0060,#0e0030)' }}>
                        <div className="shrink-0 px-4 pt-4 pb-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-2xl">📜</span>
                                {isPremium
                                    ? <span className="text-[9px] font-black bg-purple-500 text-white px-2 py-0.5 rounded-full uppercase">ACTIVE</span>
                                    : <span className="text-[9px] font-black text-purple-300 uppercase tracking-wide">₱ 199</span>}
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
                                style={{ background: isPremium ? 'linear-gradient(180deg,#6b7280,#374151)' : 'linear-gradient(180deg,#a855f7,#6d28d9)', boxShadow: isPremium ? '0 3px 0 #1f2937' : '0 3px 0 #4c1d95', color: '#fff', cursor: isPremium ? 'not-allowed' : 'pointer' }}>
                                {isPremium ? '✓ Active' : '📜 Get Pass'}
                            </button>
                        </div>
                    </div>

                    {/* Bundle Cards */}
                    {bundles.map(bundle => (
                        <div key={bundle.id} className="flex flex-col rounded-2xl overflow-hidden shrink-0"
                            style={{ width: CARD_W, background: bundle.bg }}>
                            <div className="shrink-0 px-4 pt-4 pb-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                                        style={{ background: bundle.tagColor, color: '#000' }}>{bundle.tag}</span>
                                    <span className="text-[9px] font-black line-through" style={{ color: 'rgba(255,255,255,0.3)' }}>{bundle.origPrice}</span>
                                </div>
                                <div className="font-black text-white text-sm uppercase tracking-wider leading-none mt-1">{bundle.name}</div>
                                <div className="font-black text-xs mt-0.5" style={{ color: bundle.tagColor }}>{bundle.price}</div>
                            </div>
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
                                    style={{ background: `linear-gradient(180deg,${bundle.tagColor},${bundle.tagColor}88)`, boxShadow: `0 3px 0 rgba(0,0,0,0.5)` }}>
                                    Buy {bundle.price}
                                </button>
                            </div>
                        </div>
                    ))}

                </div>
            </div>
        </div>
    );
};
