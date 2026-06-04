import React, { useState, useEffect, useRef } from 'react';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBuy: (type: 'COIN' | 'BOOST' | 'DIAMOND' | 'PASS_XP' | 'PACK_CREDIT', amount: number, duration?: number, cost?: number) => void;
    level: number;
    isFreeStashClaimed?: boolean;
    initialTab?: 'COINS' | 'BOOSTS' | 'DIAMONDS';
    balance?: number;
    diamonds?: number;
    maxBet?: number;
    claimedItems?: string[];
    onClaimItem?: (label: string) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, onBuy, level, isFreeStashClaimed, balance = 0, diamonds = 0, maxBet = 10000, initialTab, claimedItems, onClaimItem }) => {
    const [dynamicPacks, setDynamicPacks] = useState<any[]>([]);
    const [cooldown, setCooldown] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleBuy = (action: () => void) => {
        if (cooldown) return;
        action();
        setCooldown(true);
        setTimeout(() => setCooldown(false), 1000);
    };

    const fmt = (n: number) => {
        const abs = Math.abs(n);
        const sign = n < 0 ? '-' : '';
        if (abs >= 1e15) return sign + (abs / 1e15).toFixed(2).replace(/\.?0+$/, '') + 'Q';
        if (abs >= 1e12) return sign + (abs / 1e12).toFixed(2).replace(/\.?0+$/, '') + 'T';
        if (abs >= 1e9)  return sign + (abs / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
        if (abs >= 1e6)  return sign + (abs / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
        return n.toLocaleString('en-US');
    };

    const startScroll = (dir: 'left' | 'right') => {
        if (scrollInterval.current) return;
        const amount = dir === 'right' ? 20 : -20;
        const scrollAction = () => scrollRef.current?.scrollBy({ left: amount, behavior: 'auto' });
        scrollAction();
        scrollInterval.current = setInterval(scrollAction, 16);
    };

    const stopScroll = () => {
        if (scrollInterval.current) { clearInterval(scrollInterval.current); scrollInterval.current = null; }
    };

    // Tab scroll: Coins=idx 0, Gems=idx 5, Boosts=idx 10, Free=idx 15
    const scrollToSection = (startIdx: number) => {
        scrollRef.current?.scrollTo({ left: startIdx * 152, behavior: 'smooth' });
    };

    useEffect(() => {
        if (!isOpen) return;
        const tabIdxMap: Record<string, number> = { 'COINS': 0, 'DIAMONDS': 5, 'BOOSTS': 10 };
        const idx = tabIdxMap[initialTab || 'COINS'] ?? 0;
        if (idx > 0) {
            setTimeout(() => scrollToSection(idx), 80);
        }
    }, [isOpen, initialTab]);

    useEffect(() => {
        if (!isOpen) return;
        const prices = [49, 99, 199, 499, 2490];
        const labels = ['Pile', 'Double', 'Big Bag', 'Roller', 'Jackpot'];
        const colors = [
            'from-cyan-500 to-cyan-800',
            'from-green-500 to-green-800',
            'from-emerald-500 to-emerald-800',
            'from-purple-500 to-purple-800',
            'from-yellow-500 to-amber-700',
        ];
        setDynamicPacks(prices.map((price, i) => {
            const amount = Math.round((price / 50) * maxBet);
            return {
                icon: '🪙',
                label: labels[i],
                sub: fmt(amount),
                price: `$ ${price.toLocaleString('en-US')}`,
                color: colors[i],
                action: () => onBuy('COIN', amount, 0, price),
            };
        }));
    }, [isOpen, maxBet]);

    if (!isOpen) return null;

    const gemPacks = [
        { icon: '💎', label: '50 Gems',    sub: '50',   price: '$ 49',   color: 'from-sky-400     to-cyan-700',    action: () => onBuy('DIAMOND', 50)   },
        { icon: '💎', label: '150 Gems',   sub: '150',  price: '$ 99',   color: 'from-cyan-500    to-blue-700',    action: () => onBuy('DIAMOND', 150)  },
        { icon: '💎', label: '500 Gems',   sub: '500',  price: '$ 249',  color: 'from-blue-500    to-indigo-700',  action: () => onBuy('DIAMOND', 500)  },
        { icon: '💎', label: '1,500 Gems', sub: '1,500',price: '$ 499',  color: 'from-indigo-500  to-purple-700',  action: () => onBuy('DIAMOND', 1500) },
        { icon: '💎', label: '5,000 Gems', sub: '5,000',price: '$ 1,250',color: 'from-purple-500  to-fuchsia-700', action: () => onBuy('DIAMOND', 5000) },
    ];

    const boostPacks = [
        { icon: '📦', label: '10 Pack Credits',   sub: '10 Credits',  price: '45 💎',   color: 'from-orange-600 to-red-800',     action: () => onBuy('PACK_CREDIT', 10,  0, 45)  },
        { icon: '📦', label: '100 Pack Credits',  sub: '100 Credits', price: '400 💎',  color: 'from-orange-700 to-red-900',     action: () => onBuy('PACK_CREDIT', 100, 0, 400) },
        { icon: '🚀', label: 'XP Boost 30m',      sub: '2× XP',       price: '200 💎',  color: 'from-fuchsia-600 to-fuchsia-900',action: () => onBuy('BOOST',  2, 1_800_000,  200) },
        { icon: '🚀', label: 'XP Boost 12H',      sub: '2× XP',       price: '500 💎',  color: 'from-fuchsia-700 to-purple-900', action: () => onBuy('BOOST',  2, 43_200_000, 500) },
        { icon: '📜', label: 'Mission XP 30m',    sub: '2× Mission',  price: '300 💎',  color: 'from-indigo-500  to-indigo-800', action: () => onBuy('PASS_XP', 2, 1_800_000, 300) },
    ];

    const freeItem = {
        icon: '🎁',
        label: 'FREE COINS',
        sub: '300,000',
        price: isFreeStashClaimed ? 'CLAIMED' : 'CLAIM',
        color: isFreeStashClaimed ? 'from-gray-600 to-gray-800' : 'from-lime-500 to-green-700',
        disabled: !!isFreeStashClaimed,
        action: () => !isFreeStashClaimed && onBuy('COIN', 300_000, 0, 0),
    };

    const allItems = [...dynamicPacks, ...gemPacks, ...boostPacks, freeItem];

    const realMoneyCount = dynamicPacks.length + gemPacks.length; // first N items are real-money
    const renderedItems = allItems.map((item, i) => {
        if (i < realMoneyCount) {
            const isClaimed = claimedItems?.includes(item.label);
            return {
                ...item,
                price: isClaimed ? 'CLAIMED' : item.price,
                disabled: isClaimed ? true : item.disabled,
                action: isClaimed ? () => {} : () => { item.action(); onClaimItem?.(item.label); },
            };
        }
        return item;
    });

    return (
        <div
            className="fixed inset-0 z-[150] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#8040c0 0%,#5a1ea0 35%,#38086e 70%,#240550 100%)' }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-2 shrink-0">
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <div className="coin">$</div>
                        <span className="num font-mono">{fmt(balance)}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <div className="gem"></div>
                        <span className="num font-mono">{fmt(diamonds)}</span>
                    </div>
                </div>
                <div className="flex-1"></div>
                {/* Section tabs — right side, solid colors */}
                {[
                    { label: '🪙',  name: 'Coins',  idx: 0,  bg: '#b8860b' },
                    { label: '💎',  name: 'Gems',   idx: 5,  bg: '#0e7490' },
                    { label: '🚀',  name: 'Boosts', idx: 10, bg: '#7c3aed' },
                    { label: '🎁',  name: 'Free',   idx: 15, bg: '#166534' },
                ].map(tab => (
                    <button key={tab.name} onClick={() => scrollToSection(tab.idx)}
                        className="btn-3d px-2 py-1 rounded-lg text-[9px] font-black text-white uppercase leading-none flex flex-col items-center gap-0.5"
                        style={{ background: tab.bg, border: '1px solid rgba(255,255,255,0.25)', minWidth: '34px' }}>
                        <span>{tab.label}</span>
                        <span>{tab.name}</span>
                    </button>
                ))}
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x"></i></div>
            </div>

            {/* Scroll area — nav arrows overlay the card list, no side margin */}
            <div className="flex-1 relative min-h-0 pb-4">
                {/* Left arrow — transparent overlay */}
                <button
                    onMouseDown={() => startScroll('left')}
                    onMouseUp={stopScroll}
                    onMouseLeave={stopScroll}
                    onTouchStart={() => startScroll('left')}
                    onTouchEnd={stopScroll}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-12 flex items-center justify-center text-white text-sm font-black active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(90deg,rgba(60,0,100,0.7),transparent)', borderRadius:'0 8px 8px 0' }}
                >◀</button>

                {/* Item list — full width, no px offset */}
                <div ref={scrollRef} className="w-full h-full overflow-x-auto overflow-y-hidden no-scrollbar py-1 px-6">
                    <div className="flex gap-3 h-full items-stretch min-w-max">
                        {renderedItems.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => handleBuy(item.action)}
                                disabled={item.disabled || cooldown}
                                className={`
                                    flex-shrink-0 w-[140px]
                                    flex flex-col items-center justify-between
                                    rounded-2xl overflow-hidden
                                    px-3 pt-3 pb-2
                                    bg-gradient-to-b ${item.color}
                                    hover:brightness-110 active:scale-[0.97]
                                    transition-all shadow-xl
                                    ${(item.disabled || cooldown) ? 'grayscale opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                <div className="text-xs font-black uppercase text-white tracking-widest leading-none text-center">
                                    {item.label}
                                </div>
                                <div className="flex-1 flex items-center justify-center py-1">
                                    <span className="text-[5rem] leading-none drop-shadow-2xl">{item.icon}</span>
                                </div>
                                <div className="w-full flex flex-col gap-1.5">
                                    {item.sub && (
                                        <div className="text-sm font-black text-white text-center leading-none drop-shadow-sm">
                                            {item.sub}
                                        </div>
                                    )}
                                    {/* Solid price button */}
                                    <div
                                        className="btn-3d w-full py-2 rounded-xl text-xs font-black text-white uppercase text-center tracking-wide"
                                        style={{
                                            background: 'rgba(0,0,0,0.65)',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            boxShadow: '0 3px 0 rgba(0,0,0,0.6)'
                                        }}
                                    >
                                        {item.price}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right arrow — transparent overlay */}
                <button
                    onMouseDown={() => startScroll('right')}
                    onMouseUp={stopScroll}
                    onMouseLeave={stopScroll}
                    onTouchStart={() => startScroll('right')}
                    onTouchEnd={stopScroll}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-12 flex items-center justify-center text-white text-sm font-black active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(270deg,rgba(60,0,100,0.7),transparent)', borderRadius:'8px 0 0 8px' }}
                >▶</button>
            </div>
        </div>
    );
};
