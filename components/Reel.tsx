
import React, { useEffect, useState, useRef } from 'react';
import { SymbolType, SymbolConfig, GameTheme } from '../types';
import { WEIGHTS, GET_SYMBOLS } from '../constants';
import { GameConfig } from '../types';

interface ReelProps {
  id: number;
  symbols: SymbolType[]; 
  spinning: boolean; 
  stopping: boolean; 
  stopDelay: number;
  duration: number;
  onStop: () => void;
  winningIndices: number[]; 
  gameConfig: GameConfig;
  isScatterShowcase?: boolean; 
}

const getRandomSymbol = () => {
  let sum = WEIGHTS.reduce((acc, el) => acc + el.weight, 0);
  let rand = Math.random() * sum;
  for (let w of WEIGHTS) {
    rand -= w.weight;
    if (rand <= 0) return w.type;
  }
  return SymbolType.TEN;
};

export const Reel: React.FC<ReelProps> = ({ id, symbols = [], spinning, stopping, stopDelay, duration, onStop, winningIndices, gameConfig, isScatterShowcase }) => {
  const [strip, setStrip] = useState<SymbolType[]>([]);
  const [landing, setLanding] = useState(false); 
  const SYMBOL_CONFIGS = GET_SYMBOLS(gameConfig.theme);
  const VISIBLE_ROWS = gameConfig.rows;
  
  // Initialize strip on mount or config change
  useEffect(() => {
    setStrip(Array(VISIBLE_ROWS).fill(null).map(getRandomSymbol));
  }, [VISIBLE_ROWS]);

  // Effect 1: Handle Spin Start
  useEffect(() => {
    if (spinning && !stopping) {
      setLanding(false);
      setStrip(Array(VISIBLE_ROWS * 4).fill(null).map(getRandomSymbol));
    }
  }, [spinning, stopping, VISIBLE_ROWS]);

  // Effect 2: Handle Stop Trigger
  useEffect(() => {
    if (stopping && !landing) {
        const timer = setTimeout(() => {
            setLanding(true); 
            
            // Set final strip: Random symbols on top + Final symbols at bottom
            const finalStrip = [
                ...Array(VISIBLE_ROWS).fill(null).map(getRandomSymbol),
                ...symbols 
            ];
            setStrip(finalStrip);
        }, stopDelay);
        return () => clearTimeout(timer);
    }
  }, [stopping, landing, stopDelay, symbols, VISIBLE_ROWS]);

  // Effect 3: Handle Animation Completion (Signal Parent)
  useEffect(() => {
      if (stopping && landing) {
          // Delay to allow bounce animation to play before notifying parent
          const delay = duration > 800 ? 400 : 200; 
          const timer = setTimeout(() => {
              onStop();
          }, delay);
          return () => clearTimeout(timer);
      }
  }, [stopping, landing, onStop, duration]);

  // --- Layout & Animation Logic ---

  // 1. Determine Content
  // During Spin: We double the strip to create a seamless loop for the slide animation
  const renderStrip = (!landing && spinning) ? [...strip, ...strip] : strip;
  
  // 2. Calculate Container Heights
  // We size the inner container so that 1 "View Height" = VISIBLE_ROWS items.
  // Total items / VISIBLE_ROWS = Multiplier of View Height.
  const totalItems = renderStrip.length;
  const containerHeightPercent = (totalItems / VISIBLE_ROWS) * 100;
  
  // 3. Calculate Scroll Offset (TranslateY)
  let translateY = '0%';
  
  if (landing) {
      const rowsToHide = totalItems - VISIBLE_ROWS;
      const shiftPercent = (rowsToHide / totalItems) * 100;
      translateY = `-${shiftPercent}%`;
  } 
  
  return (
    <div 
        className={`relative flex-1 overflow-hidden ${gameConfig.reelBg} shadow-inner rounded-md min-w-0`}
        style={{ aspectRatio: `1 / ${gameConfig.rows}` }} 
    >
       {/* Scroll Wrapper - Static Position Adjustments */}
       <div 
            className="w-full absolute top-0 left-0 will-change-transform transition-transform duration-300 ease-out"
            style={{
                height: `${containerHeightPercent}%`, // Force container to be tall enough to hold all items
                transform: (!landing && spinning) ? 'none' : `translateY(${translateY})`, // Static scroll to result
            }}
       >
            {/* Animation Wrapper - Jiggle/Spin Effects */}
            <div className={`
                w-full h-full flex flex-col
                ${(!landing && spinning) ? 'animate-spin-blur' : ''} 
                ${(landing) ? 'animate-bounce-land' : ''}
            `}>
                {renderStrip.map((s, i) => {
                    // Determine if this specific cell is a winner
                    // Only relevant if landing. 
                    // In landing strip of length N, the visible rows are indices [N-V, ..., N-1].
                    // winningIndices are relative to the visible window (0..V-1).
                    // So if i is the index in the full strip:
                    // visibleRowIndex = i - (totalItems - VISIBLE_ROWS)
                    const visibleRowIndex = i - (totalItems - VISIBLE_ROWS);
                    const isWinner = landing && visibleRowIndex >= 0 && winningIndices.includes(visibleRowIndex);
                    const isShowcase = landing && visibleRowIndex >= 0 && isScatterShowcase && s === SymbolType.SCATTER;

                    return (
                        <ReelCell
                            key={i}
                            symbol={s}
                            config={SYMBOL_CONFIGS[s]}
                            blur={!landing && spinning}
                            highlight={isWinner}
                            isScatterShowcase={isShowcase}
                            heightPercent={100 / totalItems}
                            theme={gameConfig.theme}
                            isLastCell={i === renderStrip.length - 1}
                        />
                    );
                })}
            </div>
       </div>

      {/* Overlay Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none z-10"></div>
    </div>
  );
};

// Only Piggy has visible cell separators (thick horizontal + wide column gap).
// All other themes: no separator lines.
const getCellSeparatorStyle = (theme: GameTheme, isLastCell: boolean): React.CSSProperties => {
    if (theme === 'PIGGY' && !isLastCell) {
        return { borderBottom: '3px solid rgba(0,0,0,0.6)' };
    }
    return {};
};

// 3D text-shadow per letter tier
const getLetter3DShadow = (symbol: SymbolType): string | undefined => {
    if (symbol === SymbolType.TEN || symbol === SymbolType.JACK) {
        // plain white — dark extrusion
        return '1px 1px 0 rgba(0,0,0,0.7), 2px 2px 0 rgba(0,0,0,0.55), 3px 3px 0 rgba(0,0,0,0.35), 4px 4px 8px rgba(0,0,0,0.5)';
    }
    if (symbol === SymbolType.QUEEN || symbol === SymbolType.KING) {
        // purple — dark violet extrusion
        return '1px 1px 0 #1a0040, 2px 2px 0 #25005a, 3px 3px 0 #25005a, 4px 4px 8px rgba(0,0,0,0.7)';
    }
    if (symbol === SymbolType.ACE) {
        // amber — dark orange extrusion
        return '1px 1px 0 #6b3000, 2px 2px 0 #8a3e00, 3px 3px 0 #8a3e00, 4px 4px 8px rgba(0,0,0,0.7)';
    }
    return undefined;
};

const ReelCell: React.FC<{
    symbol: SymbolType,
    blur?: boolean,
    highlight?: boolean,
    config: SymbolConfig,
    heightPercent: number,
    isScatterShowcase?: boolean,
    theme: GameTheme,
    isLastCell: boolean,
}> = ({ symbol, blur, highlight, config, heightPercent, isScatterShowcase, theme, isLastCell }) => {

    const isScatter = symbol === SymbolType.SCATTER;
    const isWild = symbol === SymbolType.WILD;
    const isLetter = [SymbolType.TEN, SymbolType.JACK, SymbolType.QUEEN, SymbolType.KING, SymbolType.ACE].includes(symbol);

    const JP_LABELS: Partial<Record<SymbolType, string>> = {
        [SymbolType.JACKPOT_MINI]:  'MINI',
        [SymbolType.JACKPOT_MINOR]: 'MINOR',
        [SymbolType.JACKPOT_MAJOR]: 'MAJOR',
        [SymbolType.JACKPOT_MEGA]:  'MEGA',
        [SymbolType.JACKPOT_GRAND]: 'GRAND',
    };
    const JP_BG_STYLES: Partial<Record<SymbolType, { border: string; glow: string; text: string; solidBg: string }>> = {
        [SymbolType.JACKPOT_MINI]:  { border: '#16a34a', glow: 'rgba(34,197,94,0.8)',  text: 'white', solidBg: '#16a34a' },
        [SymbolType.JACKPOT_MINOR]: { border: '#0891b2', glow: 'rgba(6,182,212,0.8)',  text: 'white', solidBg: '#0891b2' },
        [SymbolType.JACKPOT_MAJOR]: { border: '#7c3aed', glow: 'rgba(124,58,237,0.8)', text: 'white', solidBg: '#7c3aed' },
        [SymbolType.JACKPOT_MEGA]:  { border: '#dc2626', glow: 'rgba(220,38,38,0.8)',  text: 'white', solidBg: '#dc2626' },
        [SymbolType.JACKPOT_GRAND]: { border: '#d97706', glow: 'rgba(217,119,6,0.8)',  text: 'white', solidBg: '#d97706' },
    };
    const isJackpot = symbol in JP_LABELS;
    const jpLabel = JP_LABELS[symbol];
    const jpStyle = isJackpot ? JP_BG_STYLES[symbol] : undefined;

    let bgClasses = config?.bg || 'bg-transparent';

    if (highlight) {
        bgClasses = (config?.highlightClass || 'bg-white/20 shadow-[0_0_50px_rgba(255,215,0,0.8)] border-yellow-300/60') + ' z-20 border';
    } else if (isScatter && isScatterShowcase) {
        bgClasses = 'bg-indigo-500/50 border-indigo-300 shadow-[0_0_40px_rgba(99,102,241,0.9)] z-20';
    }
    if (isJackpot && !highlight) {
        bgClasses = '';
    }

    const activeBounce = highlight || isScatterShowcase;

    const fontSize = isWild
        ? 'text-[1.296rem] md:text-[1.746rem] lg:text-[2.187rem]'
        : isLetter
            ? 'text-[2.73rem] md:text-[3.28rem] lg:text-[4.37rem]'
            : 'text-[3.0375rem] md:text-[3.645rem] lg:text-[4.86rem]';

    const separatorStyle = getCellSeparatorStyle(theme, isLastCell);

    return (
        <div
            className={`
                w-full flex items-center justify-center relative
                ${blur ? 'blur-[2px] opacity-80' : ''}
                transition-all duration-300
            `}
            style={{
                height: `${heightPercent}%`,
                ...separatorStyle,
            }}
        >
            <div className={`
                relative h-full w-full max-w-full rounded-none
                flex items-center justify-center
                transition-all duration-300 overflow-hidden
                ${bgClasses}
            `}
            style={isJackpot && !highlight && jpStyle ? { background: jpStyle.solidBg } : undefined}
            >
                {/* Inner shine/border overlay */}
                <div className="absolute inset-0 rounded-none border border-white/10 shadow-inner pointer-events-none"></div>

                {/* Content wrapper */}
                <div className={`
                    relative flex flex-col items-center justify-center z-10 w-full h-full
                    ${activeBounce ? 'animate-bounce scale-110' : ''}
                `}>
                    {isJackpot ? (
                        <span
                            className="font-titan font-black tracking-widest select-none text-white leading-none text-center px-1"
                            style={{
                                fontSize: 'clamp(0.5rem, 1.8vw, 1rem)',
                                textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.7)',
                            }}
                        >
                            {jpLabel}
                        </span>
                    ) : (
                        <div
                            className={`
                                ${fontSize} select-none transform
                                ${config?.style || ''}
                                ${activeBounce ? 'drop-shadow-[0_0_25px_rgba(255,255,255,1)]' : ''}
                            `}
                            style={isLetter ? { textShadow: getLetter3DShadow(symbol) } : undefined}
                        >
                            {config?.icon}
                        </div>
                    )}

                    {isScatter && !blur && (
                        <div className="absolute bottom-0 w-full flex justify-center items-end pb-1 z-30">
                            <span
                                className="block font-titan text-[0.729rem] md:text-[0.972rem] font-black text-white tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)]"
                                style={{ textShadow: '0 0 4px black, 0 0 8px black' }}
                            >
                                SCATTER
                            </span>
                        </div>
                    )}
                    {isJackpot && !blur && (
                        <div
                            className="absolute inset-0 rounded-none pointer-events-none z-20"
                            style={{
                                border: `4px solid ${jpStyle?.border || '#f59e0b'}`,
                                boxShadow: `inset 0 0 14px ${jpStyle?.glow || 'rgba(245,158,11,0.5)'}, 0 0 10px ${jpStyle?.glow || 'rgba(245,158,11,0.5)'}`,
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
