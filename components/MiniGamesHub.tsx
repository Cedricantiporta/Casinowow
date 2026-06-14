import React, { useState, useEffect } from 'react';
import { formatCommaNumber } from '../constants';

interface MiniGamesHubProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenWildQuest: () => void;
    onOpenDiceQuest: () => void;
    wildCredits: number;
    diceCredits: number;
    isQuestLocked: boolean;
    balance: number;
    currentBet: number;
    onCoinFlipResult: (netChange: number) => void;
}

type CoinFlipPhase = 'idle' | 'picked' | 'flipping' | 'result';
type CoinSide = 'heads' | 'tails';

export const MiniGamesHub: React.FC<MiniGamesHubProps> = ({
    isOpen, onClose, onOpenWildQuest, onOpenDiceQuest,
    wildCredits, diceCredits, isQuestLocked,
    balance, currentBet, onCoinFlipResult,
}) => {
    const [tab, setTab] = useState<'hub' | 'coinflip'>('hub');
    const [cfPick, setCfPick] = useState<CoinSide | null>(null);
    const [cfResult, setCfResult] = useState<CoinSide | null>(null);
    const [cfPhase, setCfPhase] = useState<CoinFlipPhase>('idle');
    const [cfNetChange, setCfNetChange] = useState(0);

    useEffect(() => {
        if (!isOpen) {
            setTab('hub');
            setCfPick(null);
            setCfResult(null);
            setCfPhase('idle');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const bet = currentBet;
    const isFlipping = cfPhase === 'flipping';
    const canFlip = balance >= bet && cfPhase === 'picked' && cfPick !== null;

    const handlePick = (side: CoinSide) => {
        if (cfPhase !== 'idle' && cfPhase !== 'picked') return;
        setCfPick(side);
        setCfPhase('picked');
    };

    const handleFlip = () => {
        if (!canFlip) return;
        setCfPhase('flipping');
        onCoinFlipResult(-bet);
        setTimeout(() => {
            const result: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';
            setCfResult(result);
            const won = result === cfPick;
            const net = won ? Math.floor(bet * 1.9) : 0;
            if (won) onCoinFlipResult(net);
            setCfNetChange(won ? Math.floor(bet * 0.9) : -bet);
            setCfPhase('result');
        }, 900);
    };

    const handleReset = () => {
        setCfPick(null);
        setCfResult(null);
        setCfPhase('idle');
    };

    const questBadge = (n: number) => n > 0 ? (
        <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center text-white font-black text-[9px] leading-none z-10"
            style={{ background: '#dc2626', border: '1.5px solid #f0c000' }}>
            {n > 60 ? '60' : n}
        </div>
    ) : null;

    return (
        <div className="fixed inset-0 z-[160] flex flex-col animate-pop-in select-none"
            style={{ background: 'linear-gradient(160deg,#0f0025 0%,#1a0040 50%,#090015 100%)' }}>

            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3">
                {tab === 'coinflip' ? (
                    <button onClick={() => setTab('hub')} className="round-btn shrink-0"
                        style={{ background: 'linear-gradient(180deg,#a060ff,#6020c0)', boxShadow: '0 2px 0 #3010a0' }}>
                        <i className="ti ti-arrow-left"></i>
                    </button>
                ) : null}
                <span className="font-black text-xl uppercase tracking-widest flex-1"
                    style={{ background: 'linear-gradient(180deg,#e8b8ff,#c060ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {tab === 'coinflip' ? 'Coin Flip' : 'Mini Games'}
                </span>
                <div className="round-btn cursor-pointer shrink-0" onClick={onClose}
                    style={{ background: 'linear-gradient(180deg,#a060ff,#6020c0)', boxShadow: '0 2px 0 #3010a0' }}>
                    <i className="ti ti-x"></i>
                </div>
            </div>

            {tab === 'hub' ? (
                <div className="flex-1 px-4 pb-4 grid grid-cols-2 gap-3 content-start pt-2">

                    {/* Wild Quest */}
                    <button
                        onClick={() => { if (!isQuestLocked) { onClose(); setTimeout(onOpenWildQuest, 50); } }}
                        className="relative flex flex-col items-center justify-center gap-2 rounded-2xl py-5 active:scale-95 transition-transform"
                        style={{
                            background: isQuestLocked ? 'rgba(255,255,255,0.04)' : 'rgba(120,40,200,0.25)',
                            opacity: isQuestLocked ? 0.5 : 1,
                        }}>
                        {questBadge(wildCredits)}
                        <span style={{ fontSize: '3.5rem', lineHeight: 1, filter: isQuestLocked ? 'grayscale(1)' : 'none' }}>🗿</span>
                        <span className="font-black text-[12px] uppercase tracking-widest text-purple-200">Wild Quest</span>
                        {!isQuestLocked && wildCredits > 0 && (
                            <span className="text-[10px] text-purple-300 font-bold">{wildCredits} / 60 credits</span>
                        )}
                        {isQuestLocked && <span className="text-[10px] text-gray-500 font-bold">Unlocks Lvl 20</span>}
                    </button>

                    {/* Dice Quest */}
                    <button
                        onClick={() => { if (!isQuestLocked) { onClose(); setTimeout(onOpenDiceQuest, 50); } }}
                        className="relative flex flex-col items-center justify-center gap-2 rounded-2xl py-5 active:scale-95 transition-transform"
                        style={{
                            background: isQuestLocked ? 'rgba(255,255,255,0.04)' : 'rgba(40,100,200,0.25)',
                            opacity: isQuestLocked ? 0.5 : 1,
                        }}>
                        {questBadge(diceCredits)}
                        <span style={{ fontSize: '3.5rem', lineHeight: 1, filter: isQuestLocked ? 'grayscale(1)' : 'none' }}>🎲</span>
                        <span className="font-black text-[12px] uppercase tracking-widest text-blue-200">Dice Quest</span>
                        {!isQuestLocked && diceCredits > 0 && (
                            <span className="text-[10px] text-blue-300 font-bold">{diceCredits} / 60 credits</span>
                        )}
                        {isQuestLocked && <span className="text-[10px] text-gray-500 font-bold">Unlocks Lvl 20</span>}
                    </button>

                    {/* Coin Flip */}
                    <button
                        onClick={() => setTab('coinflip')}
                        className="relative flex flex-col items-center justify-center gap-2 rounded-2xl py-5 active:scale-95 transition-transform col-span-2"
                        style={{ background: 'rgba(200,140,0,0.22)' }}>
                        <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>🪙</span>
                        <span className="font-black text-[12px] uppercase tracking-widest text-yellow-200">Coin Flip</span>
                        <span className="text-[10px] text-yellow-300/70 font-bold">Guess heads or tails — win 1.9×</span>
                    </button>

                </div>
            ) : (
                /* Coin Flip game */
                <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 pb-6">

                    {/* Coin display */}
                    <div className="flex flex-col items-center gap-1">
                        <div className={`text-[6rem] leading-none transition-all duration-300 ${cfPhase === 'flipping' ? 'animate-bounce' : ''}`}>
                            {cfPhase === 'result'
                                ? (cfResult === 'heads' ? '🌕' : '🌑')
                                : cfPick === 'heads' ? '🌕' : cfPick === 'tails' ? '🌑' : '🪙'}
                        </div>
                        {cfPhase === 'flipping' && (
                            <span className="text-yellow-300 font-black text-sm uppercase tracking-widest animate-pulse">Flipping...</span>
                        )}
                        {cfPhase === 'result' && (
                            <div className={`font-black text-xl uppercase tracking-widest mt-1 ${cfNetChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {cfNetChange > 0 ? `+${formatCommaNumber(cfNetChange)} WIN!` : `${formatCommaNumber(cfNetChange)} LOSE`}
                            </div>
                        )}
                    </div>

                    {/* Pick buttons */}
                    {cfPhase !== 'result' && (
                        <div className="flex gap-4 w-full max-w-xs">
                            <button
                                onClick={() => handlePick('heads')}
                                className="flex-1 flex flex-col items-center gap-1 py-4 rounded-xl font-black text-[12px] uppercase tracking-widest active:scale-95 transition-all"
                                style={{
                                    background: cfPick === 'heads' ? 'linear-gradient(180deg,#ffd700,#d4a000)' : 'rgba(255,255,255,0.08)',
                                    color: cfPick === 'heads' ? '#1a0800' : '#e5e7eb',
                                    boxShadow: cfPick === 'heads' ? '0 3px 0 #8a6000' : 'none',
                                    border: cfPick === 'heads' ? 'none' : '1.5px solid rgba(255,255,255,0.12)',
                                }}>
                                <span className="text-3xl">🌕</span>
                                Heads
                            </button>
                            <button
                                onClick={() => handlePick('tails')}
                                className="flex-1 flex flex-col items-center gap-1 py-4 rounded-xl font-black text-[12px] uppercase tracking-widest active:scale-95 transition-all"
                                style={{
                                    background: cfPick === 'tails' ? 'linear-gradient(180deg,#9060ff,#6030d0)' : 'rgba(255,255,255,0.08)',
                                    color: '#e5e7eb',
                                    boxShadow: cfPick === 'tails' ? '0 3px 0 #3010a0' : 'none',
                                    border: cfPick === 'tails' ? 'none' : '1.5px solid rgba(255,255,255,0.12)',
                                }}>
                                <span className="text-3xl">🌑</span>
                                Tails
                            </button>
                        </div>
                    )}

                    {/* Bet info */}
                    <div className="text-yellow-200/60 text-[11px] font-bold uppercase tracking-widest">
                        Bet: {formatCommaNumber(bet)} coins • Balance: {formatCommaNumber(balance)}
                    </div>

                    {/* Action button */}
                    {cfPhase === 'result' ? (
                        <button onClick={handleReset}
                            className="btn-3d font-black text-sm uppercase tracking-widest px-10 py-3 rounded-xl"
                            style={{ background: 'linear-gradient(180deg,#a060ff,#6020c0)', color: '#fff', boxShadow: '0 4px 0 #3010a0' }}>
                            Play Again
                        </button>
                    ) : (
                        <button
                            disabled={!canFlip || isFlipping}
                            onClick={handleFlip}
                            className="btn-3d font-black text-sm uppercase tracking-widest px-10 py-3 rounded-xl"
                            style={{
                                background: canFlip ? 'linear-gradient(180deg,#ffd700,#d4a000)' : 'rgba(255,255,255,0.1)',
                                color: canFlip ? '#1a0800' : '#6b7280',
                                boxShadow: canFlip ? '0 4px 0 #8a6000' : 'none',
                                cursor: canFlip ? 'pointer' : 'default',
                            }}>
                            {cfPick ? 'Flip!' : 'Pick a side first'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
