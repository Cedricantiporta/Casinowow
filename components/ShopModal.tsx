import React, { useState, useEffect } from 'react';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBuy: (type: 'COIN' | 'BOOST' | 'DIAMOND' | 'PASS_XP' | 'PACK_CREDIT', amount: number, duration?: number, cost?: number) => void;
    level: number;
    isFreeStashClaimed?: boolean;
    initialTab?: 'COINS' | 'BOOSTS' | 'DIAMONDS';
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, onBuy, level, isFreeStashClaimed, initialTab = 'COINS' }) => {
    const [activeTab, setActiveTab] = useState<'COINS' | 'BOOSTS' | 'DIAMONDS'>(initialTab);
    const [dynamicPacks, setDynamicPacks] = useState<any[]>([]);

    // Helper to format numbers fully with commas
    const formatFullNumber = (num: number) => {
        return num.toLocaleString('en-US');
    };

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            const BASE_PER_LEVEL = 1000000; 
            
            setDynamicPacks([
                { 
                    amount: level * BASE_PER_LEVEL * 1, 
                    price: "₱ 49", 
                    color: "bg-gradient-to-b from-cyan-600 to-cyan-800",
                    label: "Pile",
                },
                { 
                    amount: level * BASE_PER_LEVEL * 2.5, 
                    price: "₱ 99", 
                    color: "bg-gradient-to-b from-green-600 to-green-800",
                    label: "Double",
                },
                { 
                    amount: level * BASE_PER_LEVEL * 5, 
                    price: "₱ 199", 
                    color: "bg-gradient-to-b from-emerald-600 to-emerald-800",
                    label: "Big Bag",
                },
                { 
                    amount: level * BASE_PER_LEVEL * 10, 
                    price: "₱ 499", 
                    color: "bg-gradient-to-b from-purple-600 to-purple-800",
                    label: "Roller",
                },
                { 
                    amount: level * BASE_PER_LEVEL * 50, 
                    price: "₱ 2,490", 
                    color: "bg-gradient-to-b from-yellow-600 to-yellow-800",
                    label: "Jackpot",
                },
            ]);
        }
    }, [isOpen, level, isFreeStashClaimed, initialTab]);

    if (!isOpen) return null;

    const itemsPacks = [
        { label: "10 Pack Credits", type: 'PACK_CREDIT', val: 10, duration: 0, cost: 45, priceLabel: "45 💎", color: "bg-gradient-to-b from-orange-700 to-red-900", icon: '📦' },
        { label: "100 Pack Credits", type: 'PACK_CREDIT', val: 100, duration: 0, cost: 400, priceLabel: "400 💎", color: "bg-gradient-to-b from-orange-800 to-red-950", icon: '📦' },
        { label: "2x Player XP (30m)", type: 'BOOST', val: 2, duration: 1800000, cost: 200, priceLabel: "200 💎", color: "bg-gradient-to-b from-fuchsia-700 to-fuchsia-900", icon: '🚀' },
        { label: "2x Player XP (12H)", type: 'BOOST', val: 2, duration: 43200000, cost: 500, priceLabel: "500 💎", color: "bg-gradient-to-b from-fuchsia-800 to-purple-950", icon: '🚀' },
        { label: "2x Mission XP (30m)", type: 'PASS_XP', val: 2, duration: 1800000, cost: 300, priceLabel: "300 💎", color: "bg-gradient-to-b from-indigo-600 to-indigo-900", icon: '📜' },
    ];

    const diamondPacks = [
        { amount: 50, price: "₱ 49", color: "bg-gradient-to-b from-cyan-500 to-cyan-700" },
        { amount: 150, price: "₱ 99", color: "bg-gradient-to-b from-cyan-600 to-blue-800" },
        { amount: 500, price: "₱ 249", color: "bg-gradient-to-b from-blue-600 to-indigo-800" },
        { amount: 1500, price: "₱ 499", color: "bg-gradient-to-b from-indigo-600 to-purple-800" },
        { amount: 5000, price: "₱ 1,250", color: "bg-gradient-to-b from-purple-600 to-fuchsia-800" },
    ];

    const handleBuy = (type: any, val: number, duration?: number, cost?: number) => {
        onBuy(type, val, duration, cost);
    };

    const TabButton = ({ tab, label, icon }: { tab: 'COINS' | 'BOOSTS' | 'DIAMONDS', label: string, icon?: string }) => (
        <button 
            onClick={() => setActiveTab(tab)} 
            className={`
                px-3 py-1 rounded-lg font-bold uppercase tracking-wider transition-all text-[10px] flex items-center gap-1
                ${activeTab === tab 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-105' 
                    : 'bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600'}
            `}
        >
            {icon && <span className="text-xs">{icon}</span>}
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[150] flex flex-col bg-gray-950 animate-pop-in">
            
            {/* Header with Centered Tabs */}
            <div className="bg-gray-900 border-b border-gray-800 p-2 flex items-center justify-between shrink-0 z-10 shadow-sm gap-2 relative">
                
                <div className="hidden sm:block text-xs font-display font-medium text-white whitespace-nowrap w-16">Store</div>
                
                {/* Centered Tabs */}
                <div className="flex items-center gap-1 mx-auto">
                    <TabButton tab="COINS" label="Coins" icon="🪙" />
                    <TabButton tab="DIAMONDS" label="Gems" icon="💎" />
                    <TabButton tab="BOOSTS" label="Items" icon="🎒" />
                </div>
                
                {/* Right Side Actions */}
                <div className="flex items-center gap-2 shrink-0 ml-auto select-none">
                     <div className="flex items-center bg-transparent px-1.5 py-0.5 select-none">
                         <span className="text-xs mr-1">🪙</span>
                         <div className="flex items-center gap-1 mr-2 leading-none">
                             <span className="text-[7.5px] text-gray-400 uppercase font-black">Free</span>
                             <span className="text-white text-[9.5px] font-black">300k</span>
                         </div>
                         <button 
                            onClick={() => !isFreeStashClaimed && handleBuy('COIN', 300000, 0, 0)}
                            disabled={isFreeStashClaimed}
                            className={`px-1.5 py-0.5 rounded font-black uppercase text-[7.5px] transition-all ${isFreeStashClaimed ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                         >
                             {isFreeStashClaimed ? 'Claimed' : 'Claim'}
                         </button>
                     </div>

                     <button onClick={onClose} className="w-5.5 h-5.5 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center text-white text-[10px] transition font-sans">✕</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 bg-gray-950">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                    {activeTab === 'COINS' ? dynamicPacks.map((pack, i) => (
                        <button 
                            key={i}
                            onClick={() => handleBuy('COIN', pack.amount, 0, pack.cost)}
                            disabled={pack.disabled}
                            className={`aspect-[3/4] relative group overflow-hidden rounded-md p-1 flex flex-col items-center justify-between ${pack.disabled ? 'bg-gray-800 grayscale opacity-40 cursor-not-allowed' : pack.color} hover:brightness-110 transition-all shadow-md hover:scale-[1.01] active:scale-[0.99]`}
                        >
                            <div className="w-full flex justify-center">
                                <div className="text-[6px] font-black uppercase bg-black/40 px-1 py-0.5 rounded text-white whitespace-nowrap shadow-sm tracking-wide">{pack.label}</div>
                            </div>
                            
                            <div className="text-lg md:text-xl drop-shadow-md transform group-hover:scale-105 transition-transform duration-300 leading-none py-0.5">🪙</div>
                            
                            <div className="w-full text-center flex flex-col gap-0.5">
                                <div className="text-[8.5px] md:text-[10px] font-black text-white drop-shadow-sm font-display leading-none break-all">
                                    {formatFullNumber(pack.amount)}
                                </div>
                                <div className={`w-full py-0.5 rounded text-[7px] md:text-[8px] font-black text-white uppercase whitespace-nowrap transition-colors shadow-sm ${pack.disabled ? 'bg-gray-750' : 'bg-green-600 group-hover:bg-green-500'}`}>
                                     {pack.disabled ? 'CLAIMED' : pack.price}
                                </div>
                            </div>
                        </button>
                    )) : activeTab === 'DIAMONDS' ? diamondPacks.map((pack, i) => (
                        <button 
                            key={i}
                            onClick={() => handleBuy('DIAMOND', pack.amount)}
                            className={`aspect-[3/4] relative group overflow-hidden rounded-md p-1 flex flex-col items-center justify-between ${pack.color} hover:brightness-110 transition-all shadow-md hover:scale-[1.01] active:scale-[0.99]`}
                        >
                            <div className="w-full flex justify-center opacity-0 select-none">
                                 <span className="text-[5px]">.</span>
                            </div>
                            <div className="text-lg md:text-xl drop-shadow-md transform group-hover:scale-105 transition-transform duration-300 animate-pulse leading-none py-0.5">💎</div>
                            
                            <div className="w-full text-center flex flex-col gap-0.5">
                                <div className="text-[8.5px] md:text-[10px] font-black text-white drop-shadow-sm font-display leading-none">
                                    {formatFullNumber(pack.amount)}
                                </div>
                                <div className="w-full py-0.5 bg-cyan-600 rounded text-[7px] md:text-[8px] font-black text-white uppercase whitespace-nowrap transition-colors shadow-sm hover:bg-cyan-500">
                                    {pack.price}
                                </div>
                            </div>
                        </button>
                    )) : itemsPacks.map((pack, i) => (
                        <button 
                            key={i}
                            onClick={() => handleBuy(pack.type as any, pack.val, pack.duration, pack.cost)}
                            className={`aspect-[3/4] relative group overflow-hidden rounded-md p-1 flex flex-col items-center justify-between ${pack.color} hover:brightness-110 transition-all shadow-md hover:scale-[1.01] active:scale-[0.99]`}
                        >
                            <div className="w-full flex justify-center">
                                 <div className="text-[6px] font-black uppercase bg-black/40 px-1 py-0.5 rounded text-white whitespace-nowrap tracking-wider">ITEM</div>
                            </div>

                            <div className="text-lg md:text-xl drop-shadow-md transform group-hover:scale-105 transition-transform duration-300 leading-none py-0.5">{pack.icon}</div>
                            
                            <div className="w-full text-center flex flex-col gap-0.5">
                                <div className="text-[7.5px] md:text-[8.5px] font-black text-white leading-none break-words w-full px-0.5">
                                    {pack.label}
                                </div>
                                <div className="w-full py-0.5 bg-indigo-600 rounded text-[7px] md:text-[8px] font-black text-white uppercase whitespace-nowrap transition-colors shadow-sm hover:bg-indigo-500">
                                    {pack.priceLabel}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
