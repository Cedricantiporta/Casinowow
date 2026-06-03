import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MiniGameReward, WildGridCell } from '../types';
import { formatNumber, formatCommaNumber } from '../constants';
import { audioService } from '../services/audioService';

interface MiniGameModalProps {
    isOpen: boolean;
    credits: number;
    picks: number; // Acts as "Rolls" in Dice Quest
    wildStage: number; // New Prop
    diceStage: number; // New Prop
    dicePosition: number; 
    activeGame: 'NONE' | 'WILD' | 'DICE';
    savedGrid?: WildGridCell[];
    onSelectMode: (mode: 'NONE' | 'WILD' | 'DICE') => void;
    onBuyPicks: (amount: number, cost: number, currency: 'CREDITS' | 'GEMS') => void;
    onPickTile: (isGem: boolean, reward: MiniGameReward | null) => void;
    onBatchPick: (picksUsed: number, rewards: MiniGameReward[]) => void;
    onStageComplete: (bonusCoins: number, bonusDiamonds: number) => void;
    onGridUpdate?: (grid: WildGridCell[]) => void;
    onDiceRoll: (roll: number, newPosition: number, rewards: MiniGameReward[], isFinish: boolean) => void;
    onClose: () => void;
    playerLevel: number;
}

const GRID_SIZES = [3, 4, 5, 5, 6]; 
const EXCHANGE_RATE = 5; // 5 Credits per 1 Dice Roll
const GEM_COST = 100; // 100 Gems per 1 Dice Roll

interface BoardStep {
    index: number;
    reward?: MiniGameReward;
    isFinish: boolean;
    isStart: boolean;
}

