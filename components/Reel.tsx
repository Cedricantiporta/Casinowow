
import React, { useEffect, useState, useRef } from 'react';
import { SymbolType, SymbolConfig, GameTheme } from '../types';
import { WEIGHTS, NEON_WEIGHTS, GET_SYMBOLS, JACKPOT_ICONS, GENERIC_JACKPOT_ICONS, THEME_JACKPOT_ICONS, FREESPIN_JACKPOT_ICONS } from '../constants';
import { GameConfig } from '../types';
import { ViperBorder, ViperTheme } from './ViperBorder';

// Border theme per slot — cool themes glow blue, warm themes glow gold.
const BLUE_BORDER_THEMES = new Set<GameTheme>(['NEON', 'PIRATE', 'ARCTIC', 'UNDERWATER', 'MMORPG', 'SPACE'] as GameTheme[]);
export const borderThemeFor = (theme: GameTheme): ViperTheme => (BLUE_BORDER_THEMES.has(theme) ? 'blue' : 'gold');

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
  forcedSymbols?: SymbolType[];
  newCells?: boolean[];
  dissolving?: boolean;
  anticipation?: boolean;
  inFreeSpins?: boolean;
  instantStop?: boolean;
  beastMultiplier?: number | null;
}

// JUNGLE's scatter trigger is entirely controlled by App.tsx's grid logic (fixed,
// explicit chance, placed only at the exact center cell) — the reel's own local
// spin-blur/filler symbol generation below must never roll one independently.
const NO_SCATTER_THEMES = new Set(['PIGGY', 'LEPRECHAUN', 'JUNGLE']);
const NO_SEVEN_THEMES = new Set(['DRAGON']);

const makeRandomSymbol = (excludeScatter: boolean, neon?: boolean, excludeSeven?: boolean) => {
  let weights = neon ? NEON_WEIGHTS : WEIGHTS;
  if (excludeScatter) weights = weights.filter(w => w.type !== SymbolType.SCATTER);
  if (excludeSeven) weights = weights.filter(w => w.type !== SymbolType.SEVEN);
  let sum = weights.reduce((acc, el) => acc + el.weight, 0);
  let rand = Math.random() * sum;
  for (let w of weights) {
    rand -= w.weight;
    if (rand <= 0) return w.type;
  }
  return neon ? SymbolType.TEN : SymbolType.TEN;
};

