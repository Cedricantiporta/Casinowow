import React from 'react';

// Shared geometry (both roulette wheels use the same dimensions)
export const CX = 120, CY = 120, R = 110, SZ = 240;

// ── Colour helpers ──────────────────────────────────────────────────
const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const mix = (hex: string, tr: number, tg: number, tb: number, amt: number) => {
    const [r, g, b] = parse(hex);
    const c = (a: number, t: number) => Math.round(a + (t - a) * amt);
    return `rgb(${c(r, tr)},${c(g, tg)},${c(b, tb)})`;
};
export const lighten = (hex: string, amt: number) => mix(hex, 255, 255, 255, amt);
export const darken = (hex: string, amt: number) => mix(hex, 0, 0, 0, amt);

// ── <defs>: per-wedge dome gradients + global gloss / rim / shadow ──
// Wedge gradients are centred on the wheel hub so they stay stable while spinning.
export const WheelDefs: React.FC<{ colors: string[]; idPrefix: string }> = ({ colors, idPrefix }) => (
    <defs>
        {colors.map((c, i) => (
            <radialGradient key={i} id={`${idPrefix}${i}`} cx={CX} cy={CY} r={R} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={darken(c, 0.03)} />
                <stop offset="100%" stopColor={lighten(c, 0.03)} />
            </radialGradient>
        ))}
        {/* Top specular highlight (fixed light from above) */}
        <radialGradient id={`${idPrefix}gloss`} cx={CX} cy={CY - 46} r={R * 1.05} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="68%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Edge vignette for a domed, spherical feel */}
        <radialGradient id={`${idPrefix}vig`} cx={CX} cy={CY} r={R} gradientUnits="userSpaceOnUse">
            <stop offset="58%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
        </radialGradient>
        {/* Glossy gold rim sheen */}
        <linearGradient id={`${idPrefix}rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffeaa0" />
            <stop offset="38%" stopColor="#f3c451" />
            <stop offset="68%" stopColor="#db9d2e" />
            <stop offset="100%" stopColor="#9a6a18" />
        </linearGradient>
        {/* Glossy hub sphere */}
        <radialGradient id={`${idPrefix}hub`} cx={CX - 5} cy={CY - 6} r={26} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="45%" stopColor="#f3c451" />
            <stop offset="100%" stopColor="#b07d1c" />
        </radialGradient>
    </defs>
);

// ── Thin gold rim (drawn behind the wedges), no shadow ──────────────
export const WheelRim: React.FC<{ idPrefix: string }> = ({ idPrefix }) => {
    const RIM = 9;
    return (
        <>
            {/* Gold base ring (no drop shadow) */}
            <circle cx={CX} cy={CY} r={R + RIM} fill={`url(#${idPrefix}rim)`} />
            {/* Outer rounded highlight edge */}
            <circle cx={CX} cy={CY} r={R + RIM - 1} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
            {/* Outer dark contour */}
            <circle cx={CX} cy={CY} r={R + RIM} fill="none" stroke="rgba(120,70,10,0.6)" strokeWidth={0.75} />
            {/* Recessed groove where wedges sit */}
            <circle cx={CX} cy={CY} r={R + 2} fill="#6e470f" />
            <circle cx={CX} cy={CY} r={R + 0.5} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} />
        </>
    );
};

// ── Shared "new 3D gradient" popup container styling ────────────────
// Same family as the settings / cards containers, themed per roulette.
export const containerShell = (variant: 'candy' | 'neon'): React.CSSProperties =>
    variant === 'candy'
        ? { background: 'linear-gradient(180deg,#ec4899 0%,#9d174d 18%,#500724 100%)', boxShadow: 'inset 0 1px 0 rgba(255,190,220,0.55), 0 8px 32px rgba(0,0,0,0.8)' }
        : { background: 'linear-gradient(180deg,#3b82f6 0%,#1e40af 18%,#0a1640 100%)', boxShadow: 'inset 0 1px 0 rgba(190,215,255,0.55), 0 8px 32px rgba(0,0,0,0.8)' };

// ── Glossy dome overlay (drawn on top of wedges, below labels) ──────
export const WheelGloss: React.FC<{ idPrefix: string }> = ({ idPrefix }) => (
    <>
        <circle cx={CX} cy={CY} r={R} fill={`url(#${idPrefix}vig)`} pointerEvents="none" />
        <circle cx={CX} cy={CY} r={R} fill={`url(#${idPrefix}gloss)`} pointerEvents="none" />
    </>
);
