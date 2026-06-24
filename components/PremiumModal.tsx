import React, { useEffect, useRef, useState } from 'react';

import { formatCommaNumber } from '../constants';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    isVip: boolean;
    isPremium: boolean;
    onBuyVip: () => void;
    onBuyPremium: () => void;
    onBuyBundle?: () => void;
    maxBet?: number;
}

const CARD_W = 200;

// Sale-item icon set — image assets (no emojis).
const IC = {
    coin: '/symbols/coin.png',
    gem: '/symbols/diamond.png',
    cards: '/ui/cards.png',
    premium: '/ui/cards_new.png',
    boost: '/ui/boost.png',
    pick: '/ui/pick.png',
    dice: '/ui/dice.png',
    pass: '/ui/pass.png',
    vip: '/ui/VIP.png',
    collect: '/ui/collect.png',
};
const COLLECT_ITEM = { icon: IC.collect, label: '2× Collect Boost' };

const getBundles = (maxBet: number) => [
    {
        id: 'starter',
        name: 'Starter Bundle',
        tag: '50% OFF',
        tagColor: '#dc2626',
        bg: 'linear-gradient(160deg,#052e16,#166534,#052e16)',
        items: [
            { icon: IC.coin, label: `${formatCommaNumber(Math.round(maxBet * 50))} Coins` },
            { icon: IC.gem, label: '200 Gems' },
            { icon: IC.cards, label: '5 Standard Packs' },
            COLLECT_ITEM,
        ],
        origPrice: '₱ 200',
        price: '₱ 99',
    },
    {
        id: 'gem',
        name: 'Gem Bundle',
        tag: '60% OFF',
        tagColor: '#dc2626',
        bg: 'linear-gradient(160deg,#2e1065,#5b21b6,#2e1065)',
        items: [
            { icon: IC.gem, label: '2,000 Gems' },
            { icon: IC.coin, label: `${formatCommaNumber(Math.round(maxBet * 100))} Coins` },
            { icon: IC.boost, label: '2× XP Boost (1h)' },
            COLLECT_ITEM,
        ],
        origPrice: '₱ 500',
        price: '₱ 199',
    },
    {
        id: 'quest',
        name: 'Quest Bundle',
        tag: '55% OFF',
        tagColor: '#dc2626',
        bg: 'linear-gradient(160deg,#0c1a5e,#1e3a8a,#0c1a5e)',
        items: [
            { icon: IC.pick, label: '+20 Picks' },
            { icon: IC.dice, label: '+20 Dice' },
            { icon: IC.gem, label: '500 Gems' },
            { icon: IC.coin, label: `${formatCommaNumber(Math.round(maxBet * 25))} Coins` },
            COLLECT_ITEM,
        ],
        origPrice: '₱ 350',
        price: '₱ 159',
    },
    {
        id: 'mega',
        name: 'Mega Bundle',
        tag: '70% OFF',
        tagColor: '#dc2626',
        bg: 'linear-gradient(160deg,#451a03,#92400e,#451a03)',
        items: [
            { icon: IC.coin, label: `${formatCommaNumber(Math.round(maxBet * 500))} Coins` },
            { icon: IC.gem, label: '5,000 Gems' },
            { icon: IC.premium, label: '10 Premium Packs' },
            { icon: IC.boost, label: '2× XP Boost (24h)' },
            { icon: IC.pick, label: '+50 Picks' },
            COLLECT_ITEM,
        ],
        origPrice: '₱ 1,499',
        price: '₱ 449',
    },
    {
        id: 'vip-boost',
        name: 'VIP Boost Pack',
        tag: '65% OFF',
        tagColor: '#dc2626',
        bg: 'linear-gradient(160deg,#4c0519,#9f1239,#4c0519)',
        items: [
            { icon: IC.vip, label: 'VIP Access (7 Days)' },
            { icon: IC.coin, label: `${formatCommaNumber(Math.round(maxBet * 200))} Coins` },
            { icon: IC.gem, label: '1,000 Gems' },
            { icon: IC.dice, label: '+10 Dice' },
            { icon: IC.pick, label: '+10 Picks' },
            COLLECT_ITEM,
        ],
        origPrice: '₱ 799',
        price: '₱ 279',
    },
    {
        id: 'diamond',
        name: 'Diamond Pack',
        tag: '75% OFF',
        tagColor: '#dc2626',
        bg: 'linear-gradient(160deg,#083344,#0e7490,#083344)',
        items: [
            { icon: IC.gem, label: '10,000 Gems' },
            { icon: IC.coin, label: `${formatCommaNumber(Math.round(maxBet * 300))} Coins` },
            { icon: IC.premium, label: '40 Premium Packs' },
            { icon: IC.pass, label: 'Monthly Pass (30d)' },
            { icon: IC.dice, label: '+50 Dice' },
            { icon: IC.pick, label: '+50 Pickaxes' },
            COLLECT_ITEM,
        ],
        origPrice: '₱ 3,999',
        price: '₱ 999',
    },
];

