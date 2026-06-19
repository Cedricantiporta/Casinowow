import React, { useState, useEffect, useRef } from 'react';
import { Deck, Card, CardRarity, GameTheme } from '../types';
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
    premiumPackCredits?: number;
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
    premiumPackCredits = 0,
    balance,
    grandPrize = 0,
    getDeckReward = (deckId: string) => 0
}) => {
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [showDrawPopup, setShowDrawPopup] = useState(false);
    const [showPackBuyPopup, setShowPackBuyPopup] = useState<string | null>(null);
    const [showExchangePanel, setShowExchangePanel] = useState(false);
    const albumScrollRef = useRef<HTMLDivElement>(null);
    
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

    const abbrev18 = (n: number): string => {
        const full = Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        if (full.length <= 18) return full;
        if (n >= 1e18) return (n / 1e18).toFixed(1).replace(/\.0$/, '') + 'QT';
        if (n >= 1e15) return (n / 1e15).toFixed(1).replace(/\.0$/, '') + 'Q';
        if (n >= 1e12) return (n / 1e12).toFixed(1).replace(/\.0$/, '') + 'T';
        if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
        return full;
    };

    const getDeckThemeBg = (theme: GameTheme): string => {
        switch (theme) {
            case 'NEON': return 'linear-gradient(180deg,#1a0040 0%,#0d0020 100%)';
            case 'EGYPT': return 'linear-gradient(180deg,#3a1a00 0%,#1a0800 100%)';
            case 'DRAGON': return 'linear-gradient(180deg,#200020 0%,#0d000d 100%)';
            case 'PIRATE': return 'linear-gradient(180deg,#001a3a 0%,#000d1a 100%)';
            case 'SPACE': return 'linear-gradient(180deg,#000a2a 0%,#000510 100%)';
            case 'CANDY': return 'linear-gradient(180deg,#3a001a 0%,#1a0010 100%)';
            case 'JUNGLE': return 'linear-gradient(180deg,#0a2000 0%,#041000 100%)';
            case 'UNDERWATER': return 'linear-gradient(180deg,#001a3a 0%,#000d20 100%)';
            case 'WESTERN': return 'linear-gradient(180deg,#2a1500 0%,#150a00 100%)';
            case 'SAMURAI': return 'linear-gradient(180deg,#1a0000 0%,#0d0000 100%)';
            case 'PIGGY': return 'linear-gradient(180deg,#2a001a 0%,#150010 100%)';
            default: return 'linear-gradient(180deg,#1a1a2a 0%,#0a0a15 100%)';
        }
    };

    const getDeckThemeEmoji = (theme: GameTheme): string => {
        switch (theme) {
            case 'NEON': return '🎰';
            case 'EGYPT': return '🦂';
            case 'DRAGON': return '🐉';
            case 'PIRATE': return '☠️';
            case 'SPACE': return '🚀';
            case 'CANDY': return '🍭';
            case 'JUNGLE': return '🌿';
            case 'UNDERWATER': return '🐠';
            case 'WESTERN': return '🤠';
            case 'SAMURAI': return '⚔️';
            case 'PIGGY': return '🐷';
            default: return '🃏';
        }
    };

    // Compute all duplicate cards across all decks
    const allDuplicates = decks.flatMap(deck =>
        deck.cards.filter(c => c.count > 1).map(c => ({ ...c, deckId: deck.gameId }))
    );

    const packOptions = [
        { id: 'basic', name: 'Basic', info: PACK_COSTS.BASIC, credits: Math.floor(packCredits / PACK_COSTS.BASIC.creditCost), color: 'from-gray-700 to-gray-900', icon: '📦' },
        { id: 'super', name: 'Super', info: PACK_COSTS.SUPER, credits: Math.floor(packCredits / PACK_COSTS.SUPER.creditCost), color: 'from-blue-700 to-blue-900', icon: '💼' },
        { id: 'mega', name: 'Mega', info: PACK_COSTS.MEGA, credits: Math.floor(packCredits / PACK_COSTS.MEGA.creditCost), color: 'from-purple-700 to-purple-900', icon: '🦄' },
        { id: 'ultra', name: 'Ultra', info: PACK_COSTS.ULTRA, credits: Math.floor(packCredits / PACK_COSTS.ULTRA.creditCost), color: 'from-yellow-600 to-yellow-800', icon: '👑' }
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
                    
                    {/* ALBUM view */}
                    {!selectedDeckId && (
                        <div className="relative h-full flex">
                            {/* Center: albums + grand reward — vertically centered */}
                            <div className="flex-1 flex flex-col justify-center gap-3 min-w-0 pr-2">
                                {/* Album scroll strip */}
                                <div ref={albumScrollRef} className="overflow-x-auto no-scrollbar shrink-0">
                                    <div className="flex gap-3" style={{ minWidth: 'max-content', paddingBottom: 2 }}>
                                        {decks.map(deck => {
                                            const collected = deck.cards.filter(c => c.count > 0).length;
                                            const isComplete = collected === 7;
                                            return (
                                                <div key={deck.gameId} className="flex-none flex flex-col items-center" style={{ width: 104 }}>
                                                    <button onClick={() => setSelectedDeckId(deck.gameId)}
                                                        className="w-full flex flex-col items-center p-2 rounded-xl active:scale-95 transition-transform"
                                                        style={{ height: 120, background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(10,0,50,0.75) 100%)', boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)' }}>
                                                        <div className="w-full flex-1 rounded-lg flex items-center justify-center overflow-hidden relative min-h-0"
                                                            style={{ background: getDeckThemeBg(deck.theme) }}>
                                                            <div className="text-[3.5rem] drop-shadow-2xl leading-none">
                                                                {getDeckThemeEmoji(deck.theme)}
                                                            </div>
                                                            {isComplete && <div className="absolute top-0.5 right-0.5 text-xs">✅</div>}
                                                        </div>
                                                        <div className="mt-1 text-center w-full">
                                                            <h3 className="text-white font-black font-display text-[11px] truncate leading-none">{deck.gameName}</h3>
                                                            <div className="text-purple-300 font-bold text-[9px] mt-0.5">{collected}/7</div>
                                                        </div>
                                                    </button>
                                                    <div className="mt-1 text-center">
                                                        <div className="text-yellow-300 font-black text-[9px]">{abbrev18(getDeckReward(deck.gameId))}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Grand reward row + Draw button */}
                                <div className="shrink-0 flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-yellow-400/60 text-[10px] font-black uppercase tracking-widest">Grand Reward</div>
                                        <div className="text-white font-black font-mono leading-tight" style={{ fontSize: '2rem' }}>{abbrev18(grandPrize)}</div>
                                    </div>
                                    <button
                                        onClick={() => setShowDrawPopup(true)}
                                        className="btn-3d rounded-2xl flex flex-col items-center justify-center gap-1 shrink-0"
                                        style={{ width: 64, height: 64, background: 'linear-gradient(180deg,#c084fc,#7c3aed)', boxShadow: '0 4px 0 #4c1d95, 0 6px 20px rgba(124,58,237,0.5)' }}>
                                        <i className="ti ti-cards" style={{ fontSize: '1.6rem', color: '#fff' }} />
                                        <span className="text-white font-black text-[9px] uppercase tracking-widest">Draw</span>
                                    </button>
                                </div>
                            </div>

                            {/* Right side: Buy Packs + Exchange Dups */}
                            <div className="shrink-0 flex flex-col gap-2 justify-center" style={{ width: 80 }}>
                                <button onClick={() => setShowPackBuyPopup('standard')} className="pill-green w-full">
                                    <div className="pill-face" style={{ padding: '8px 6px', fontSize: '9px' }}>Buy Packs</div>
                                </button>
                                <button onClick={() => setShowExchangePanel(true)} className="pill-green w-full relative">
                                    <div className="pill-face" style={{ padding: '8px 6px', fontSize: '9px' }}>Exchange</div>
                                    {allDuplicates.length > 0 && (
                                        <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-red-600 rounded-full border border-yellow-400 flex items-center justify-center px-0.5 z-10">
                                            <span className="font-black text-white leading-none" style={{ fontSize: '7px' }}>{allDuplicates.length > 99 ? '99+' : allDuplicates.length}</span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Draw Cards Popup */}
                    {showDrawPopup && (
                        <div className="absolute inset-0 z-[165] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-pop-in"
                            onClick={() => setShowDrawPopup(false)}>
                            <div className="rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                                style={{ width: 340, background: 'linear-gradient(180deg,#9030d8 0%,#6018a8 18%,#380870 100%)', boxShadow: 'inset 0 1px 0 rgba(220,170,255,0.5), 0 8px 32px rgba(0,0,0,0.9)' }}
                                onClick={e => e.stopPropagation()}>
                                {/* Header */}
                                <div className="shrink-0 flex items-center gap-2 px-4 py-3">
                                    <span className="text-white font-black text-xs tracking-widest flex-1">Draw Cards</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="currency-pill flex items-center gap-1 shrink-0" style={{ background: 'rgba(0,0,0,0.55)' }}>
                                            <span style={{ fontSize: '12px', lineHeight: 1 }}>🃏</span>
                                            <span className="num text-[10px]">{packCredits}</span>
                                        </div>
                                        <div className="currency-pill flex items-center gap-1 shrink-0" style={{ background: 'rgba(0,0,0,0.55)' }}>
                                            <span style={{ fontSize: '12px', lineHeight: 1 }}>🎴</span>
                                            <span className="num text-[10px]">{premiumPackCredits}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowDrawPopup(false)} className="round-btn shrink-0">
                                        <i className="ti ti-x" />
                                    </button>
                                </div>
                                {/* Pack draw options */}
                                <div className="flex gap-3 px-4 pb-4 justify-center">
                                    {packOptions.map(pack => {
                                        const canDrawOne = pack.credits >= 1;
                                        const canDrawTen = pack.credits >= 9;
                                        return (
                                            <div key={pack.id} className="flex flex-col rounded-2xl overflow-hidden flex-1"
                                                style={{
                                                    background: 'linear-gradient(180deg,rgba(160,60,255,0.3) 0%,rgba(10,0,50,0.75) 100%)',
                                                    boxShadow: 'inset 0 1px 0 rgba(200,120,255,0.4), 0 3px 10px rgba(0,0,0,0.5)',
                                                    padding: '14px 12px 12px',
                                                }}>
                                                <div className="flex-1 flex flex-col items-center justify-center gap-1 pb-2">
                                                    <div className="font-black text-white text-sm tracking-widest text-center leading-none">{pack.name}</div>
                                                    <div className="font-bold text-white/50 text-[11px]">{pack.credits} packs</div>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <button onClick={() => handleDraw(pack.id, 1)} disabled={!canDrawOne}
                                                        className={`pill-green w-full${!canDrawOne ? ' opacity-40' : ''}`}>
                                                        <div className="pill-face" style={{ padding: '6px 8px', fontSize: '10px' }}>Draw 1×</div>
                                                    </button>
                                                    <button onClick={() => handleDraw(pack.id, 10)} disabled={!canDrawTen}
                                                        className={`pill-green w-full relative${!canDrawTen ? ' opacity-40' : ''}`}>
                                                        <div className="pill-face" style={{ padding: '6px 8px', fontSize: '10px' }}>Draw 10×</div>
                                                        {canDrawTen && <div className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white z-10">-10%</div>}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
