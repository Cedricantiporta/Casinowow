import React, { useState, useEffect, useRef } from 'react';
import { formatK } from '../constants';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBuy: (type: 'COIN' | 'BOOST' | 'DIAMOND' | 'PASS_XP' | 'PACK_CREDIT' | 'COLLECT_BOOST', amount: number, duration?: number, cost?: number) => void;
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
    isVip?: boolean;
    vipLevel?: number;
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, onBuy, level, isFreeStashClaimed, freeCoinsAvailable = false, freeCoinsAmount = 300000, balance = 0, diamonds = 0, maxBet = 10000, initialTab, claimedItems, onClaimItem, isVip, vipLevel }) => {
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
        const prices = [29, 49, 99, 249, 629];
        const coinBase = [49, 99, 199, 499, 2490];
        const labels = ['Pile', 'Double', 'Big Bag', 'Roller', 'Jackpot'];
        const icons = ['/coin_1.png', '/coin_2.png', '/coin_3.png', '/coin_4.png', '/coin_5.png'];
        const colors = [
            'from-cyan-500 to-cyan-800',
            'from-green-500 to-green-800',
            'from-emerald-500 to-emerald-800',
            'from-purple-500 to-purple-800',
            'from-yellow-500 to-amber-700',
        ];
        setDynamicPacks(prices.map((price, i) => {
            const amount = Math.round((coinBase[i] / 50) * maxBet * 100);
            return {
                icon: icons[i],
                label: labels[i],
                sub: fmt(amount),
                pesosLabel: String(price),
                color: colors[i],
                action: () => onBuy('COIN', amount, 0, price),
            };
        }));
    }, [isOpen, maxBet]);

    if (!isOpen) return null;

    const discount = isVip
        ? (vipLevel === 1 ? 5 : vipLevel === 2 ? 10 : 20)
        : 0;

    const gemPacks = [
        { icon: '/gem_1.png', label: '100 Gems',   sub: '100',   pesosLabel: '49',  color: 'from-sky-400 to-cyan-700',       action: () => onBuy('DIAMOND', 100)  },
        { icon: '/gem_2.png', label: '500 Gems',   sub: '500',   pesosLabel: '199', color: 'from-blue-500 to-indigo-700',    action: () => onBuy('DIAMOND', 500)  },
        { icon: '/gem_3.png', label: '2,500 Gems', sub: '2,500', pesosLabel: '499', color: 'from-purple-500 to-fuchsia-700', action: () => onBuy('DIAMOND', 2500) },
    ];

    const boostPacks = [
        { icon: '/ui/boost.png', label: 'XP Boost 30m',       sub: '2× XP',        gemCost:  50, color: 'from-fuchsia-600 to-fuchsia-900', action: () => onBuy('BOOST',         2, 1_800_000,    50) },
        { icon: '/ui/boost.png', label: 'XP Boost 12H',       sub: '2× XP',        gemCost: 500, color: 'from-fuchsia-700 to-purple-900',  action: () => onBuy('BOOST',         2, 43_200_000,  500) },
        { icon: '/ui/boost.png', label: 'Mission XP 30m',     sub: '2× Mission',   gemCost:  50, color: 'from-indigo-500 to-indigo-800',   action: () => onBuy('PASS_XP',       2, 1_800_000,    50) },
        { icon: '/bonus wheel shop.png', label: 'Collect Boost 12H', sub: '2× Collect', gemCost: 100, color: 'from-yellow-600 to-amber-900',    action: () => onBuy('COLLECT_BOOST', 2, 43_200_000,  100) },
    ];

    const freeItem = {
        icon: '/ui/gift_store.png',
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
            style={{ background: 'linear-gradient(160deg,#5a18a0 0%,#40108a 50%,#2a0860 100%)' }}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-2 shrink-0">
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1" style={{ background: 'rgba(0,0,0,0.55)' }}>
                        <img src="/new_coinicon.png" alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                        <span className="num font-mono">{fmt(balance)}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1" style={{ background: 'rgba(0,0,0,0.55)' }}>
                        <img src="/symbols/diamond.png" alt="" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />
                        <span className="num font-mono">{fmt(diamonds)}</span>
                    </div>
                </div>
                <div className="flex-1"></div>
                {/* Section tabs */}
                <div className="flex items-center gap-1">
                    {[
                        { name: 'Coins',  sec: 'COINS'    as const },
                        { name: 'Gems',   sec: 'DIAMONDS' as const },
                        { name: 'Boosts', sec: 'BOOSTS'   as const },
                    ].map(tab => (
                        <button key={tab.name} onClick={() => scrollToSection(tab.sec)} className="pill-green">
                            <div className="pill-face" style={{ padding: '5px 10px', fontSize: '10px' }}>{tab.name}</div>
                        </button>
                    ))}
                    <button onClick={() => scrollToSection('FREE')} className="pill-green relative">
                        <div className="pill-face" style={{ padding: '5px 10px', fontSize: '10px' }}>Free</div>
                        {freeCoinsAvailable && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full z-10" style={{ background: '#dc2626', border: '1.5px solid #f0c000' }} />
                        )}
                    </button>
                </div>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}><i className="ti ti-x"></i></div>
            </div>

            {/* Popup overlay */}
            {popup && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPopup(null)}>
                    <div className="rounded-3xl px-6 py-5 max-w-[260px] text-center shadow-2xl" style={{ background: 'linear-gradient(180deg,#c510e0 0%,#a018d4 12%,#8028c8 28%,#6018a8 55%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
                        <div className="text-white font-black text-sm mb-1">
                            {popup === 'nogems' ? 'Not Enough Gems' : 'Purchase Unavailable'}
                        </div>
                        <div className="text-white/50 text-[10px] mb-3">
                            {popup === 'nogems' ? 'You need more gems to purchase this item.' : 'Real money purchases are not available in this environment.'}
                        </div>
                        <button onClick={() => setPopup(null)} className="pill-green"><div className="pill-face">OK</div></button>
                    </div>
                </div>
            )}

            {/* Scroll area */}
            <div className="flex-1 min-h-0 pb-4">
                <div
                    ref={scrollRef}
                    className="w-full h-full overflow-x-auto overflow-y-hidden no-scrollbar py-3"
                    style={{ paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 1rem)', paddingRight: '1rem' }}
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
                                        if (item.isRealMoney) { setPopup('nopay'); return; }
                                        if (item.isClaimed) { setPopup('nopay'); return; }
                                        if (gemCost !== undefined && diamonds < gemCost) { setPopup('nogems'); return; }
                                        handleBuy(item.action);
                                    };
                                    const showVipDiscount = isVip && discount > 0 && item.isRealMoney;
                                    const pesoMatch = item.price.match(/₱\s*(\d+)/);
                                    const originalPeso = pesoMatch ? parseInt(pesoMatch[1], 10) : null;
                                    const discountedPeso = (showVipDiscount && originalPeso !== null)
                                        ? Math.floor(originalPeso * (1 - discount / 100))
                                        : null;
                                    const cardBg = showVipDiscount
                                        ? 'linear-gradient(180deg,rgba(200,140,30,0.65) 0%,rgba(90,40,5,0.97) 100%)'
                                        : 'linear-gradient(180deg,rgba(130,55,230,0.65) 0%,rgba(50,12,110,0.97) 100%)';
                                    const cardShadow = showVipDiscount
                                        ? 'inset 0 1px 0 rgba(255,210,90,0.5), 0 4px 16px rgba(0,0,0,0.6)'
                                        : 'inset 0 1px 0 rgba(190,140,255,0.5), 0 4px 16px rgba(0,0,0,0.6)';
                                    return (
                                        <div key={i} className={`flex-shrink-0 w-[140px] flex flex-col items-center justify-between rounded-2xl overflow-hidden px-3 pt-3 pb-2 transition-all relative`} style={{ background: cardBg, boxShadow: cardShadow }}>
                                            {showVipDiscount && (
                                                <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none"
                                                    style={{ background: 'linear-gradient(135deg,#f59e0b,#b45309)', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                                                    VIP -{discount}%
                                                </div>
                                            )}
                                            <div className={`text-xs font-black uppercase text-white tracking-widest leading-none w-full ${showVipDiscount ? 'text-left pr-12' : 'text-center'}`}>{item.label}</div>
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
                                                    disabled={btnDisabled || item.isClaimed}
                                                    className={`pill-green w-full ${item.isClaimed ? 'opacity-40' : ''}`}
                                                >
                                                    <div className="pill-face" style={{ fontSize: '10px' }}>
                                                        {item.isClaimed
                                                            ? '✓ Claimed'
                                                            : item.price.startsWith('GEM:')
                                                                ? <><img src="/symbols/diamond.png" alt="" style={{ width: '0.85em', height: '0.85em', objectFit: 'contain', display: 'inline-block' }} /> {item.price.slice(4)}</>
                                                                : (showVipDiscount && discountedPeso !== null)
                                                                    ? <span className="flex items-center gap-1 justify-center"><span style={{ opacity: 0.6, textDecoration: 'line-through' }}>₱ {originalPeso}</span><span>₱ {discountedPeso}</span></span>
                                                                    : item.price}
                                                    </div>
                                                </button>
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
