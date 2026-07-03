/** @type {import('tailwindcss').Config} */
// Ported from the former inline `tailwind.config` that the CDN build read at
// runtime. Building Tailwind at compile time (via postcss) instead of the CDN
// removes the JIT MutationObserver that recompiled CSS on every DOM change —
// the main sustained-CPU/heat source during spins.
export default {
  // constants.ts stores slot gradient/color classes as string data (GAMES_CONFIG
  // `color`, reward-chip colors, etc.) that only appear via template literals at
  // runtime — it MUST be scanned or those utilities get purged.
  content: ['./index.html', './index.tsx', './App.tsx', './constants.ts', './components/**/*.{ts,tsx}', './services/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['"Nunito"', 'sans-serif'],
        'display': ['"Nunito"', 'sans-serif'],
        'body': ['"Nunito"', 'sans-serif'],
        'heavy': ['"Titan One"', 'cursive'],
        'clean': ['"Nunito"', 'sans-serif'],
        'nunito': ['"Nunito"', 'sans-serif'],
        'titan': ['"Titan One"', 'cursive'],
        'luckiest': ['"Luckiest Guy"', 'cursive'],
        'neon':       ['"Orbitron"', 'sans-serif'],
        'egypt':      ['"Cinzel Decorative"', 'serif'],
        'dragon':     ['"Germania One"', 'cursive'],
        'pirate':     ['"Pirata One"', 'cursive'],
        'space':      ['"Audiowide"', 'sans-serif'],
        'candy':      ['"Fredoka"', 'cursive'],
        'jungle':     ['"Boogaloo"', 'cursive'],
        'underwater': ['"Exo 2"', 'sans-serif'],
        'western':    ['"Rye"', 'cursive'],
        'samurai':    ['"Noto Serif JP"', 'serif'],
        'piggy':      ['"Bubblegum Sans"', 'cursive'],
        'tanker':     ['"Tanker"', 'cursive'],
      },
      colors: {
        gold: {
          100: '#FFF9C4',
          300: '#FFF176',
          500: '#FFD700',
          600: '#FBC02D',
          700: '#FFA000',
          900: '#FF6F00',
        },
        casino: {
          bg: '#120024',
          panel: '#2A0A45',
        },
        magma: {
          bg: '#240000',
          panel: '#450a0a',
          accent: '#f59e0b',
        },
      },
      backgroundImage: {
        'purple-lustre': 'radial-gradient(circle at 50% 0%, #7c3aed 0%, #2e1065 100%)',
        'magma-lustre': 'radial-gradient(circle at 50% 0%, #ef4444 0%, #450a0a 100%)',
      },
      animation: {
        'spin-blur': 'spinReel 0.3s linear infinite',
        'bounce-land': 'bounceLand 0.4s ease-out forwards',
        'bounce-sm': 'bounceSm 1s ease-in-out infinite',
        'pop-in': 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'shake': 'shake 0.4s ease',
        'coin-shower': 'coinShower 1s ease-out forwards',
        'shine': 'shine 1s linear infinite',
        'drop-in': 'dropIn 0.45s cubic-bezier(0.2, 1.2, 0.5, 1) forwards',
        'dissolve-out': 'dissolveOut 0.32s ease-in forwards',
        'pot-shake': 'potShake 0.5s ease-in-out infinite',
        'vibrate': 'vibrate 0.08s linear infinite',
        'coin-absorb': 'coinAbsorb 0.55s ease-in forwards',
        'reel-out': 'reelOut 0.9s ease-in forwards',
        'reel-in': 'reelIn 1.1s cubic-bezier(0.2,1.2,0.4,1) forwards',
        'candy-expand': 'candyExpand 0.55s cubic-bezier(0.2,1.2,0.4,1) forwards',
        'btn-shine': 'btnShine 4s ease-in-out infinite',
        'piggy-shake': 'piggyShake 0.8s ease-in-out',
        'piggy-shake-loop': 'piggyShakeLoop 10s ease-in-out infinite',
        'scatter-shake': 'scatterShake 0.18s linear infinite',
        'event-glow': 'eventGlow 2s ease-in-out infinite',
        'event-pulse': 'eventTextPulse 2s ease-in-out infinite',
        'event-shine': 'eventShine 3s ease-in-out infinite',
        'xp-bar-shine': 'xpBarShine 5s ease-in-out infinite',
        'collect-glow': 'collectGlow 1.8s ease-in-out infinite',
        'collect-bounce': 'collectBounce 4s ease-in-out infinite',
      },
      keyframes: {
        spinReel: {
          '0%': { transform: 'translateY(-50%)' },
          '100%': { transform: 'translateY(0%)' },
        },
        bounceLand: {
          '0%': { transform: 'translateY(-20px)' },
          '60%': { transform: 'translateY(10px)' },
          '100%': { transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        coinShower: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(300px) rotate(360deg)', opacity: '0' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
          '100%': { transform: 'translateX(200%) skewX(-15deg)' },
        },
        bounceSm: {
          '0%, 100%': { transform: 'scale(1.04)', animationTimingFunction: 'ease-in-out' },
          '50%': { transform: 'scale(0.97)', animationTimingFunction: 'ease-in-out' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        dropIn: {
          '0%': { transform: 'translateY(-110%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        dissolveOut: {
          '0%': { transform: 'scale(1)', opacity: '1', filter: 'brightness(1)' },
          '40%': { transform: 'scale(1.2)', opacity: '0.8', filter: 'brightness(2.5)' },
          '100%': { transform: 'scale(0.1)', opacity: '0', filter: 'brightness(0.3)' },
        },
        potWiggle: {
          '0%,100%': { transform: 'rotate(-8deg) scale(1.05)' },
          '25%':     { transform: 'rotate(8deg) scale(1.1)' },
          '50%':     { transform: 'rotate(-6deg) scale(1.08)' },
          '75%':     { transform: 'rotate(6deg) scale(1.12)' },
        },
        potShake: {
          '0%,100%': { transform: 'translateX(0) rotate(0deg)' },
          '15%':     { transform: 'translateX(-5px) rotate(-4deg)' },
          '30%':     { transform: 'translateX(5px) rotate(4deg)' },
          '45%':     { transform: 'translateX(-4px) rotate(-3deg)' },
          '60%':     { transform: 'translateX(4px) rotate(3deg)' },
          '75%':     { transform: 'translateX(-2px) rotate(-2deg)' },
        },
        vibrate: {
          '0%,100%': { transform: 'translate(0,0) rotate(0deg)' },
          '10%':     { transform: 'translate(-2px,-1px) rotate(-2deg)' },
          '20%':     { transform: 'translate(2px,1px) rotate(2deg)' },
          '30%':     { transform: 'translate(-2px,1px) rotate(-1deg)' },
          '40%':     { transform: 'translate(2px,-1px) rotate(1deg)' },
          '50%':     { transform: 'translate(-1px,-2px) rotate(-2deg)' },
          '60%':     { transform: 'translate(1px,2px) rotate(2deg)' },
          '70%':     { transform: 'translate(-2px,1px) rotate(-1deg)' },
          '80%':     { transform: 'translate(2px,-1px) rotate(1deg)' },
          '90%':     { transform: 'translate(-1px,0px) rotate(0deg)' },
        },
        coinAbsorb: {
          '0%':   { transform: 'translate(0,0) scale(1)', opacity: '1' },
          '60%':  { transform: 'translate(8px,-6px) scale(0.5)', opacity: '0.8' },
          '100%': { transform: 'translate(12px,-10px) scale(0)', opacity: '0' },
        },
        reelOut: {
          '0%':   { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.88)' },
        },
        reelIn: {
          '0%':   { opacity: '0', transform: 'scale(0.88)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        candyExpand: {
          '0%':   { transform: 'scaleY(0.001)', opacity: '0.5' },
          '55%':  { opacity: '1' },
          '100%': { transform: 'scaleY(1)', opacity: '1' },
        },
        scatterShake: {
          '0%,100%': { transform: 'translate(0,0) rotate(0deg)' },
          '10%':     { transform: 'translate(-2px,-1px) rotate(-2deg)' },
          '20%':     { transform: 'translate(2px,1px) rotate(2deg)' },
          '30%':     { transform: 'translate(-2px,1px) rotate(-1deg)' },
          '40%':     { transform: 'translate(2px,-1px) rotate(1deg)' },
          '50%':     { transform: 'translate(-1px,-2px) rotate(-2deg)' },
          '60%':     { transform: 'translate(1px,2px) rotate(2deg)' },
          '70%':     { transform: 'translate(-2px,1px) rotate(-1deg)' },
          '80%':     { transform: 'translate(2px,-1px) rotate(1deg)' },
          '90%':     { transform: 'translate(-1px,0px) rotate(0deg)' },
        },
      },
    },
  },
  plugins: [],
}
