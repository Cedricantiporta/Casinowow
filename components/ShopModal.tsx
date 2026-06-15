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
    const [popup, setPopup] = useState<'nopay' | 'nogems' | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const gemsSepRef = useRef<HTMLDivElement>(null);
    const boostsSepRef = useRef<HTMLDivElement>(null);
    const freeSepRef = useRef<HTMLDivElement>(null);

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

    const scrollToSection = (section: 'COINS' | 'DIAMONDS' | 'BOOSTS' | 'FREE' | number) => {
        const container = scrollRef.current;
        if (!container) return;
        if (section === 'COINS' || section === 0) { container.scrollTo({ left: 0, behavior: 'smooth' }); return; }
        const refMap: Record<string, React.RefObject<HTMLDivElement>> = { DIAMONDS: gemsSepRef, BOOSTS: boostsSepRef, FREE: freeSepRef };
        const legacyIdxMap: Record<number, React.RefObject<HTMLDivElement>> = { 5: gemsSepRef, 8: boostsSepRef, 11: freeSepRef };
        const ref = typeof section === 'string' ? refMap[section] : legacyIdxMap[section];
        if (ref?.current) { container.scrollTo({ left: ref.current.offsetLeft - 8, behavior: 'smooth' }); }
    };

    useEffect(() => {
        if (!isOpen) return;
        const tabSectionMap: Record<string, 'COINS' | 'DIAMONDS' | 'BOOSTS'> = { 'COINS': 'COINS', 'DIAMONDS': 'DIAMONDS', 'BOOSTS': 'BOOSTS' };
        const sec = tabSectionMap[initialTab || 'COINS'] ?? 'COINS';
        if (sec !== 'COINS') {
            setTimeout(() => scrollToSection(sec), 80);
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
                icon: '/symbols/coin.png',
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
        { icon: '/symbols/diamond.png', label: '100 Gems',   sub: '100',   pesosLabel: '99',  color: 'from-sky-400 to-cyan-700',       action: () => onBuy('DIAMOND', 100)  },
        { icon: '/symbols/diamond.png', label: '500 Gems',   sub: '500',   pesosLabel: '399', color: 'from-blue-500 to-indigo-700',    action: () => onBuy('DIAMOND', 500)  },
        { icon: '/symbols/diamond.png', label: '5,000 Gems', sub: '5,000', pesosLabel: '999', color: 'from-purple-500 to-fuchsia-700', action: () => onBuy('DIAMOND', 5000) },
    ];

    const boostPacks = [
        { icon: '/ui/boost.png', label: 'XP Boost 30m',   sub: '2× XP',      gemCost:  50, color: 'from-fuchsia-600 to-fuchsia-900', action: () => onBuy('BOOST',   2, 1_800_000,   50) },
        { icon: '/ui/boost.png', label: 'XP Boost 12H',   sub: '2× XP',      gemCost: 500, color: 'from-fuchsia-700 to-purple-900',  action: () => onBuy('BOOST',   2, 43_200_000, 500) },
        { icon: '/ui/boost.png', label: 'Mission XP 30m', sub: '2× Mission', gemCost:  50, color: 'from-indigo-500 to-indigo-800',   action: () => onBuy('PASS_XP', 2, 1_800_000,   50) },
    ];

    const freeItem = {
        icon: '🎁',
        label: 'FREE COINS',
        sub: fmt(freeCoinsAmount),
        price: isFreeStashClaimed ? 'CLAIMED' : 'CLAIM',
        color: isFreeStashClaimed ? 'from-gray-600 to-gray-800' : 'from-lime-500 to-green-700',
        isClaimed: !!isFreeStashClaimed,
        isRealMoney: false,
        gemCost: undefined as number | undefined,
        action: () => !isFreeStashClaimed && onBuy('COIN', freeCoinsAmount, 0, 0),
    };

    const coinItems = dynamicPacks.map(item => ({ ...item, isRealMoney: true, isClaimed: false, price: `₱ ${item.pesosLabel}`, gemCost: undefined as number | undefined }));
    const gemItems = gemPacks.map(item => ({ ...item, isRealMoney: true, isClaimed: false, price: `₱ ${item.pesosLabel}`, gemCost: undefined as number | undefined }));
    const boostItems = boostPacks.map(item => ({ ...item, isRealMoney: false, isClaimed: false, price: `GEM:${item.gemCost}` }));
    const freeItems = [freeItem];

    return (
        <div
            className="absolute inset-0 z-[150] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#1a0535 0%,#2d0764 50%,#180430 100%)' }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-2 shrink-0">
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <img src="/symbols/coin.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                        <span className="num font-mono">{fmt(balance)}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <img src="/symbols/diamond.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />
                        <span className="num font-mono">{fmt(diamonds)}</span>
                    </div>
                </div>
                <div className="flex-1"></div>
                {/* Section tabs */}
                {[
                    { label: <img src="/symbols/coin.png" alt="" style={{ width: '1.5em', height: '1.5em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />, name: 'Coins',  sec: 'COINS'    as const, bg: '#b8860b' },
                    { label: <img src="/symbols/diamond.png" alt="" style={{ width: '1.5em', height: '1.5em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />, name: 'Gems',   sec: 'DIAMONDS' as const, bg: '#0e7490' },
                    { label: <img src="/ui/boost.png" alt="" style={{ width: '1.5em', height: '1.5em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} />, name: 'Boosts', sec: 'BOOSTS'   as const, bg: '#7c3aed' },
                ].map((tab, i) => (
                    <React.Fragment key={tab.name}>
                        {i > 0 && <div className="w-px self-stretch bg-white/20 mx-0.5" />}
                        <button onClick={() => scrollToSection(tab.sec)}
                            className="btn-3d px-2 py-1 rounded-lg text-[9px] font-black text-white uppercase leading-none flex flex-col items-center gap-0.5"
                            style={{ background: tab.bg, minWidth: '34px' }}>
                            <span>{tab.label}</span>
                            <span>{tab.name}</span>
                        </button>
                    </React.Fragment>
                ))}
                <div className="w-px self-stretch bg-white/20 mx-0.5" />
                <button key="Free" onClick={() => scrollToSection('FREE')}
                    className="btn-3d px-2 py-1 rounded-lg text-[9px] font-black text-white uppercase leading-none flex flex-col items-center gap-0.5 relative"
                    style={{ background: '#166534', minWidth: '34px' }}>
                    <span>🎁</span>
                    <span>Free</span>
                    {freeCoinsAvailable && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full" style={{ background: '#dc2626', border: '1.5px solid #f0c000' }} />
                    )}
                </button>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x"></i></div>
            </div>

            {/* Popup overlay */}
            {popup && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPopup(null)}>
                    <div className="bg-[#1e0d30] rounded-2xl px-6 py-5 max-w-[260px] text-center shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="text-3xl mb-2">{popup === 'nogems' ? <img src="/symbols/diamond.png" alt="" style={{ width: '1em', height: '1em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block' }} /> : '🎮'}</div>
                        <div className="text-white font-black text-sm uppercase tracking-wide mb-1">
                            {popup === 'nogems' ? 'Not Enough Gems' : 'Purchase Unavailable'}
                        </div>
                        <div className="text-white/50 text-[10px] mb-3">
                            {popup === 'nogems' ? 'You need more gems to purchase this item.' : 'Real money purchases are not available in this environment.'}
                        </div>
                        <button onClick={() => setPopup(null)} className="btn-3d px-5 py-1.5 rounded-lg font-black text-white text-xs uppercase" style={{ background: 'linear-gradient(180deg,#7c3aed,#4c1d95)' }}>OK</button>
                    </div>
                </div>
            )}

            {/* Scroll area */}
            <div className="flex-1 min-h-0 pb-4">
                <div
                    ref={scrollRef}
                    className="w-full h-full overflow-x-auto overflow-y-hidden no-scrollbar py-3 px-4"
                >
                    <div className="flex gap-3 h-full items-stretch min-w-max">
                        {[
                            { items: coinItems, sepRef: null,         sepLabel: null,    sepColor: null },
                            { items: gemItems,  sepRef: gemsSepRef,   sepLabel: 'Gems',  sepColor: '#0e7490' },
                            { items: boostItems,sepRef: boostsSepRef, sepLabel: 'Boosts',sepColor: '#7c3aed' },
                            { items: freeItems, sepRef: freeSepRef,   sepLabel: 'Free',  sepColor: '#166534' },
                        ].map(({ items, sepRef, sepLabel, sepColor }) => (
                            <React.Fragment key={sepLabel ?? 'coins'}>
                                {sepRef && sepLabel && (
                                    <div ref={sepRef} className="flex items-stretch shrink-0 gap-0.5">
                                        <div className="w-px bg-white/15 self-stretch" />
                                        <div className="flex flex-col justify-center px-1">
                                            <div className="text-[8px] font-black uppercase tracking-widest"
                                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: sepColor ?? '#fff', letterSpacing: '0.15em' }}>
                                                {sepLabel}
                                            </div>
                                        </div>
                                        <div className="w-px bg-white/15 self-stretch" />
                                    </div>
                                )}
                                {items.map((item, i) => {
                                    const btnDisabled = cooldown;
                                    const gemCost = (item as any).gemCost as number | undefined;
                                    const onItemClick = () => {
                                        if (cooldown) return;
                                        if (item.isClaimed) { setPopup('nopay'); return; }
                                        if (gemCost !== undefined && diamonds < gemCost) { setPopup('nogems'); return; }
                                        handleBuy(item.action);
                                    };
                                    return (
                                        <div key={i} className={`flex-shrink-0 w-[140px] flex flex-col items-center justify-between rounded-2xl overflow-hidden px-3 pt-3 pb-2 bg-gradient-to-b ${item.color} shadow-xl transition-all`}>
                                            <div className="text-xs font-black uppercase text-white tracking-widest leading-none text-center">{item.label}</div>
                                            <div className="flex-1 flex items-center justify-center py-1">
                                                {typeof item.icon === 'string' && item.icon.startsWith('/') ? (
                                                    <img src={item.icon} alt="" style={{ width: '6rem', height: '6rem', objectFit: 'contain', display: 'block' }} />
                                                ) : (
                                                    <span className="text-[5rem] leading-none drop-shadow-2xl">{item.icon}</span>
                                                )}
                                            </div>
                                            <div className="w-full flex flex-col gap-1.5">
                                                {item.sub && (
                                                    <div className="text-sm font-black text-white text-center leading-none drop-shadow-sm">{item.sub}</div>
                                                )}
                                                <button
                                                    onClick={onItemClick}
                                                    disabled={btnDisabled}
                                                    className="btn-3d w-full py-2 rounded-xl text-xs font-black text-white uppercase text-center tracking-wide transition-all hover:brightness-110 active:scale-[0.97]"
                                                    style={{
                                                        background: item.isClaimed
                                                            ? 'linear-gradient(180deg,#6b7280,#374151)'
                                                            : item.price === 'FREE' || item.price === 'CLAIM'
                                                                ? 'linear-gradient(180deg,#22c55e,#15803d)'
                                                                : gemCost !== undefined
                                                                    ? 'linear-gradient(180deg,#a855f7,#6d28d9)'
                                                                    : 'linear-gradient(180deg,#f59e0b,#b45309)',
                                                        boxShadow: '0 3px 0 rgba(0,0,0,0.6)',
                                                    }}
                                                >{item.price.startsWith('GEM:') ? <><img src="/symbols/diamond.png" alt="" style={{ width: '0.85em', height: '0.85em', objectFit: 'contain', verticalAlign: 'middle', display: 'inline-block', marginRight: 2 }} />{item.price.slice(4)}</> : item.price}</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
