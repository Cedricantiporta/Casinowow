import React, { useState, useEffect } from 'react';
import { Deck, Card, CardRarity } from '../types';
import { formatNumber, PACK_COSTS, formatCommaNumber } from '../constants';
import { audioService } from '../services/audioService';

interface CardCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenShop: (tab?: 'COINS' | 'BOOSTS' | 'DIAMONDS') => void;
    decks: Deck[];
    onClaimDeckReward: (deckId: string, reward: number) => void;
    onBuyPack: (packId: string, drawCount: number) => Card[];
    onBuyCredits: (cost: number, credits: number) => void;
    onBuyCreditsWithTokens?: (amount: number, cost: number) => void;
    diamonds: number;
    playerLevel: number;
    tokens: number; 
    packCredits: number;
    balance: number;
    grandPrize?: number;
    getDeckReward?: (deckId: string) => number;
}

export const CardCollectionModal: React.FC<CardCollectionModalProps> = ({
    isOpen,
    onClose,
    onOpenShop,
    decks,
    onClaimDeckReward,
    onBuyPack,
    onBuyCredits,
    onBuyCreditsWithTokens,
    diamonds,
    playerLevel,
    tokens,
    packCredits,
    balance,
    grandPrize = 0,
    getDeckReward = (deckId: string) => 0
}) => {
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'ALBUM' | 'PACKS'>('ALBUM');
    
    // Pack Opening State
    const [isOpeningPack, setIsOpeningPack] = useState(false);
    const [lastPackId, setLastPackId] = useState<string | null>(null);
    const [openedCards, setOpenedCards] = useState<Card[]>([]);
    const [packStage, setPackStage] = useState<'SHAKING' | 'BURST' | 'REVEAL' | 'DONE'>('DONE');
    const [skipAnimation, setSkipAnimation] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSelectedDeckId(null);
            setIsOpeningPack(false);
            setPackStage('DONE');
        }
    }, [isOpen]);

    const closePack = () => {
        setIsOpeningPack(false);
        setPackStage('DONE');
        setOpenedCards([]);
        setLastPackId(null);
    };

    // Styles for Locked/Unlocked Cards
    const getCardStyle = (rarity: CardRarity, isLocked: boolean) => {
        if (isLocked) {
            switch(rarity) {
                case 'LEGENDARY': return 'bg-[#3a2d10]/80 text-yellow-850 shadow-none grayscale-[0.5]';
                case 'EPIC': return 'bg-[#2d103a]/80 text-purple-850 shadow-none grayscale-[0.5]';
                case 'RARE': return 'bg-[#101d3a]/80 text-blue-850 shadow-none grayscale-[0.5]';
                default: return 'bg-[#1a1a1a]/80 text-gray-800 shadow-none grayscale-[0.8]';
            }
        }
        switch(rarity) {
            case 'LEGENDARY': return 'bg-yellow-950/90 text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-pulse';
            case 'EPIC': return 'bg-purple-950/90 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]';
            case 'RARE': return 'bg-blue-950/90 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.4)]';
            default: return 'bg-gray-900/90 text-gray-400 shadow-none';
        }
    };

    const rarityOrder: Record<CardRarity, number> = {
        'COMMON': 0, 'RARE': 1, 'EPIC': 2, 'LEGENDARY': 3
    };

    const handleDraw = (packId: string, count: number) => {
        const cards = onBuyPack(packId, count);
        if (cards.length > 0) {
            cards.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
            
            setLastPackId(packId);
            setOpenedCards(cards);
            setIsOpeningPack(true);
            
            if (skipAnimation) {
                setPackStage('REVEAL');
                audioService.playWinBig();
            } else {
                setPackStage('SHAKING');
                audioService.playClick();

                setTimeout(() => {
                    setPackStage('BURST');
                    audioService.playWinSmall();
                    setTimeout(() => {
                        setPackStage('REVEAL');
                        audioService.playWinBig();
                    }, 600);
                }, 1000);
            }
        } else {
             setIsOpeningPack(false);
        }
    };

    const packOptions = [
        { id: 'basic', name: 'Basic', info: PACK_COSTS.BASIC, color: 'from-gray-700 to-gray-900', icon: '📦' },
        { id: 'super', name: 'Super', info: PACK_COSTS.SUPER, color: 'from-blue-700 to-blue-900', icon: '💼' },
        { id: 'mega', name: 'Mega', info: PACK_COSTS.MEGA, color: 'from-purple-700 to-purple-900', icon: '🦄' },
        { id: 'ultra', name: 'Ultra', info: PACK_COSTS.ULTRA, color: 'from-yellow-600 to-yellow-800', icon: '👑' }
    ];

    const tokenExchanges = [
        { credits: 1, cost: 50 },
        { credits: 10, cost: 500 },
        { credits: 100, cost: 5000 }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-sm p-0 animate-pop-in">
            {/* Pack Opening Overlay */}
            {isOpeningPack && (
                <div className="absolute inset-0 z-[160] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl p-3">
                    {packStage === 'SHAKING' && (
                        <div className="text-6xl animate-bounce drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] pointer-events-none">📦</div>
                    )}
                    {packStage === 'BURST' && (
                        <div className="text-6xl scale-125 transition-transform duration-300 opacity-0 pointer-events-none">💥</div>
                    )}
                    {packStage === 'REVEAL' && (
                        <div className="w-full h-full flex flex-col items-center justify-center animate-pop-in relative py-4">
                             <div className="flex-1 w-full max-w-lg px-2 overflow-y-auto grid grid-cols-3 gap-2 content-center justify-items-center">
                                 {openedCards.map((card, i) => (
                                     <div 
                                        key={i} 
                                        className={`
                                            relative aspect-[2/3] w-full max-w-[100px] rounded-lg ${getCardStyle(card.rarity, false)} 
                                            p-1.5 flex flex-col items-center justify-center animate-pop-in mt-3
                                            ${card.rarity === 'LEGENDARY' ? 'animate-pulse duration-700' : ''}
                                        `} 
                                        style={{ animationDelay: `${i * 30}ms` }}
                                     >
                                         <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider whitespace-nowrap shadow ${card.rarity === 'LEGENDARY' ? 'bg-yellow-500 text-black' : card.rarity === 'EPIC' ? 'bg-purple-600 text-white' : card.rarity === 'RARE' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'}`}>
                                             {card.rarity}
                                         </div>

                                         {card.isNew && <div className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[7px] font-black px-1 rounded animate-pulse z-20">NEW</div>}
                                         <div className="text-2xl mb-1 drop-shadow-md">{card.icon}</div>
                                         <div className="text-[8px] font-bold text-center bg-black/50 px-1 rounded truncate w-full">{card.name}</div>
                                         {card.isDuplicate && (
                                             <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center z-35">
                                                 <div className="text-yellow-400 text-[7px] font-bold uppercase bg-black/80 px-1 rounded">Dup</div>
                                             </div>
                                         )}
                                     </div>
                                 ))}
                             </div>
                             <div className="shrink-0 mt-4 flex flex-col sm:flex-row gap-2 z-50 items-center bg-black/70 p-2.5 rounded-xl">
                                 <button onClick={closePack} className="px-5 py-1.5 bg-gray-700 rounded-lg text-white font-bold text-xs uppercase hover:bg-gray-600">Close</button>
                                 
                                 {lastPackId && (
                                     <div className="flex gap-1.5 items-center">
                                        <button 
                                            onClick={() => {
                                                setPackStage('DONE');
                                                setOpenedCards([]);
                                                setTimeout(() => handleDraw(lastPackId!, 1), 100);
                                            }} 
                                            className="px-4 py-1.5 bg-green-600 rounded-lg text-white font-bold text-xs uppercase"
                                        >
                                            1x
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setPackStage('DONE');
                                                setOpenedCards([]);
                                                setTimeout(() => handleDraw(lastPackId!, 10), 100);
                                            }} 
                                            className="px-4 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg text-white font-bold text-xs uppercase relative overflow-hidden"
                                        >
                                            10x
                                            <span className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white">-10%</span>
                                        </button>

                                        <label className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md cursor-pointer ml-1">
                                            <input 
                                                type="checkbox" 
                                                checked={skipAnimation} 
                                                onChange={(e) => setSkipAnimation(e.target.checked)}
                                                className="w-3 h-3 text-yellow-500 rounded bg-gray-800 border-gray-600" 
                                            />
                                            <span className="text-[8px] font-bold text-gray-300 uppercase leading-none">Skip</span>
                                        </label>
                                     </div>
                                 )}
                             </div>
                        </div>
                    )}
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-b from-[#2e1065] to-[#0f0518] flex flex-col shadow-2xl overflow-auto relative">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#4c1d95] to-[#3b0764] p-2.5 flex justify-between items-center shrink-0 z-10 shadow-lg relative">
                    <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-1.5">
                            {selectedDeckId && (
                                <button onClick={() => setSelectedDeckId(null)} className="text-white/85 hover:text-white text-lg font-bold px-1">⬅</button>
                            )}
                            <h2 className="text-xs md:text-sm font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-fuchsia-200 uppercase tracking-wider truncate max-w-[120px]">
                                {selectedDeckId ? decks.find(d => d.gameId === selectedDeckId)?.gameName : 'Album'}
                            </h2>
                        </div>
                        
                        {!selectedDeckId && (
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center bg-black/30 p-0.5 rounded-lg">
                                <button onClick={() => setActiveTab('ALBUM')} className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'ALBUM' ? 'bg-yellow-500 text-black shadow-md' : 'text-gray-400'}`}>Decks</button>
                                <button onClick={() => setActiveTab('PACKS')} className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'PACKS' ? 'bg-yellow-500 text-black shadow-md' : 'text-gray-400'}`}>Draw</button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mr-6 text-[10px]">
                        <div className="currency-pill flex items-center gap-2 px-3 py-1">
                            <div className="coin">$</div>
                            <span className="font-mono font-bold text-white">{formatNumber(balance)}</span>
                        </div>
                        <div className="currency-pill flex items-center gap-2 px-3 py-1">
                            <div className="gem"></div>
                            <span className="font-mono font-bold text-white">{formatNumber(diamonds)}</span>
                        </div>
                        <button onClick={() => { onClose(); onOpenShop('BOOSTS'); }} className="bg-black/40 px-2 py-0.5 rounded-full flex items-center gap-0.5 relative group">
                             <span>📦</span>
                             <span className="font-mono font-bold text-orange-400">{packCredits}</span>
                        </button>
                        <div className="currency-pill flex items-center gap-2 px-3 py-1">
                            <div className="text-green-400">💳</div>
                            <span className="font-mono font-bold text-white">{formatNumber(tokens)}</span>
                        </div>
                    </div>

                    <button onClick={onClose} className="absolute top-1/2 -translate-y-1/2 right-2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition text-xs z-50">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 bg-transparent">
                    
                    {/* Deck View */}
                    {!selectedDeckId && activeTab === 'ALBUM' && (
                        <div className="flex flex-col gap-4 max-w-lg mx-auto pb-12">
                             {/* Grand Prize Banner */}
                             <div className="w-full bg-gradient-to-r from-yellow-600 via-gold-500 to-yellow-600 rounded-lg p-0.5 shadow-md">
                                 <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between gap-2">
                                     <div className="flex items-center gap-2">
                                         <div className="text-3xl">👑</div>
                                         <div className="flex flex-col">
                                             <div className="text-gold-200 text-[8px] font-bold uppercase tracking-wider">Grand Reward</div>
                                             <div className="text-lg font-black text-white font-mono leading-none">{formatCommaNumber(grandPrize)}</div>
                                         </div>
                                     </div>
                                 </div>
                             </div>

                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                 {decks.map(deck => {
                                     const collected = deck.cards.filter(c => c.count > 0).length;
                                     const total = deck.cards.length;
                                     const isComplete = collected === total;
                                     return (
                                         <button key={deck.gameId} onClick={() => setSelectedDeckId(deck.gameId)} className="flex flex-col items-center group bg-black/40 p-2 rounded-xl">
                                             <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden flex flex-col items-center justify-center">
                                                 <div className={`relative z-10 w-full h-full bg-gradient-to-b ${deck.theme === 'NEON' ? 'from-purple-900 to-black' : deck.theme === 'EGYPT' ? 'from-orange-900 to-black' : 'from-gray-800 to-black'} rounded-lg flex items-center justify-center overflow-hidden`}>
                                                     <div className="text-4xl opacity-80 group-hover:scale-105 transition-transform duration-300 drop-shadow-md">
                                                        {deck.theme === 'NEON' ? '🎰' : deck.theme === 'EGYPT' ? '🦂' : deck.theme === 'DRAGON' ? '🐉' : '🃏'}
                                                     </div>
                                                     {isComplete && <div className="absolute top-1.5 right-1.5 text-sm">✅</div>}
                                                 </div>
                                                 
                                                 <div className="absolute bottom-1 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                                     <div className="text-gold-400 font-mono font-black text-[9px] leading-none">+{formatNumber(getDeckReward(deck.gameId))}</div>
                                                 </div>
                                             </div>
                                             <div className="mt-1.5 text-center w-full min-w-0">
                                                 <h3 className="text-white font-black font-display text-xs truncate leading-none">{deck.gameName}</h3>
                                                 <div className="text-purple-300 font-bold text-[10px] uppercase mt-0.5">{collected} / {total}</div>
                                             </div>
                                         </button>
                                     );
                                 })}
                             </div>
                        </div>
                    )}

                    {/* Pack Shop View */}
                    {!selectedDeckId && activeTab === 'PACKS' && (
                        <div className="flex flex-col items-center pt-2 max-w-lg mx-auto pb-8">
                             
                             {/* Exchange Section */}
                             <div className="w-full mb-4">
                                 <div className="bg-gray-900/60 rounded-xl p-3 shadow-md">
                                     <h3 className="text-green-400 text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                                         <span>💳</span> Duplicate Exchange
                                     </h3>
                                     <div className="grid grid-cols-3 gap-2">
                                         {tokenExchanges.map((ex, idx) => (
                                             <button 
                                                 key={idx}
                                                 onClick={() => onBuyCreditsWithTokens && onBuyCreditsWithTokens(ex.credits, ex.cost)}
                                                 disabled={tokens < ex.cost}
                                                 className={`
                                                     flex flex-col items-center justify-center p-2 rounded-lg border transition-all
                                                     ${tokens >= ex.cost 
                                                         ? 'bg-gradient-to-b from-[#166534]/50 to-[#14532d]/50 border-green-700/55 hover:brightness-110' 
                                                         : 'bg-gray-800/40 border-gray-700/30 opacity-40 cursor-not-allowed'}
                                                 `}
                                             >
                                                 <span className="text-white text-[10px] font-bold">+{ex.credits} Credit</span>
                                                 <div className="flex items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded-full mt-1">
                                                     <span className="text-green-400 font-mono text-[9px] font-bold">{ex.cost}</span>
                                                     <span className="text-[9px]">💳</span>
                                                 </div>
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             </div>

                             <div className="grid grid-cols-2 gap-3 w-full">
                                 {packOptions.map(pack => {
                                     const singleCost = pack.info.creditCost;
                                     const bulkCost = Math.ceil((singleCost * 10) * 0.9);
                                     
                                     const canDrawOne = packCredits >= singleCost;
                                     const canDrawTen = packCredits >= bulkCost;

                                     return (
                                     <div key={pack.id} className={`relative aspect-[3/4] rounded-xl overflow-hidden shadow-md flex flex-col bg-gradient-to-b ${pack.color} group`}>
                                         <div className="flex-1 flex flex-col items-center justify-center bg-black/20 py-4">
                                             <div className="text-4xl drop-shadow-md z-10">{pack.icon}</div>
                                         </div>
                                         <div className="p-2 flex flex-col items-center text-center bg-black/40 backdrop-blur-md w-full">
                                             <h3 className="text-xs font-black font-display text-white uppercase drop-shadow leading-none mb-1.5">{pack.name} Pack</h3>
                                             
                                             <div className="flex flex-col gap-1 w-full">
                                                 <button 
                                                     onClick={() => handleDraw(pack.id, 1)}
                                                     disabled={!canDrawOne}
                                                     className={`w-full py-1 rounded-md font-bold text-white uppercase text-[8px] ${canDrawOne ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700'}`}
                                                 >
                                                     1x ({singleCost} 📦)
                                                 </button>
                                                 <button 
                                                     onClick={() => handleDraw(pack.id, 10)}
                                                     disabled={!canDrawTen}
                                                     className={`w-full py-1 rounded-md font-bold text-white uppercase text-[8px] relative overflow-hidden ${canDrawTen ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:brightness-110' : 'bg-gray-700'}`}
                                                 >
                                                     10x ({bulkCost} 📦)
                                                     {canDrawTen && <div className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white">10% Off</div>}
                                                 </button>
                                             </div>
                                         </div>
                                     </div>
                                     );
                                 })}
                             </div>
                        </div>
                    )}

                    {/* Single Deck Card View */}
                    {selectedDeckId && (
                        <div className="pb-12 max-w-lg mx-auto">
                            <div className="flex justify-center mb-4">
                                <div className="bg-gradient-to-r from-gold-500/10 to-yellow-600/10 rounded-lg p-2.5 flex items-center gap-2">
                                     <span className="text-2xl">🏆</span>
                                     <div className="flex flex-col">
                                         <div className="text-gold-200 text-[8px] font-bold uppercase leading-none">Completion Reward</div>
                                         <div className="text-sm font-black text-white font-mono mt-0.5">{formatCommaNumber(getDeckReward(selectedDeckId))}</div>
                                     </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {decks.find(d => d.gameId === selectedDeckId)?.cards.map((card, i) => (
                                    <div key={i} className={`aspect-[2/3] rounded-lg ${getCardStyle(card.rarity, card.count === 0)} p-1 flex flex-col items-center justify-between relative`}>
                                        <div className="w-full flex justify-between items-start leading-none p-0.5">
                                            <span className={`text-[7px] font-black uppercase px-1 py-0.2 rounded ${card.rarity === 'LEGENDARY' ? 'bg-yellow-500 text-black' : card.rarity === 'EPIC' ? 'bg-purple-600 text-white' : card.rarity === 'RARE' ? 'bg-blue-600 text-white' : 'bg-gray-650 text-white'}`}>{card.rarity[0]}</span>
                                            {card.count > 0 && <span className="text-[7px] font-bold bg-black/60 text-white px-1 rounded">x{card.count}</span>}
                                        </div>
                                        <div className="text-2xl drop-shadow-md">{card.count > 0 ? card.icon : '🔒'}</div>
                                        <div className="text-[7px] font-bold text-center bg-black/40 px-0.5 rounded w-full truncate">{card.name}</div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-4 flex justify-center">
                                {decks.find(d => d.gameId === selectedDeckId)?.isCompleted ? (
                                    decks.find(d => d.gameId === selectedDeckId)?.rewardClaimed ? (
                                        <div className="bg-gray-700 px-6 py-1.5 rounded-lg text-[10px] font-bold text-gray-400 uppercase">Reward Claimed</div>
                                    ) : (
                                        <button onClick={() => onClaimDeckReward(selectedDeckId!, getDeckReward(selectedDeckId))} className="bg-gradient-to-r from-gold-500 to-yellow-600 px-8 py-2 rounded-lg font-black text-black text-[10px] uppercase shadow-md animate-pulse">Claim Reward</button>
                                    )
                                ) : (
                                    <div className="bg-black/40 px-4 py-1.5 rounded-lg text-gray-400 text-[8px] font-bold uppercase">Locked</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
