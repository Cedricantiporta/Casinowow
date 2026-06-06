import React, { useState, useEffect } from 'react';
import { Deck, Card, CardRarity } from '../types';
import { formatNumber, PACK_COSTS, formatCommaNumber, formatK } from '../constants';
import { audioService } from '../services/audioService';

interface CardCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenShop: (tab?: 'COINS' | 'BOOSTS' | 'DIAMONDS') => void;
    initialTab?: 'ALBUM' | 'PACKS';
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
    initialTab,
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
    getDeckReward = (_deckId: string) => 0
}) => {
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'ALBUM' | 'PACKS'>(initialTab || 'ALBUM');
    const [showPackBuyPopup, setShowPackBuyPopup] = useState(false);
    const albumScrollRef = React.useRef<HTMLDivElement>(null);
    const deckCardsScrollRef = React.useRef<HTMLDivElement>(null);

    const scrollAlbum = (dir: 'LEFT' | 'RIGHT') => {
        albumScrollRef.current?.scrollBy({ left: dir === 'LEFT' ? -160 : 160, behavior: 'smooth' });
    };

    React.useEffect(() => {
        if (!isOpen) return;
        const addWheel = (el: HTMLDivElement | null) => {
            if (!el) return () => {};
            const handler = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY; };
            el.addEventListener('wheel', handler, { passive: false });
            return () => el.removeEventListener('wheel', handler);
        };
        const r1 = addWheel(albumScrollRef.current);
        const r2 = addWheel(deckCardsScrollRef.current);
        return () => { r1(); r2(); };
    }, [isOpen, selectedDeckId, activeTab]);

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

    useEffect(() => {
        if (isOpen && initialTab) setActiveTab(initialTab);
    }, [isOpen, initialTab]);

    const closePack = () => {
        setIsOpeningPack(false);
        setPackStage('DONE');
        setOpenedCards([]);
        setLastPackId(null);
    };

    const getCardBg = (rarity: CardRarity, isLocked: boolean): string => {
        if (isLocked) {
            switch(rarity) {
                case 'LEGENDARY': return 'linear-gradient(160deg,#78350f,#451a03)';
                case 'EPIC': return 'linear-gradient(160deg,#3b0764,#1e0438)';
                case 'RARE': return 'linear-gradient(160deg,#1e3a5f,#0c1a30)';
                default: return 'linear-gradient(160deg,#1e1e2e,#0d0d1a)';
            }
        }
        switch(rarity) {
            case 'LEGENDARY': return 'linear-gradient(160deg,#d97706,#f59e0b,#b45309)';
            case 'EPIC': return 'linear-gradient(160deg,#7c3aed,#a855f7,#6d28d9)';
            case 'RARE': return 'linear-gradient(160deg,#2563eb,#3b82f6,#1d4ed8)';
            default: return 'linear-gradient(160deg,#475569,#64748b,#334155)';
        }
    };

    const getCardBorder = (rarity: CardRarity): string => {
        switch(rarity) {
            case 'LEGENDARY': return '#fde68a';
            case 'EPIC': return '#c084fc';
            case 'RARE': return '#93c5fd';
            default: return '#94a3b8';
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
        { id: 'super', name: 'Standard', info: PACK_COSTS.SUPER, color: 'from-blue-700 to-blue-900', icon: '💼' },
        { id: 'ultra', name: 'Premium', info: PACK_COSTS.ULTRA, color: 'from-yellow-600 to-yellow-800', icon: '👑' },
    ];

    const tokenExchanges = [
        { credits: 1, cost: 50 },
        { credits: 10, cost: 500 },
        { credits: 100, cost: 5000 }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex flex-col animate-pop-in" style={{ background: 'linear-gradient(160deg,#2e1065 0%,#0f0518 100%)' }}>
            {/* Pack Opening Overlay */}
            {isOpeningPack && (
                <div className="absolute inset-0 z-[160] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-3">
                    {packStage === 'SHAKING' && (
                        <div className="text-6xl animate-bounce drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] pointer-events-none">📦</div>
                    )}
                    {packStage === 'BURST' && (
                        <div className="text-6xl scale-125 transition-transform duration-300 opacity-0 pointer-events-none">💥</div>
                    )}
                    {packStage === 'REVEAL' && (
                        <div className="w-full h-full flex flex-col items-center justify-center animate-pop-in relative py-4">
                            <div className={`flex-1 w-full max-w-2xl px-2 overflow-y-auto grid gap-2 content-center justify-items-center ${openedCards.filter(c => { const st = String(c.symbolType); return !['TEN','JACK','QUEEN','KING','ACE'].includes(st) && !st.startsWith('JACKPOT') && c.icon !== '🪙'; }).length >= 10 ? 'grid-cols-5' : 'grid-cols-3'}`}>
                                {openedCards.filter(card => { const st = String(card.symbolType); return !['TEN','JACK','QUEEN','KING','ACE'].includes(st) && !st.startsWith('JACKPOT') && card.icon !== '🪙'; }).map((card, i) => {
                                    const borderColor = getCardBorder(card.rarity);
                                    return (
                                    <div
                                        key={i}
                                        className={`relative w-full ${openedCards.length >= 10 ? 'max-w-[80px]' : 'max-w-[100px]'} rounded-xl flex flex-col items-center justify-between overflow-hidden animate-pop-in ${card.rarity === 'LEGENDARY' ? 'animate-pulse duration-700' : ''}`}
                                        style={{ animationDelay: `${i * 30}ms`, background: getCardBg(card.rarity, false), border: `2px solid ${borderColor}`, aspectRatio: '2/3', boxShadow: `0 4px 20px ${borderColor}55` }}
                                    >
                                        {/* Rarity inside top */}
                                        <div className="w-full px-1 pt-1.5 flex justify-center">
                                            <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${card.rarity === 'LEGENDARY' ? 'bg-black/40 text-yellow-200' : card.rarity === 'EPIC' ? 'bg-black/40 text-purple-200' : card.rarity === 'RARE' ? 'bg-black/40 text-blue-200' : 'bg-black/40 text-white'}`}>
                                                {card.rarity}
                                            </span>
                                        </div>
                                        {card.isNew && <div className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[7px] font-black px-1 rounded z-20">NEW</div>}
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="text-3xl drop-shadow-md">{card.icon}</div>
                                        </div>
                                        <div className="w-full px-1 pb-1.5 text-center">
                                            <div className="text-[8px] font-bold text-white/90 bg-black/30 rounded px-1 truncate">{card.name}</div>
                                            {card.isDuplicate && <div className="text-yellow-300 text-[7px] font-bold uppercase mt-0.5">Dup</div>}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                            <div className="shrink-0 mt-4 flex flex-col sm:flex-row gap-2 z-50 items-center bg-black/70 p-2.5 rounded-xl">
                                <button onClick={closePack} className="px-5 py-1.5 bg-gray-700 rounded-lg text-white font-bold text-xs uppercase hover:bg-gray-600">Close</button>
                                {lastPackId && (
                                    <div className="flex gap-1.5 items-center">
                                        <button onClick={() => { setPackStage('DONE'); setOpenedCards([]); setTimeout(() => handleDraw(lastPackId!, 1), 100); }}
                                            className="px-4 py-1.5 bg-green-600 rounded-lg text-white font-bold text-xs uppercase">1x</button>
                                        <button onClick={() => { setPackStage('DONE'); setOpenedCards([]); setTimeout(() => handleDraw(lastPackId!, 10), 100); }}
                                            className="px-4 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg text-white font-bold text-xs uppercase relative overflow-hidden">
                                            10x
                                            <span className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white">-10%</span>
                                        </button>
                                        <label className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-md cursor-pointer ml-1">
                                            <input type="checkbox" checked={skipAnimation} onChange={(e) => setSkipAnimation(e.target.checked)} className="w-3 h-3 text-yellow-500 rounded bg-gray-800 border-gray-600" />
                                            <span className="text-[8px] font-bold text-gray-300 uppercase leading-none">Skip</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

                {/* Header */}
                <div className="bg-gradient-to-r from-[#4c1d95] to-[#3b0764] px-3 py-2 flex items-center gap-2 shrink-0 z-10 shadow-lg">
                    {selectedDeckId && (
                        <button onClick={() => setSelectedDeckId(null)} className="round-btn shrink-0">
                            <i className="ti ti-arrow-left"></i>
                        </button>
                    )}
                    <h2 className="text-xs font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-fuchsia-200 uppercase tracking-wider shrink-0">
                        {selectedDeckId ? decks.find(d => d.gameId === selectedDeckId)?.gameName : 'Album'}
                    </h2>

                    {!selectedDeckId && (
                        <div className="flex items-center bg-black/30 p-0.5 rounded-lg ml-1">
                            <button onClick={() => setActiveTab('ALBUM')} className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'ALBUM' ? 'bg-yellow-500 text-black shadow-md' : 'text-gray-400'}`}>Decks</button>
                            <button onClick={() => setActiveTab('PACKS')} className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'PACKS' ? 'bg-yellow-500 text-black shadow-md' : 'text-gray-400'}`}>Draw</button>
                        </div>
                    )}

                    <div className="flex-1"></div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <div className="coin">$</div>
                            <span className="num">{formatNumber(balance)}</span>
                        </div>
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <div className="gem"></div>
                            <span className="num">{formatNumber(diamonds)}</span>
                        </div>
                        <button onClick={() => setShowPackBuyPopup(true)}
                            className="currency-pill flex items-center gap-1 shrink-0 active:scale-95 transition-transform"
                            style={{ cursor: 'pointer' }}>
                            <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>📦</span>
                            <span className="num">{packCredits}</span>
                            <span style={{ fontSize: '9px', fontWeight: 900, color: '#4ade80', textTransform: 'uppercase' }}>+GET</span>
                        </button>
                        <div className="currency-pill flex items-center gap-1 shrink-0">
                            <span style={{ fontSize: '14px', lineHeight: 1, flexShrink: 0 }}>💳</span>
                            <span className="num">{formatNumber(tokens)}</span>
                        </div>
                    </div>
                    <div className="round-btn cursor-pointer shrink-0 ml-1" onClick={onClose}><i className="ti ti-x"></i></div>
                </div>

                {/* Horizontal scroll content */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar p-3 min-h-0">

                    {/* ALBUM view */}
                    {!selectedDeckId && activeTab === 'ALBUM' && (
                        <div className="flex flex-col h-full gap-2">
                            {/* Grand reward — no container, no emoji, just text */}
                            <div className="shrink-0 text-center leading-tight">
                                <div className="text-yellow-400 text-[9px] font-black uppercase tracking-widest">Grand Reward</div>
                                <div className="text-white font-black text-xl font-mono">{formatK(grandPrize)}</div>
                            </div>

                            {/* Deck scroll — swipe/wheel only */}
                            <div ref={albumScrollRef} className="flex-1 overflow-x-auto flex items-stretch gap-3 no-scrollbar min-h-0">
                                {decks.map(deck => {
                                    const collected = deck.cards.filter(c => c.count > 0).length;
                                    const isComplete = collected === 8;
                                    return (
                                        <button key={deck.gameId} onClick={() => setSelectedDeckId(deck.gameId)}
                                            className="flex-none w-36 flex flex-col items-center bg-black/40 p-2 rounded-xl h-full active:scale-95 transition-transform">
                                            <div className={`w-full flex-1 rounded-lg flex items-center justify-center overflow-hidden relative min-h-0`} style={{ background: deck.theme === 'NEON' ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : deck.theme === 'EGYPT' ? 'linear-gradient(135deg,#b45309,#78350f)' : deck.theme === 'DRAGON' ? 'linear-gradient(135deg,#dc2626,#7f1d1d)' : deck.theme === 'PIRATE' ? 'linear-gradient(135deg,#0369a1,#0c4a6e)' : deck.theme === 'SPACE' ? 'linear-gradient(135deg,#1d4ed8,#0f172a)' : deck.theme === 'CANDY' ? 'linear-gradient(135deg,#db2777,#9d174d)' : deck.theme === 'JUNGLE' ? 'linear-gradient(135deg,#15803d,#14532d)' : deck.theme === 'UNDERWATER' ? 'linear-gradient(135deg,#0891b2,#164e63)' : deck.theme === 'WESTERN' ? 'linear-gradient(135deg,#ca8a04,#713f12)' : deck.theme === 'SAMURAI' ? 'linear-gradient(135deg,#9f1239,#4c0519)' : deck.theme === 'PIGGY' ? 'linear-gradient(135deg,#ec4899,#9d174d)' : 'linear-gradient(135deg,#475569,#1e293b)' }}>
                                                <div className="text-[5rem] drop-shadow-2xl leading-none">{deck.theme === 'NEON' ? '🎰' : deck.theme === 'EGYPT' ? '🦂' : deck.theme === 'DRAGON' ? '🐉' : deck.theme === 'PIRATE' ? '🏴‍☠️' : deck.theme === 'SPACE' ? '👽' : deck.theme === 'PIGGY' ? '🐷' : '🃏'}</div>
                                                {isComplete && <div className="absolute top-1 right-1 text-sm">✅</div>}
                                                <div className="absolute bottom-1 text-center w-full px-1">
                                                    <div className="text-white font-mono font-black text-[15px] drop-shadow-[0_1px_4px_rgba(0,0,0,1)]">+{formatNumber(getDeckReward(deck.gameId))}</div>
                                                </div>
                                            </div>
                                            <div className="mt-1.5 text-center w-full">
                                                <h3 className="text-white font-black font-display text-[13px] truncate leading-none">{deck.gameName}</h3>
                                                <div className="text-purple-300 font-bold text-[10px] uppercase mt-0.5">{collected}/8</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* PACKS view — card-shaped, centered */}
                    {!selectedDeckId && activeTab === 'PACKS' && (
                        <div className="flex items-center h-full w-full">
                            {/* Pack cards — centered */}
                            <div className="flex-1 flex items-center justify-center gap-4">
                                {packOptions.map(pack => {
                                    const singleCost = pack.info.creditCost;
                                    const bulkCost = Math.ceil((singleCost * 10) * 0.9);
                                    const canDrawOne = packCredits >= singleCost;
                                    const canDrawTen = packCredits >= bulkCost;
                                    return (
                                        <div key={pack.id} className={`rounded-2xl overflow-hidden shadow-xl flex flex-col bg-gradient-to-b ${pack.color} text-center`}
                                            style={{ width: 150, height: 240, flexShrink: 0 }}>
                                            {/* Card art */}
                                            <div className="flex-1 flex flex-col items-center justify-center bg-black/20 gap-1">
                                                <div className="text-6xl drop-shadow-md">{pack.icon}</div>
                                                <h3 className="text-sm font-black font-display text-white uppercase drop-shadow leading-none mt-1">{pack.name}</h3>
                                            </div>
                                            {/* Buttons */}
                                            <div className="px-2 pb-2.5 pt-1 flex flex-col gap-1.5 bg-black/40">
                                                <button onClick={() => handleDraw(pack.id, 1)} disabled={!canDrawOne}
                                                    className={`btn-3d w-full py-2 rounded-lg font-black text-white uppercase text-xs ${canDrawOne ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700'}`}>
                                                    1× ({singleCost} 📦)
                                                </button>
                                                <button onClick={() => handleDraw(pack.id, 10)} disabled={!canDrawTen}
                                                    className={`btn-3d w-full py-2 rounded-lg font-black text-white uppercase text-xs relative overflow-hidden ${canDrawTen ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:brightness-110' : 'bg-gray-700'}`}>
                                                    10× ({bulkCost} 📦)
                                                    {canDrawTen && <div className="absolute top-0 right-0 bg-red-600 text-[6px] px-0.5 font-black text-white">-10%</div>}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Exchange panel — far right */}
                            <div className="flex flex-col gap-1.5 shrink-0 ml-auto" style={{ width: 110 }}>
                                <div className="text-[8px] font-black text-purple-300/70 uppercase tracking-widest text-center mb-0.5">Exchange</div>
                                {tokenExchanges.map((ex) => (
                                    <button key={ex.credits} onClick={() => onBuyCreditsWithTokens && onBuyCreditsWithTokens(ex.credits, ex.cost)}
                                        disabled={!onBuyCreditsWithTokens || tokens < ex.cost}
                                        className={`btn-3d w-full py-2 rounded-xl font-black text-[10px] flex flex-col items-center gap-0.5 ${(!onBuyCreditsWithTokens || tokens < ex.cost) ? 'bg-gray-800 opacity-40 cursor-not-allowed' : ''}`}
                                        style={(!onBuyCreditsWithTokens || tokens < ex.cost) ? {} : { background: 'linear-gradient(180deg,#7c3aed,#4c1d95)', boxShadow: '0 3px 0 #2e1065' }}>
                                        <span className="text-white leading-none">{ex.credits}× 📦</span>
                                        <span className="text-purple-300 leading-none">{ex.cost} 💳</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Single Deck card view — horizontal row */}
                    {selectedDeckId && (
                        <div className="flex flex-col h-full">
                            {/* Completion reward — centered, no container */}
                            <div className="shrink-0 text-center mb-2">
                                <div className="text-yellow-400 text-[8px] font-black uppercase tracking-widest">🏆 Completion Reward</div>
                                <div className="text-white font-black text-lg font-mono leading-none">{formatCommaNumber(getDeckReward(selectedDeckId))}</div>
                                <div className="mt-1">
                                    {decks.find(d => d.gameId === selectedDeckId)?.isCompleted ? (
                                        decks.find(d => d.gameId === selectedDeckId)?.rewardClaimed ? (
                                            <span className="text-gray-500 text-[9px] font-bold uppercase">Reward Claimed</span>
                                        ) : (
                                            <button onClick={() => onClaimDeckReward(selectedDeckId!, getDeckReward(selectedDeckId))} className="btn-3d bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-1 rounded-lg font-black text-black text-[10px] uppercase shadow-md">Claim Reward</button>
                                        )
                                    ) : (
                                        <span className="text-gray-500 text-[8px] font-bold uppercase">Collect all cards to claim</span>
                                    )}
                                </div>
                            </div>
                            <div ref={deckCardsScrollRef} className="flex-1 overflow-x-auto no-scrollbar">
                                <div className="flex gap-2 h-full items-stretch min-w-max py-0.5">
                                    {decks.find(d => d.gameId === selectedDeckId)?.cards
                                        .filter(card => {
                                            const st = String(card.symbolType);
                                            if (['TEN','JACK','QUEEN','KING','ACE'].includes(st)) return false;
                                            if (st.startsWith('JACKPOT')) return false;
                                            if (card.icon === '🪙') return false;
                                            return true;
                                        })
                                        .map((card, i) => {
                                        const borderColor = getCardBorder(card.rarity);
                                        const isLocked = card.count === 0;
                                        return (
                                            <div key={i} className="flex-none rounded-xl flex flex-col items-center justify-between relative overflow-hidden"
                                                style={{ width: '140px', height: '220px', background: getCardBg(card.rarity, isLocked), border: `2px solid ${isLocked ? borderColor + '44' : borderColor}`, boxShadow: isLocked ? 'none' : `0 4px 16px ${borderColor}44` }}>
                                                {/* Rarity + count top bar */}
                                                <div className="w-full flex items-center justify-between px-2 pt-2">
                                                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-sm ${card.rarity === 'LEGENDARY' ? 'bg-black/40 text-yellow-200' : card.rarity === 'EPIC' ? 'bg-black/40 text-purple-200' : card.rarity === 'RARE' ? 'bg-black/40 text-blue-200' : 'bg-black/40 text-white/70'}`}>{card.rarity[0]}</span>
                                                    {card.count > 0 && (
                                                        <span className="text-[10px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded-sm">×{card.count}</span>
                                                    )}
                                                </div>
                                                {/* Icon — centered */}
                                                <div className="flex-1 flex items-center justify-center w-full">
                                                    <span className="text-6xl leading-none drop-shadow-md">{isLocked ? '🔒' : card.icon}</span>
                                                </div>
                                                {/* Name bar at bottom */}
                                                <div className="w-full px-2 pb-2.5">
                                                    <div className="text-[11px] font-black text-center w-full truncate leading-none py-1 rounded-sm"
                                                        style={{ background: 'rgba(0,0,0,0.35)', color: isLocked ? '#666' : 'white' }}>
                                                        {card.name}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            {/* Card Pack Buy Popup */}
            {showPackBuyPopup && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowPackBuyPopup(false)}>
                    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ width: 260, background: 'linear-gradient(160deg,#1a0535,#2d0060)' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Header: card packs count */}
                        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">📦</span>
                                <div>
                                    <div className="text-white font-black text-base leading-none">{packCredits} Card Packs</div>
                                    <div className="text-purple-300/60 text-[10px]">Buy more with gems</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full">
                                <span className="text-sm">💎</span>
                                <span className="text-white font-black text-sm">{formatNumber(diamonds)}</span>
                            </div>
                        </div>
                        {/* Options */}
                        <div className="px-4 pb-4 flex flex-col gap-2 mt-1">
                            {[
                                { packs: 10,  gemCost: 45  },
                                { packs: 50,  gemCost: 200 },
                                { packs: 100, gemCost: 350 },
                            ].map(opt => {
                                const canAfford = diamonds >= opt.gemCost;
                                return (
                                    <button key={opt.packs}
                                        onClick={() => { if (!canAfford) return; onBuyCredits(opt.gemCost, opt.packs); setShowPackBuyPopup(false); }}
                                        disabled={!canAfford}
                                        className="btn-3d w-full py-3 rounded-xl flex items-center justify-between px-3"
                                        style={{
                                            background: canAfford ? 'linear-gradient(180deg,#7c3aed,#4c1d95)' : 'rgba(0,0,0,0.4)',
                                            boxShadow: canAfford ? '0 3px 0 #2e1065' : 'none',
                                            opacity: canAfford ? 1 : 0.5,
                                        }}>
                                        <span className="text-white font-black text-sm">📦 ×{opt.packs}</span>
                                        <span className="text-purple-200 font-black text-sm">💎 {opt.gemCost}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
