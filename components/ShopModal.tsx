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
}

const arrowBtnStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg,#9050cc,#5020a0)',
    border: '1.5px solid #38106e',
    borderRadius: '8px',
    boxShadow: '0 3px 0 #1a0838, 0 4px 8px rgba(0,0,0,0.6)',
};

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, onBuy, level, isFreeStashClaimed, balance = 0, diamonds = 0 }) => {
    const [dynamicPacks, setDynamicPacks] = useState<any[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const fmt = (n: number) => n.toLocaleString('en-US');

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

    useEffect(() => {
        if (!isOpen) return;
        const B = 1_000_000;
        setDynamicPacks([
            { icon: '🪙', label: 'Pile',    sub: fmt(level * B * 1),    price: '₱ 49',    color: 'from-cyan-500    to-cyan-800',    action: () => onBuy('COIN', level * B * 1,   0, 49)   },
            { icon: '🪙', label: 'Double',  sub: fmt(level * B * 2.5),  price: '₱ 99',    color: 'from-green-500  to-green-800',   action: () => onBuy('COIN', level * B * 2.5, 0, 99)   },
            { icon: '🪙', label: 'Big Bag', sub: fmt(level * B * 5),    price: '₱ 199',   color: 'from-emerald-500 to-emerald-800', action: () => onBuy('COIN', level * B * 5,   0, 199)  },
            { icon: '🪙', label: 'Roller',  sub: fmt(level * B * 10),   price: '₱ 499',   color: 'from-purple-500 to-purple-800',  action: () => onBuy('COIN', level * B * 10,  0, 499)  },
            { icon: '🪙', label: 'Jackpot', sub: fmt(level * B * 50),   price: '₱ 2,490', color: 'from-yellow-500 to-amber-700',   action: () => onBuy('COIN', level * B * 50,  0, 2490) },
        ]);
    }, [isOpen, level]);

    if (!isOpen) return null;

    const gemPacks = [
        { icon: '💎', label: '50 Gems',    sub: '50',   price: '₱ 49',   color: 'from-sky-400     to-cyan-700',    action: () => onBuy('DIAMOND', 50)   },
        { icon: '💎', label: '150 Gems',   sub: '150',  price: '₱ 99',   color: 'from-cyan-500    to-blue-700',    action: () => onBuy('DIAMOND', 150)  },
        { icon: '💎', label: '500 Gems',   sub: '500',  price: '₱ 249',  color: 'from-blue-500    to-indigo-700',  action: () => onBuy('DIAMOND', 500)  },
        { icon: '💎', label: '1,500 Gems', sub: '1,500',price: '₱ 499',  color: 'from-indigo-500  to-purple-700',  action: () => onBuy('DIAMOND', 1500) },
        { icon: '💎', label: '5,000 Gems', sub: '5,000',price: '₱ 1,250',color: 'from-purple-500  to-fuchsia-700', action: () => onBuy('DIAMOND', 5000) },
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

    const allItems = [freeItem, ...dynamicPacks, ...gemPacks, ...boostPacks];

    return (
        <div
            className="fixed inset-0 z-[150] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#8040c0 0%,#5a1ea0 35%,#38086e 70%,#240550 100%)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <div className="coin">$</div>
                        <span className="num font-mono">{fmt(balance)}</span>
                    </div>
                    <div className="currency-pill flex items-center gap-1.5 px-2.5 py-1">
                        <div className="gem"></div>
                        <span className="num font-mono">{fmt(diamonds)}</span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-sm transition-all hover:bg-white/20 active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                >✕</button>
            </div>

            {/* Scroll area + arrows */}
            <div className="flex-1 relative flex items-stretch min-h-0 px-1 pb-4">
                {/* Left arrow */}
                <button
                    onMouseDown={() => startScroll('left')}
                    onMouseUp={stopScroll}
                    onMouseLeave={stopScroll}
                    onTouchStart={() => startScroll('left')}
                    onTouchEnd={stopScroll}
                    className="shrink-0 self-center w-7 h-10 flex items-center justify-center text-white text-xs font-black active:translate-y-[2px] active:shadow-none transition-transform mr-1"
                    style={arrowBtnStyle}
                >◀</button>

                {/* Item list */}
                <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar py-1">
                    <div className="flex gap-3 h-full items-stretch min-w-max">
                        {allItems.map((item, i) => (
                            <button
                                key={i}
                                onClick={item.action}
                                disabled={item.disabled}
                                className={`
                                    flex-shrink-0 w-[130px]
                                    flex flex-col items-center justify-between
                                    rounded-2xl overflow-hidden
                                    px-3 pt-3 pb-2
                                    bg-gradient-to-b ${item.color}
                                    hover:brightness-110 active:scale-[0.97]
                                    transition-all shadow-xl
                                    ${item.disabled ? 'grayscale opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                <div className="text-[9px] font-black uppercase text-white/80 tracking-widest leading-none text-center">
                                    {item.label}
                                </div>
                                <div className="flex-1 flex items-center justify-center py-1">
                                    <span className="text-[5rem] leading-none drop-shadow-2xl">{item.icon}</span>
                                </div>
                                <div className="w-full flex flex-col gap-1">
                                    {item.sub && (
                                        <div className="text-[11px] font-black text-white text-center leading-none drop-shadow-sm">
                                            {item.sub}
                                        </div>
                                    )}
                                    <div
                                        className="w-full py-1.5 rounded-xl text-[10px] font-black text-white uppercase text-center tracking-wide"
                                        style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)' }}
                                    >
                                        {item.price}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right arrow */}
                <button
                    onMouseDown={() => startScroll('right')}
                    onMouseUp={stopScroll}
                    onMouseLeave={stopScroll}
                    onTouchStart={() => startScroll('right')}
                    onTouchEnd={stopScroll}
                    className="shrink-0 self-center w-7 h-10 flex items-center justify-center text-white text-xs font-black active:translate-y-[2px] active:shadow-none transition-transform ml-1"
                    style={arrowBtnStyle}
                >▶</button>
            </div>
        </div>
    );
};