const parsePesosNum = (s: string) => parseInt(s.replace(/[^\d,]/g, '').replace(',', ''), 10);
const vipDiscountedPrice = (price: string) => `₱ ${Math.floor(parsePesosNum(price) * 0.8).toLocaleString()}`;
// First-purchase 90% off (VIP + Mission Pass).
const firstBuyPrice = (price: string) => `₱ ${Math.max(1, Math.round(parsePesosNum(price) * 0.1)).toLocaleString()}`;

// Card backgrounds — purple + purple-gold, matching the daily-mission cards.
const PURPLE_BG = 'linear-gradient(180deg,rgba(197,16,224,0.45) 0%,rgba(160,60,255,0.30) 22%,rgba(18,4,56,0.96) 100%)';
const PURPLE_BG_SHADOW = 'inset 0 1px 0 rgba(200,120,255,0.5), 0 4px 16px rgba(0,0,0,0.6)';
const PURPLE_GOLD_BG = 'linear-gradient(180deg,rgba(168,85,247,0.6) 0%,rgba(201,144,26,0.62) 46%,rgba(40,12,70,0.96) 100%)';
const PURPLE_GOLD_SHADOW = 'inset 0 1px 0 rgba(255,225,150,0.5), 0 4px 16px rgba(0,0,0,0.6)';

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, isVip, isPremium, onBuyVip, onBuyPremium, onBuyBundle, maxBet = 10000 }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bundles = getBundles(maxBet);
    const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
    const visibleBundles = bundles.filter(b => !purchasedIds.has(b.id));

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

    const vipBenefits = ['10% Piggy Bank savings', '2× XP from spins', 'High-Limit Room access', '2× Collect Boost', '5% daily cashback (Inbox)', '+Weekly gems'];
    const passBenefits = ['Premium reward track', 'Exclusive gem rewards', 'XP mission booster', 'Monthly bonus coins', 'Prestige profile badge', 'Unlimited daily bonus'];

    return (
        <div className="absolute inset-0 z-[200] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#5a18a0 0%,#40108a 50%,#2a0860 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-2">
                <h2 className="font-black text-white text-base tracking-widest flex-1">Sale</h2>
                <div className="round-btn cursor-pointer" onClick={onClose}><i className="ti ti-x" /></div>
            </div>

            {/* Horizontal scroll row */}
            <div ref={scrollRef} className="flex-1 overflow-x-auto no-scrollbar px-4 pb-4">
                <div className="flex gap-3 h-full items-stretch" style={{ minWidth: 'max-content' }}>

                    {/* VIP Lounge Card */}
                    {!isVip && <div className="flex flex-col rounded-2xl overflow-hidden shrink-0 relative"
                        style={{ width: CARD_W, background: PURPLE_GOLD_BG, boxShadow: PURPLE_GOLD_SHADOW }}>
                        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[9px] font-black leading-none uppercase tracking-wide"
                            style={{ background: '#dc2626', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>90% Off</div>
                        <div className="shrink-0 px-4 pt-4 pb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <img src="/ui/VIP.png" alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} className="shrink-0" />
                                <div className="font-black text-yellow-300 text-sm tracking-wider leading-none">VIP Lounge</div>
                            </div>
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
                            <button onClick={onBuyVip} className="pill-green w-full">
                                <div className="pill-face" style={{ padding: '8px 12px', fontSize: '10px', gap: '6px' }}>
                                    <span style={{ opacity: 0.6, textDecoration: 'line-through' }}>₱ 299</span>
                                    <span>{firstBuyPrice('₱ 299')}</span>
                                </div>
                            </button>
                        </div>
                    </div>}

                    {/* Mission Pass Card */}
                    {!isPremium && <div className="flex flex-col rounded-2xl overflow-hidden shrink-0 relative"
                        style={{ width: CARD_W, background: PURPLE_GOLD_BG, boxShadow: PURPLE_GOLD_SHADOW }}>
                        <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[9px] font-black leading-none uppercase tracking-wide"
                            style={{ background: '#dc2626', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>90% Off</div>
                        <div className="shrink-0 px-4 pt-4 pb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <img src="/ui/pass.png" alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} className="shrink-0" />
                                <div className="font-black text-yellow-300 text-sm tracking-wider leading-none">Mission Pass</div>
                            </div>
                            <div className="text-yellow-200/50 text-[10px] mt-0.5 leading-tight">30-day premium reward track</div>
                        </div>
                        <div className="flex-1 px-4 py-2 flex flex-col gap-1.5">
                            {passBenefits.map((b, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                    <span className="text-yellow-400 text-[10px] leading-none mt-0.5 shrink-0">✦</span>
                                    <span className="text-yellow-100/80 text-[10px] leading-tight">{b}</span>
                                </div>
                            ))}
                        </div>
                        <div className="shrink-0 px-3 pb-3 pt-1">
                            <button onClick={onBuyPremium} className="pill-green w-full">
                                <div className="pill-face" style={{ padding: '8px 12px', fontSize: '10px', gap: '6px' }}>
                                    <span style={{ opacity: 0.6, textDecoration: 'line-through' }}>₱ 199</span>
                                    <span>{firstBuyPrice('₱ 199')}</span>
                                </div>
                            </button>
                        </div>
                    </div>}

                    {/* Bundle Cards */}
                    {visibleBundles.map(bundle => (
                        <div key={bundle.id} className="flex flex-col rounded-2xl overflow-hidden shrink-0"
                            style={{ width: CARD_W, background: PURPLE_BG, boxShadow: PURPLE_BG_SHADOW }}>
                            <div className="shrink-0 px-4 pt-4 pb-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
                                        style={{ background: bundle.tagColor, color: '#fff' }}>{bundle.tag}{isVip ? ' +VIP' : ''}</span>
                                </div>
                                <div className="font-black text-white text-sm uppercase tracking-wider leading-none mt-1">{bundle.name}</div>
                            </div>
                            <div className="flex-1 px-4 py-2 flex flex-col gap-2">
                                {bundle.items.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        {item.icon.startsWith('/') ? (
                                            <img src={item.icon} alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block', fontSize: '1rem' }} className="shrink-0" />
                                        ) : (
                                            <span className="text-base leading-none shrink-0">{item.icon}</span>
                                        )}
                                        <span className="text-white/90 text-[11px] leading-tight font-bold">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="shrink-0 px-3 pb-3 pt-1">
                                <button onClick={() => onBuyBundle?.()} className="pill-green w-full">
                                    <div className="pill-face" style={{ padding: '8px 12px', fontSize: '10px', gap: '6px' }}>
                                        <span style={{ opacity: 0.6, textDecoration: 'line-through' }}>{isVip ? bundle.price : bundle.origPrice}</span>
                                        <span>{isVip ? vipDiscountedPrice(bundle.price) : bundle.price}</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ))}

                </div>
            </div>
        </div>
    );
};