export const Reel: React.FC<ReelProps> = ({ id, symbols = [], spinning, stopping, stopDelay, duration, onStop, winningIndices, gameConfig, isScatterShowcase, forcedSymbols, newCells, dissolving, anticipation, inFreeSpins, instantStop, beastMultiplier }) => {
  const [strip, setStrip] = useState<SymbolType[]>([]);
  const [landing, setLanding] = useState(false);
  const SYMBOL_CONFIGS = GET_SYMBOLS(gameConfig.theme);
  const VISIBLE_ROWS = gameConfig.rows;
  const noScatter = NO_SCATTER_THEMES.has(gameConfig.theme);
  const noSeven = NO_SEVEN_THEMES.has(gameConfig.theme);
  const isNeon = gameConfig.theme === 'NEON';
  const getRandSym = () => makeRandomSymbol(noScatter, isNeon, noSeven);

  // Initialize strip on mount or config change
  useEffect(() => {
    setStrip(Array(VISIBLE_ROWS).fill(null).map(getRandSym));
  }, [VISIBLE_ROWS, noScatter]); // eslint-disable-line

  // Effect 1: Handle Spin Start
  useEffect(() => {
    if (spinning && !stopping) {
      setLanding(false);
      setStrip(Array(VISIBLE_ROWS * 4).fill(null).map(getRandSym));
    }
  }, [spinning, stopping, VISIBLE_ROWS, noScatter]); // eslint-disable-line

  // Effect 2: Handle Stop Trigger
  useEffect(() => {
    if (stopping && !landing) {
        // stopDelay already includes any anticipation extension baked in by the parent
        const timer = setTimeout(() => {
            setLanding(true);

            // Set final strip: Final symbols on top + Random symbols on bottom
            // (spin animates top-to-bottom, so finals must be at the top)
            const finalStrip = [
                ...symbols,
                ...Array(VISIBLE_ROWS).fill(null).map(getRandSym),
            ];
            setStrip(finalStrip);
        }, stopDelay);
        return () => clearTimeout(timer);
    }
  }, [stopping, landing, stopDelay, symbols, VISIBLE_ROWS]);

  // Effect 3: Handle Animation Completion (Signal Parent)
  useEffect(() => {
      if (stopping && landing) {
          const delay = instantStop ? 0 : (duration > 800 ? 400 : 200);
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
      translateY = '0%'; // finals are at top of strip; show top rows
  }
  
  // Cascade display mode: bypass animation, show symbols directly
  if (forcedSymbols && forcedSymbols.length > 0) {
      return (
          <div
              className={`relative flex-1 overflow-hidden ${gameConfig.reelBg} min-w-0`}
              style={{ aspectRatio: `1 / ${gameConfig.theme === 'NEON' ? 2 : gameConfig.rows}` }}
          >
              <div className="w-full h-full flex flex-col">
                  {forcedSymbols.map((s, i) => {
                      const isWinner = winningIndices.includes(i);
                      const isNew = newCells?.[i] ?? false;
                      return (
                          <ReelCell
                              key={i}
                              symbol={s}
                              config={SYMBOL_CONFIGS[s]}
                              blur={false}
                              highlight={isWinner}
                              isScatterShowcase={false}
                              heightPercent={100 / gameConfig.rows}
                              theme={gameConfig.theme}
                              isLastCell={i === forcedSymbols.length - 1}
                              isNewCell={isNew}
                              dissolving={dissolving}
                              gameRows={gameConfig.rows}
                              gameReels={gameConfig.reels}
                              inFreeSpins={inFreeSpins}
                              beastMultiplier={beastMultiplier}
                          />
                      );
                  })}
              </div>
          </div>
      );
  }

  return (
    <div
        className={`relative flex-1 overflow-hidden ${isScatterShowcase ? 'z-10' : ''} ${gameConfig.reelBg} min-w-0`}
        style={{ aspectRatio: `1 / ${gameConfig.theme === 'NEON' ? 2 : gameConfig.rows}` }}
    >
       {/* Anticipation viper border — animated two-snake glow */}
       {anticipation && <ViperBorder theme={borderThemeFor(gameConfig.theme)} animate />}
       {/* Scroll Wrapper - Static Position Adjustments */}
       <div 
            className="w-full absolute top-0 left-0 will-change-transform transition-transform duration-300 ease-out"
            style={{
                height: `${containerHeightPercent}%`, // Force container to be tall enough to hold all items
                transform: (!landing && spinning) ? 'none' : `translateY(${translateY})`, // Static scroll to result
            }}
       >
            {/* Animation Wrapper - Jiggle/Spin Effects.
                Blur is applied ONCE here during spin (cheap) instead of per-cell. */}
            <div className={`
                w-full h-full flex flex-col
                ${(!landing && spinning) ? 'animate-spin-blur blur-[2px] opacity-80' : ''}
                ${(landing) ? 'animate-bounce-land' : ''}
            `}>
                {renderStrip.map((s, i) => {
                    // When landed, the final symbols occupy the TOP VISIBLE_ROWS rows of the
                    // strip (Effect 2 places finals first), and translateY(0%) shows that top
                    // window. So the on-screen row index is simply i, for i < VISIBLE_ROWS.
                    const inVisibleWindow = landing && i < VISIBLE_ROWS;
                    const visibleRowIndex = i;
                    const isWinner = inVisibleWindow && winningIndices.includes(visibleRowIndex);
                    const isShowcase = inVisibleWindow && isScatterShowcase && s === SymbolType.SCATTER;

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
                            dissolving={dissolving}
                            gameRows={gameConfig.rows}
                            gameReels={gameConfig.reels}
                            inFreeSpins={inFreeSpins}
                            beastMultiplier={beastMultiplier}
                        />
                    );
                })}
            </div>
       </div>

    </div>
  );
};

// No cell separators on any theme.
const getCellSeparatorStyle = (_theme: GameTheme, _isLastCell: boolean): React.CSSProperties => {
    return {};
};

// 3D text-shadow per letter tier
const getLetter3DShadow = (symbol: SymbolType, theme?: GameTheme): string => {
    if (theme === 'EGYPT') {
        // Deep layered gold 3D to match the pharaoh artwork style
        return '1px 1px 0 #8b5000, 2px 2px 0 #6b3a00, 3px 3px 0 #4a2700, 4px 4px 10px rgba(0,0,0,0.95), 0 0 18px rgba(220,150,0,0.45)';
    }
    if (symbol === SymbolType.TEN || symbol === SymbolType.JACK) {
        return '1px 1px 0 rgba(0,0,0,0.8), 2px 2px 0 rgba(0,0,0,0.6), 3px 3px 0 rgba(0,0,0,0.4), 4px 4px 8px rgba(0,0,0,0.5)';
    }
    if (symbol === SymbolType.QUEEN || symbol === SymbolType.KING) {
        return '1px 1px 0 #2d0060, 2px 2px 0 #1a003a, 3px 3px 0 #0d001e, 4px 4px 8px rgba(0,0,0,0.8)';
    }
    if (symbol === SymbolType.ACE) {
        return '1px 1px 0 #7c3800, 2px 2px 0 #4a2000, 3px 3px 0 #2a1000, 4px 4px 8px rgba(0,0,0,0.8)';
    }
    return '';
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
    isNewCell?: boolean,
    dissolving?: boolean,
    gameRows?: number,
    gameReels?: number,
    inFreeSpins?: boolean,
    beastMultiplier?: number | null,
}> = React.memo(({ symbol, blur, highlight, config, heightPercent, isScatterShowcase, theme, isLastCell, isNewCell, dissolving, gameRows = 3, gameReels = 6, inFreeSpins, beastMultiplier }) => {

    const isScatter = symbol === SymbolType.SCATTER;
    const isWild = symbol === SymbolType.WILD;
    const isImageIcon = typeof config?.icon === 'string' && config.icon.startsWith('/');
    const isLetter = !isImageIcon && theme !== 'NEON' && [SymbolType.TEN, SymbolType.JACK, SymbolType.QUEEN, SymbolType.KING, SymbolType.ACE].includes(symbol);


    const JP_TYPES = new Set<SymbolType>([
        SymbolType.JACKPOT_MINI, SymbolType.JACKPOT_MINOR, SymbolType.JACKPOT_MAJOR,
        SymbolType.JACKPOT_MEGA, SymbolType.JACKPOT_GRAND,
    ]);
    const isJackpot = JP_TYPES.has(symbol);

    // All cells use black bg; highlight/showcase add glow on top
    let bgClasses = 'bg-black';

    if (highlight) {
        bgClasses = 'bg-black z-20';
    } else if (isScatter && isScatterShowcase) {
        bgClasses = 'bg-black border-2 border-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.7)] z-20';
    }

    // The scatter-trigger showcase animation runs for at most 5 seconds, even if
    // the showcase state lingers while the bonus intro plays out.
    const [showcaseExpired, setShowcaseExpired] = useState(false);
    useEffect(() => {
        if (!isScatterShowcase) { setShowcaseExpired(false); return; }
        const t = setTimeout(() => setShowcaseExpired(true), 5000);
        return () => clearTimeout(t);
    }, [isScatterShowcase]);
    const showcaseActive = isScatterShowcase && !showcaseExpired;

    const activeBounce = highlight || (showcaseActive && !isScatter);
    const activeScatterShake = isScatter && showcaseActive;

    // Scale icons proportionally — cells shrink when more rows or more reels fill the same container
    const cellScale = Math.min(1.0, 3.0 / gameRows, 6.0 / gameReels);
    const emojiFontSize  = `${(3.0375  * cellScale).toFixed(3)}rem`;
    const letterFontSize = `${(2.73    * cellScale).toFixed(3)}rem`;
    const wildFontSize   = `${(1.296   * cellScale).toFixed(3)}rem`;
    const scatterLabelFs = `${(0.729   * cellScale).toFixed(3)}rem`;
    const iconFontSize   = isWild ? wildFontSize : isLetter ? letterFontSize : emojiFontSize;

    const separatorStyle = getCellSeparatorStyle(theme, isLastCell);

    return (
        <div
            className={`
                w-full flex items-center justify-center relative bg-black
                ${isNewCell ? 'animate-drop-in' : ''}
                ${highlight && dissolving ? 'animate-dissolve-out' : ''}
                ${!isNewCell && !(highlight && dissolving) ? 'transition-transform duration-300' : ''}
            `}
            style={{
                height: `${heightPercent}%`,
                ...separatorStyle,
            }}
        >
            <div className={`
                relative h-full w-full max-w-full rounded-none
                flex items-center justify-center
                overflow-visible
                ${bgClasses}
            `}
            style={undefined}
            >
                {/* Content wrapper */}
                <div className={`
                    relative flex flex-col items-center justify-center z-10 w-full h-full
                    ${activeScatterShake ? 'animate-scatter-shake' : activeBounce ? 'animate-bounce-sm' : ''}
                `}>
                    {isJackpot ? (
                        ((inFreeSpins && FREESPIN_JACKPOT_ICONS[symbol]) || THEME_JACKPOT_ICONS[theme]?.[symbol] || GENERIC_JACKPOT_ICONS[symbol] || JACKPOT_ICONS[theme]) ? (
                            <img
                                src={(inFreeSpins && FREESPIN_JACKPOT_ICONS[symbol]) || THEME_JACKPOT_ICONS[theme]?.[symbol] || GENERIC_JACKPOT_ICONS[symbol] || JACKPOT_ICONS[theme]}
                                alt=""
                                className="w-full h-full object-contain pointer-events-none select-none"
                            />
                        ) : null
                    ) : isImageIcon ? (
                        <img
                            src={config.icon}
                            alt=""
                            className={`select-none object-contain pointer-events-none${highlight && theme === 'PIGGY' ? ' animate-pulse' : ''}`}
                            style={{
                                width:    `${85 * cellScale * (config.imageScale ?? 1)}%`,
                                height:   `${85 * cellScale * (config.imageScale ?? 1)}%`,
                                ...(theme === 'UNDERWATER' || (theme === 'PIGGY' && isScatter) ? { position: 'absolute', width: `${85 * cellScale * (config.imageScale ?? 1)}%`, height: `${85 * cellScale * (config.imageScale ?? 1)}%`, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', ...(theme === 'PIGGY' ? { zIndex: 20 } : {}) } : {}),
                            }}
                        />
                    ) : (
                        <div
                            className={`select-none transform ${config?.style || ''}`}
                            style={{
                                fontSize: iconFontSize,
                                ...(isLetter ? { textShadow: getLetter3DShadow(symbol, theme), color: theme === 'EGYPT' ? '#fbbf24' : '#ffffff' } : undefined),
                            }}
                        >
                            {config?.icon}
                        </div>
                    )}

                    {isScatter && !blur && (!isImageIcon || theme === 'NEON' || theme === 'CANDY') && (
                        <div className="absolute bottom-0 w-full flex justify-center items-end pb-1 z-30">
                            <span
                                className="block font-titan font-black text-white tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)]"
                                style={{ fontSize: scatterLabelFs, textShadow: '0 0 4px black, 0 0 8px black' }}
                            >
                                BONUS
                            </span>
                        </div>
                    )}
                    {isWild && !blur && !isImageIcon && (
                        <div className="absolute bottom-0 w-full flex justify-center items-end pb-1 z-30">
                            <span
                                className="block font-titan font-black text-white tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)]"
                                style={{ fontSize: scatterLabelFs, textShadow: '0 0 4px black, 0 0 8px black' }}
                            >
                                WILD
                            </span>
                        </div>
                    )}
                    {theme === 'BEAST' && isWild && !blur && inFreeSpins && !!beastMultiplier && (
                        <div className="absolute top-0 w-full flex justify-center items-start pt-0.5 z-30 pointer-events-none">
                            <span
                                className="block leading-none"
                                style={{ fontSize: `${2.7 * cellScale}rem`, fontFamily: "'Arial Black', 'Impact', sans-serif", fontWeight: 900, color: '#fde047', textShadow: '0 0 8px #000, 0 0 16px #000, 2px 2px 0 #000, -1px -1px 0 #000', letterSpacing: '-0.02em' }}
                            >{beastMultiplier}X</span>
                        </div>
                    )}
                    {theme === 'PIGGY' && symbol === SymbolType.COIN && !blur && inFreeSpins && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
                            <span
                                className="block leading-none"
                                style={{ fontSize: `${2.6 * cellScale}rem`, fontFamily: "'Arial Black', 'Impact', sans-serif", fontWeight: 900, color: '#fde047', textShadow: '0 0 6px #000, 0 0 12px #000, 2px 2px 0 #000, -1px -1px 0 #000', letterSpacing: '-0.02em' }}
                            >2X</span>
                            <span
                                className="block tracking-widest"
                                style={{ fontSize: `${0.7 * cellScale}rem`, fontFamily: "'Arial Black', 'Impact', sans-serif", fontWeight: 900, color: '#fff', textShadow: '0 0 4px black, 0 0 8px black' }}
                            >WILD</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
