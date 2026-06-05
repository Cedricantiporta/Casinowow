import React, { useState, useEffect, useRef } from 'react';
import { formatK } from '../constants';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBuy: (type: 'COIN' | 'BOOST' | 'DIAMOND' | 'PASS_XP' | 'PACK_CREDIT', amount: number, duration?: number, cost?: number) => void;
    level: number;
    isFreeStashClaimed?: boolean;
    freeCoinsAvailable?: boolean;
    freeCoinsAmount?: number;
    initialTab?: 'COINS' | 'BOOSTS' | 'DIAMONDS';
    balance?: number;
    diamonds?: number;
    maxBet?: number;
    claimedItems?: string[];
    onClaimItem?: (label: string) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, onBuy, level, isFreeStashClaimed, freeCoinsAvailable = false, freeCoinsAmount = 300000, balance = 0, diamonds = 0, maxBet = 10000, initialTab, claimedItems, onClaimItem }) => {
    const [dynamicPacks, setDynamicPacks] = useState<any[]>([]);
    const [cooldown, setCooldown] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Non-passive wheel handler so we can preventDefault and scroll horizontally
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

    const handleBuy = (action: () => void) => {
        if (cooldown) return;
        action();
        setCooldown(true);
        setTimeout(() => setCooldown(false), 1000);
    };

    const fmt = formatK;

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
                pesosLabel: String(price),
                color: colors[i],
                action: () => onBuy('COIN', amount, 0, price),
            };
        }));
    }, [isOpen, maxBet]);

    if (!isOpen) return null;

    const gemPacks = [
        { icon: '💎', label: '50 Gems',    sub: '50',    color: 'from-sky-400 to-cyan-700',       action: () => onBuy('DIAMOND', 50)   },
        { icon: '💎', label: '150 Gems',   sub: '150',   color: 'from-cyan-500 to-blue-700',      action: () => onBuy('DIAMOND', 150)  },
        { icon: '💎', label: '500 Gems',   sub: '500',   color: 'from-blue-500 to-indigo-700',    action: () => onBuy('DIAMOND', 500)  },
        { icon: '💎', label: '1,500 Gems', sub: '1,500', color: 'from-indigo-500 to-purple-700',  action: () => onBuy('DIAMOND', 1500) },
        { icon: '💎', label: '5,000 Gems', sub: '5,000', color: 'from-purple-500 to-fuchsia-700', action: () => onBuy('DIAMOND', 5000) },
    ];

    const boostPacks = [
        { icon: '📦', label: '10 Pack Credits',  sub: '10 Credits', price: '45 💎',  color: 'from-orange-600 to-red-800',     action: () => onBuy('PACK_CREDIT', 10,  0, 45)  },
        { icon: '📦', label: '100 Pack Credits', sub: '100 Credits',price: '400 💎', color: 'from-orange-700 to-red-900',     action: () => onBuy('PACK_CREDIT', 100, 0, 400) },
        { icon: '🚀', label: 'XP Boost 30m',     sub: '2× XP',      price: '200 💎', color: 'from-fuchsia-600 to-fuchsia-900',action: () => onBuy('BOOST',  2, 1_800_000,  200) },
        { icon: '🚀', label: 'XP Boost 12H',     sub: '2× XP',      price: '500 💎', color: 'from-fuchsia-700 to-purple-900', action: () => onBuy('BOOST',  2, 43_200_000, 500) },
        { icon: '📜', label: 'Mission XP 30m',   sub: '2× Mission', price: '300 💎', color: 'from-indigo-500 to-indigo-800',  action: () => onBuy('PASS_XP', 2, 1_800_000, 300) },
    ];

    const freeItem = {
        icon: '🎁',
        label: 'FREE COINS',
        sub: fmt(freeCoinsAmount),
        price: isFreeStashClaimed ? 'CLAIMED' : 'CLAIM',
        color: isFreeStashClaimed ? 'from-gray-600 to-gray-800' : 'from-lime-500 to-green-700',
        isClaimed: !!isFreeStashClaimed,
        isRealMoney: false,
        action: () => !isFreeStashClaimed && onBuy('COIN', freeCoinsAmount, 0, 0),
    };

    // Build all items — real-money items get FREE/CLAIMED logic, others keep their price
    const realMoneyItems = [
        ...dynamicPacks.map(item => ({ ...item, isRealMoney: true })),
        ...gemPacks.map(item => ({ ...item, isRealMoney: true })),
    ].map(item => {
        const isClaimed = claimedItems?.includes(item.label) ?? false;
        return {
            ...item,
            price: isClaimed ? (item.pesosLabel ?? item.sub) : 'FREE',
            isClaimed,
            action: isClaimed ? () => {} : () => { item.action(); onClaimItem?.(item.label); },
        };
    });

    const allItems = [
        ...realMoneyItems,
        ...boostPacks.map(item => ({ ...item, isRealMoney: false, isClaimed: false })),
        freeItem,
    ];

    return (
        <div
            className="fixed inset-0 z-[150] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(180deg,#0d0814 0%,#180830 100%)' }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0 border-b border-white/10">
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
                {/* Section tabs */}
                {[
                    { label: '🪙', name: 'Coins',  idx: 0,  bg: '#b8860b' },
                    { label: '💎', name: 'Gems',   idx: 5,  bg: '#0e7490' },
                    { label: '🚀', name: 'Boosts', idx: 10, bg: '#7c3aed' },
                ].map(tab => (
                    <button key={tab.name} onClick={() => scrollToSection(tab.idx)}
                        className="btn-3d px-2 py-1 rounded-lg text-[9px] font-black text-white uppercase leading-none flex flex-col items-center gap-0.5"
                        style={{ background: tab.bg, border: '1px solid rgba(255,255,255,0.25)', minWidth: '34px' }}>
                        <span>{tab.label}</span>
                        <span>{tab.name}</span>
                    </button>
                ))}
                <button key="Free" onClick={() => scrollToSection(15)}
                    className="btn-3d px-2 py-1 rounded-lg text-[9px] font-black text-white uppercase leading-none flex flex-col items-center gap-0.5 relative"
                    style={{ background: '#166534', border: '1px solid rgba(255,255,255,0.25)', minWidth: '34px' }}>
                    <span>🎁</span>
                    <span>Free</span>
                    {freeCoinsAvailable && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse" />
                    )}
                </button>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x"></i></div>
            </div>

            {/* Scroll area */}
            <div className="flex-1 min-h-0 pb-4">
                <div
                    ref={scrollRef}
                    className="w-full h-full overflow-x-auto overflow-y-hidden no-scrollbar py-3 px-4"
                >
                    <div className="flex gap-3 h-full items-stretch min-w-max">
                        {allItems.map((item, i) => {
                            const isGemBuy = !item.isRealMoney && item !== freeItem;
                            const btnDisabled = item.isClaimed || cooldown;

                            return (
                                <div
                                    key={i}
                                    className={`
                                        flex-shrink-0 w-[140px]
                                        flex flex-col items-center justify-between
                                        rounded-2xl overflow-hidden
                                        px-3 pt-3 pb-2
                                        bg-gradient-to-b ${item.color}
                                        shadow-xl transition-all
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
                                        {/* Price/action button — only this part is disabled when claimed */}
                                        <button
                                            onClick={() => !btnDisabled && handleBuy(item.action)}
                                            disabled={btnDisabled}
                                            className={`
                                                btn-3d w-full py-2 rounded-xl text-xs font-black text-white uppercase text-center tracking-wide transition-all
                                                ${btnDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.97]'}
                                            `}
                                            style={{
                                                background: item.isClaimed
                                                    ? 'rgba(0,0,0,0.4)'
                                                    : item.price === 'FREE' || item.price === 'CLAIM'
                                                        ? 'linear-gradient(180deg,#22c55e,#15803d)'
                                                        : 'rgba(0,0,0,0.65)',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                boxShadow: btnDisabled ? 'none' : '0 3px 0 rgba(0,0,0,0.6)',
                                            }}
                                        >
                                            {item.price}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