export const MiniGameModal: React.FC<MiniGameModalProps> = ({ 
    isOpen, credits, picks, wildStage, diceStage, dicePosition = 0, activeGame, savedGrid, onSelectMode, onBuyPicks, onPickTile, onBatchPick, onStageComplete, onGridUpdate, onDiceRoll, onClose, playerLevel 
}) => {
    
    // --- Wild Quest State ---
    const currentGridSize = GRID_SIZES[Math.min(wildStage - 1, GRID_SIZES.length - 1)];
    const totalCells = currentGridSize * currentGridSize;
    
    const [grid, setGrid] = useState<WildGridCell[]>([]);
    const [stageWinning, setStageWinning] = useState(false);

    // --- Dice Quest State ---
    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [diceValue, setDiceValue] = useState(1);
    const [visualPosition, setVisualPosition] = useState(dicePosition);
    const [board, setBoard] = useState<BoardStep[]>([]);
    const [autoRoll, setAutoRoll] = useState(false);
    const rollButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef(false);
    
    const boardLength = 10 + ((diceStage - 1) * 5); // Stage 1: 10, Stage 2: 15, etc.
    
    const boardContainerRef = useRef<HTMLDivElement>(null);

    // Init Wild Grid
    const initGrid = useCallback(() => {
        const cells: WildGridCell[] = Array(totalCells).fill({ revealed: false, content: 'BLANK' });
        const gemIdx = Math.floor(Math.random() * totalCells);
        cells[gemIdx] = { revealed: false, content: 'GEM' };

        const baseCoin = 25000 * wildStage * playerLevel;

        for(let i=0; i<totalCells; i++) {
            if (i === gemIdx) continue;
            if (Math.random() < 0.3) {
                const r = Math.random();
                let reward: MiniGameReward = { type: 'COINS', value: baseCoin, label: formatNumber(baseCoin) };
                if (r < 0.5) {
                    const highCoin = baseCoin * 2;
                    reward = { type: 'COINS', value: highCoin, label: formatNumber(highCoin) };
                }
                else if (r < 0.7) reward = { type: 'PICKS', value: 1, label: '+1 Pick' };
                else if (r < 0.9) reward = { type: 'PICKS', value: 2, label: '+2 Picks' };
                else reward = { type: 'DIAMONDS', value: 5, label: '5 💎' };
                cells[i] = { revealed: false, content: 'REWARD', reward };
            }
        }
        setGrid(cells);
        if(onGridUpdate) onGridUpdate(cells);
    }, [wildStage, totalCells, playerLevel, onGridUpdate]);

    // Init Board
    const initBoard = useCallback(() => {
        const newBoard: BoardStep[] = [];
        const baseCoin = 10000 * diceStage * playerLevel; 

        for(let i=0; i<=boardLength; i++) {
            let reward: MiniGameReward | undefined = undefined;
            if (i > 0 && i < boardLength && Math.random() < 0.35) {
                 const r = Math.random();
                 if (r < 0.6) reward = { type: 'COINS', value: baseCoin, label: formatNumber(baseCoin) };
                 else if (r < 0.8) reward = { type: 'COINS', value: baseCoin * 2.5, label: formatNumber(baseCoin * 2.5) };
                 else if (r < 0.9) reward = { type: 'DIAMONDS', value: 50, label: '50💎' };
                 else reward = { type: 'PICKS', value: 1, label: '+1 Roll' };
            }

            newBoard.push({
                index: i,
                isStart: i === 0,
                isFinish: i === boardLength,
                reward
            });
        }
        setBoard(newBoard);
        setVisualPosition(0);
    }, [boardLength, diceStage, playerLevel]);

    useEffect(() => {
        if (isOpen) {
            if (activeGame === 'WILD') {
                if (savedGrid && savedGrid.length > 0) {
                    setGrid(savedGrid);
                } else {
                    initGrid();
                }
            }
            if (activeGame === 'DICE') {
                if (board.length === 0 || board[board.length-1].index !== boardLength) {
                    initBoard();
                }
                if (!isMoving) setVisualPosition(dicePosition);
            }
            setStageWinning(false);
        } else {
            setIsRolling(false);
            setIsMoving(false);
            setAutoRoll(false);
        }
    }, [isOpen, initGrid, activeGame, initBoard, boardLength, dicePosition, board.length, isMoving, savedGrid]);

    // Scroll Effect for Dice Quest
    useEffect(() => {
        if (activeGame === 'DICE' && boardContainerRef.current) {
            const container = boardContainerRef.current;
            const children = container.children;
            
            if (children && children[visualPosition]) {
                const stepElement = children[visualPosition] as HTMLElement;
                const containerCenter = container.clientWidth / 2;
                const stepCenter = stepElement.offsetWidth / 2;
                const stepLeft = stepElement.offsetLeft;

                container.scrollTo({
                    left: stepLeft - containerCenter + stepCenter,
                    behavior: 'smooth'
                });
            }
        }
    }, [visualPosition, activeGame]);

    // Auto Roll Effect
    useEffect(() => {
        if (autoRoll && !isRolling && !isMoving && picks > 0) {
            const timer = setTimeout(() => {
                handleRollDice();
            }, 1000);
            return () => clearTimeout(timer);
        } else if (autoRoll && picks <= 0) {
            setAutoRoll(false);
        }
    }, [autoRoll, isRolling, isMoving, picks]);

    // --- Wild Quest Handlers ---
    const handleTileClick = (index: number) => {
        if (picks <= 0 || grid[index].revealed || stageWinning) return;
        const cell = grid[index];
        const newGrid = [...grid];
        newGrid[index] = { ...cell, revealed: true };
        setGrid(newGrid);
        if (onGridUpdate) onGridUpdate(newGrid);

        if (cell.content === 'GEM') {
            audioService.playGemFound();
            setStageWinning(true);
            setTimeout(() => {
                onStageComplete(50000 * wildStage, 10 * wildStage);
                setStageWinning(false);
            }, 2000);
        } else if (cell.content === 'REWARD') {
            audioService.playWinSmall();
            onPickTile(false, cell.reward!);
        } else {
            audioService.playStoneBreak();
            onPickTile(false, null);
        }
    };

    const handleAutoPick = () => {
        if (picks <= 0 || stageWinning) return;
        const unrevealedIndices = grid.map((cell, index) => !cell.revealed ? index : -1).filter(index => index !== -1);
        for (let i = unrevealedIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unrevealedIndices[i], unrevealedIndices[j]] = [unrevealedIndices[j], unrevealedIndices[i]];
        }
        const countToPick = Math.min(picks, unrevealedIndices.length);
        const indicesToPick = unrevealedIndices.slice(0, countToPick);
        
        const newGrid = [...grid];
        const collectedRewards: MiniGameReward[] = [];
        let gemFound = false;
        let picksUsed = 0;

        for (const idx of indicesToPick) {
            picksUsed++;
            newGrid[idx] = { ...newGrid[idx], revealed: true };
            if (newGrid[idx].content === 'GEM') { gemFound = true; break; }
            else if (newGrid[idx].content === 'REWARD' && newGrid[idx].reward) collectedRewards.push(newGrid[idx].reward!);
        }
        setGrid(newGrid);
        if (onGridUpdate) onGridUpdate(newGrid);
        
        if (picksUsed > 0) {
            onBatchPick(picksUsed, collectedRewards);
            audioService.playClick();
        }
        if (gemFound) {
            audioService.playGemFound();
            setStageWinning(true);
            setTimeout(() => {
                onStageComplete(50000 * wildStage, 10 * wildStage);
                setStageWinning(false);
            }, 2000);
        } else {
            if (collectedRewards.length > 0) audioService.playWinSmall();
            else audioService.playStoneBreak();
        }
    };

    // --- Dice Quest Handlers ---
    const movePlayerStepByStep = async (start: number, end: number, collectedRewards: MiniGameReward[]) => {
        setIsMoving(true);
        const finalPos = Math.min(end, boardLength);

        for (let i = start + 1; i <= finalPos; i++) {
            setVisualPosition(i);
            audioService.playClick(); 
            
            const step = board.find(s => s.index === i);
            if (step?.reward) {
                collectedRewards.push(step.reward);
            }
            await new Promise(resolve => setTimeout(resolve, 400));
        }

        setIsMoving(false);
        const isFinish = finalPos >= boardLength;
        onDiceRoll(0, finalPos, collectedRewards, isFinish); 
        
        if (isFinish) {
             audioService.playWinBig();
             setAutoRoll(false);
        }
    };

    const handleRollDice = () => {
        if (picks <= 0 || isRolling || isMoving) {
            if (picks <= 0) setAutoRoll(false);
            return;
        }

        setIsRolling(true);
        audioService.playClick();

        let rolls = 0;
        const interval = setInterval(() => {
            setDiceValue(Math.floor(Math.random() * 6) + 1);
            rolls++;
            if (rolls > 12) {
                clearInterval(interval);
                const finalRoll = Math.floor(Math.random() * 6) + 1;
                setDiceValue(finalRoll);
                setIsRolling(false);
                
                const collectedRewards: MiniGameReward[] = [];
                movePlayerStepByStep(visualPosition, visualPosition + finalRoll, collectedRewards);
            }
        }, 80);
    };

    // Roll Button Interaction
    const handleRollMouseDown = () => {
        if (picks <= 0 || isRolling || isMoving) return;
        isLongPressRef.current = false;
        rollButtonTimeoutRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            if (!autoRoll) {
                setAutoRoll(true);
                audioService.playClick();
            }
        }, 800);
    };

    const handleRollMouseUp = () => {
        if (rollButtonTimeoutRef.current) {
            clearTimeout(rollButtonTimeoutRef.current);
            rollButtonTimeoutRef.current = null;
        }

        if (!isLongPressRef.current) {
            if (autoRoll) {
                setAutoRoll(false);
                audioService.playClick();
            } else {
                handleRollDice();
            }
        }
    };

    const handleExchangeCredits = () => {
        if (credits >= EXCHANGE_RATE) { onBuyPicks(1, EXCHANGE_RATE, 'CREDITS'); audioService.playClick(); }
    };
    const handleBuyGems = () => {
        if (credits >= 0) { 
            onBuyPicks(1, GEM_COST, 'GEMS'); audioService.playClick();
        }
    };

    const handleBackToSelection = () => {
        onSelectMode('NONE');
    };

    const handleBoardScroll = (direction: 'LEFT' | 'RIGHT') => {
        if (boardContainerRef.current) {
            const amount = 120;
            boardContainerRef.current.scrollBy({ left: direction === 'LEFT' ? -amount : amount, behavior: 'smooth' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black animate-pop-in">
            {/* GAME SELECTION SCREEN */}
            {activeGame === 'NONE' && (
                <div className="w-full h-full max-w-none flex flex-col items-center justify-center p-4 relative bg-[#180e07] rounded-none shadow-2xl overflow-hidden">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-15 pointer-events-none"></div>
                     <div className="round-btn absolute top-2.5 right-2.5 z-50 cursor-pointer" onClick={onClose}><i className="ti ti-x"></i></div>
                     
                     <h2 className="text-lg font-black font-heavy text-[#e6c288] uppercase mb-4 text-center z-13">Choose Quest</h2>
                     
                     <div className="flex flex-row gap-3 z-10 items-center">
                          {/* Wild Quest Card */}
                          <button onClick={() => onSelectMode('WILD')} className="group relative w-32 h-44 bg-[#2a1b12] rounded-xl hover:scale-105 transition-transform flex flex-col items-center overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/85 z-10"></div>
                              <div className="relative z-20 flex-1 flex items-center justify-center">
                                  <div className="text-4xl group-hover:scale-105 transition-transform">🗿</div>
                              </div>
                              <div className="relative z-20 w-full bg-black/70 p-2 text-center">
                                  <h3 className="text-[10px] font-black text-[#e6c288] uppercase tracking-wider leading-none">Wild</h3>
                                  <p className="text-[#a1887f] text-[7px] font-bold mt-1 leading-none">Find gems!</p>
                              </div>
                          </button>

                          {/* Dice Quest Card */}
                          <button onClick={() => onSelectMode('DICE')} className="group relative w-32 h-44 bg-[#1a237e] rounded-xl hover:scale-105 transition-transform flex flex-col items-center overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/85 z-10"></div>
                              <div className="relative z-20 flex-1 flex items-center justify-center">
                                  <div className="text-4xl group-hover:scale-105 transition-transform">🎲</div>
                              </div>
                              <div className="relative z-20 w-full bg-black/70 p-2 text-center">
                                  <h3 className="text-[10px] font-black text-[#ffeb3b] uppercase tracking-wider leading-none">Dice</h3>
                                  <p className="text-[#c5cae9] text-[7px] font-bold mt-1 leading-none">Roll & win!</p>
                              </div>
                          </button>
                     </div>
                </div>
            )}

            {/* WILD QUEST GAMEPLAY */}
            {activeGame === 'WILD' && (
                <div className="w-full max-w-none h-full flex flex-col bg-[#2a1b12] rounded-none shadow-2xl relative overflow-hidden">
                    <div className="round-btn absolute top-2.5 right-2.5 z-[60] cursor-pointer" onClick={onClose}><i className="ti ti-x"></i></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aztec.png')] opacity-10 pointer-events-none"></div>
                    
                    {/* Header */}
                    <div className="flex justify-between items-center p-2.5 bg-[#1b0e07] shadow-md z-20">
                        <button onClick={handleBackToSelection} className="bg-[#3e2723] text-[#e6c288] font-bold text-[8px] px-2 py-1 rounded-md">⬅ QUESTS</button>
                        
                        <div className="flex items-center gap-2.5 leading-none">
                            <div className="flex flex-col items-center">
                                <span className="text-[#a1887f] text-[7px] font-bold uppercase">Stg</span>
                                <span className="text-xs font-black text-[#e6c288]">{wildStage}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[#a1887f] text-[7px] font-bold uppercase">Cr</span>
                                <span className="text-xs font-black text-green-400 font-mono">{credits}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[#a1887f] text-[7px] font-bold uppercase">Picks</span>
                                <span className="text-sm font-black text-white">{picks}</span>
                            </div>
                        </div>

                        <div className="flex gap-1 text-[8px]">
                             <button onClick={handleExchangeCredits} className="bg-green-700 text-white px-2 py-0.5 rounded-md font-bold flex flex-col items-center">
                                 <span>Pick (+{EXCHANGE_RATE}cr)</span>
                              </button>
                             <button onClick={handleBuyGems} className="bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold flex flex-col items-center">
                                 <span>Pick (+100💎)</span>
                             </button>
                        </div>
                    </div>

                    {/* Main Area */}
                    <div className="flex-1 flex items-center justify-center p-2.5 relative">
                         <div className="bg-[#3e2723] p-2 rounded-xl shadow-lg relative">
                             {stageWinning && (
                                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
                                      <div className="text-center">
                                          <div className="text-4xl animate-bounce mb-2">💎</div>
                                          <h2 className="text-base font-black text-[#e6c288] uppercase tracking-widest leading-none">Clear!</h2>
                                      </div>
                                  </div>
                             )}

                             <div 
                                className="grid gap-1.5"
                                style={{ 
                                    gridTemplateColumns: `repeat(${currentGridSize}, minmax(0, 1fr))` 
                                }}
                             >
                                  {grid.map((cell, i) => (
                                      <button 
                                         key={i}
                                         onClick={() => handleTileClick(i)}
                                         disabled={cell.revealed || picks <= 0}
                                         className={`
                                             w-10 h-10 md:w-12 md:h-12 rounded-lg active:translate-y-0.5 transition-all relative overflow-hidden flex items-center justify-center text-sm shadow-md
                                             ${cell.revealed 
                                                 ? 'bg-[#2a1b12] cursor-default' 
                                                 : 'bg-[#6d4c41] hover:bg-[#795548] cursor-pointer'}
                                         `}
                                      >
                                          {cell.revealed ? (
                                              <span>
                                                  {cell.content === 'GEM' ? '💎' : cell.content === 'REWARD' && cell.reward ? (
                                                      cell.reward.type === 'COINS' ? '💰' : cell.reward.type === 'PICKS' ? '⛏️' : '💎'
                                                  ) : ''}
                                              </span>
                                          ) : (
                                              <span className="opacity-15 text-xs">?</span>
                                          )}
                                          {cell.revealed && cell.content === 'REWARD' && (
                                              <span className="absolute bottom-0 text-[6px] font-bold text-white bg-black/60 px-0.5 rounded leading-none">{cell.reward?.label}</span>
                                          )}
                                      </button>
                                  ))}
                             </div>
                         </div>
                    </div>

                    <div className="p-2.5 flex justify-center">
                        <button 
                            onClick={handleAutoPick}
                            disabled={picks <= 0 || stageWinning}
                            className={`px-5 py-1.5 rounded-lg font-black uppercase text-xs tracking-wider transition-all ${picks > 0 ? 'bg-[#e6c288] text-[#3e2723]' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                        >
                            Auto Pick
                        </button>
                    </div>
                </div>
            )}

            {/* DICE QUEST GAMEPLAY */}
            {activeGame === 'DICE' && (
                <div className="w-full max-w-none h-full flex flex-col bg-[#1a237e] rounded-none shadow-2xl relative overflow-hidden">
                    <div className="round-btn absolute top-2.5 right-2.5 z-[60] cursor-pointer" onClick={onClose}><i className="ti ti-x"></i></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>

                    {/* Header */}
                    <div className="flex justify-between items-center p-2.5 bg-[#0d47a1] shadow-md z-20">
                         <button onClick={handleBackToSelection} className="bg-[#1976d2] text-white font-bold text-[8px] px-2 py-1 rounded-md">⬅ QUESTS</button>
                         
                         <div className="flex items-center gap-2.5 leading-none">
                            <div className="flex flex-col items-center">
                                <span className="text-blue-200 text-[7px] font-bold uppercase">Stg</span>
                                <span className="text-xs font-black text-yellow-400">{diceStage}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-blue-200 text-[7px] font-bold uppercase">Cr</span>
                                <span className="text-xs font-black text-green-400 font-mono">{credits}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-blue-200 text-[7px] font-bold uppercase">Rolls</span>
                                <span className="text-sm font-black text-white">{picks}</span>
                            </div>
                        </div>

                        <div className="flex gap-1 text-[8px]">
                             <button onClick={handleExchangeCredits} className="bg-green-700 text-white px-2 py-0.5 rounded-md font-bold flex flex-col items-center">
                                 <span>Roll (+{EXCHANGE_RATE}cr)</span>
                              </button>
                             <button onClick={handleBuyGems} className="bg-blue-500 text-white px-2 py-0.5 rounded-md font-bold flex flex-col items-center">
                                 <span>Roll (+100💎)</span>
                             </button>
                        </div>
                    </div>

                    {/* Board Area */}
                    <div className="flex-1 flex flex-col items-center justify-center relative w-full overflow-hidden">
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-16 bg-white/5 pointer-events-none"></div>
                        
                        <div className="w-full relative px-6">
                             <button onClick={() => handleBoardScroll('LEFT')} className="absolute left-1 top-1/2 -translate-y-1/2 z-30 w-6 h-6 bg-black/50 text-white rounded-full text-xs">◀</button>
                             <button onClick={() => handleBoardScroll('RIGHT')} className="absolute right-1 top-1/2 -translate-y-1/2 z-30 w-6 h-6 bg-black/50 text-white rounded-full text-xs">▶</button>

                             <div 
                                ref={boardContainerRef}
                                className="flex items-center gap-2.5 overflow-x-auto no-scrollbar px-[40%] py-4 snap-x snap-center"
                                style={{ scrollBehavior: 'smooth' }}
                             >
                                 {board.map((step) => {
                                     const isPlayerHere = step.index === visualPosition;
                                     const isPast = step.index < visualPosition;
                                     
                                     return (
                                         <div key={step.index} className={`relative shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow snap-center ${step.isFinish ? 'bg-yellow-500' : step.isStart ? 'bg-green-600' : 'bg-[#283593]'}`}>
                                             <div className="absolute top-1 left-1 text-[7px] font-bold opacity-50 text-white">#{step.index}</div>
                                             
                                             {step.isFinish && <div className="text-xl">🏆</div>}
                                             {step.isStart && <div className="text-[10px] font-black uppercase text-white leading-none">Start</div>}
                                             
                                             {step.reward && !step.isFinish && (
                                                  <div className="flex flex-col items-center">
                                                      <span className="text-lg">{step.reward.type === 'COINS' ? '💰' : step.reward.type === 'DIAMONDS' ? '💎' : '⛏️'}</span>
                                                      <span className="text-[7px] font-bold text-white bg-black/40 px-1 rounded">{step.reward.label}</span>
                                                  </div>
                                             )}

                                             {/* Player Avatar */}
                                             {isPlayerHere && (
                                                  <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20 animate-bounce flex flex-col items-center">
                                                      <div className="text-2xl drop-shadow-md">🤠</div>
                                                  </div>
                                             )}

                                             {isPast && !step.isStart && (
                                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                                      <span className="text-green-400 text-lg">✔</span>
                                                  </div>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="p-3 bg-[#0d47a1] flex flex-col items-center shadow relative z-20">
                         <div className="flex items-center gap-4">
                             <div className="bg-[#1565c0] p-2 rounded-lg w-12 h-12 flex items-center justify-center shadow-inner">
                                 <div className={`text-xl font-black text-white ${isRolling ? 'animate-spin' : ''}`}>{diceValue}</div>
                             </div>

                             <button 
                                onMouseDown={handleRollMouseDown}
                                onMouseUp={handleRollMouseUp}
                                onMouseLeave={handleRollMouseUp}
                                onTouchStart={handleRollMouseDown}
                                onTouchEnd={handleRollMouseUp}
                                disabled={picks <= 0 || isRolling || isMoving}
                                className={`
                                    w-16 h-16 rounded-full font-black text-xs uppercase tracking-widest active:translate-y-0.5 transition-all flex flex-col items-center justify-center leading-none
                                    ${autoRoll ? 'bg-red-650 animate-pulse text-white' : picks > 0 ? 'bg-yellow-500 text-yellow-950 font-bold' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                                `}
                              >
                                 {autoRoll ? 'STOP' : 'ROLL'}
                                 <span className="text-[6px] opacity-70 mt-0.5">{autoRoll ? 'Auto' : 'Auto'}</span>
                             </button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
