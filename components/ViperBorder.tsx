import React, { useRef, useEffect } from 'react';

export type ViperTheme = 'blue' | 'gold';

// Per-theme color stops: [tail, mid, head] for each pass
const THEMES: Record<ViperTheme, {
    glowTail: string; glowHead: string;
    bodyTail: string; bodyHead: string;
    coreTail: string; coreHead: string;
    shadowHead: string;
}> = {
    gold: {
        glowTail:  '#7a4400', glowHead:  '#ffa500',
        bodyTail:  '#8a5500', bodyHead:  '#ffe040',
        coreTail:  '#b07800', coreHead:  '#fff5c0',
        shadowHead: '#ffc830',
    },
    blue: {
        glowTail:  '#001088', glowHead:  '#00aaff',
        bodyTail:  '#0026cc', bodyHead:  '#80e8ff',
        coreTail:  '#003acc', coreHead:  '#ffffff',
        shadowHead: '#00ccff',
    },
};

// ── Shared animation clock ───────────────────────────────────────────────
let clockT = 0;
let rafId: number | null = null;
const drawers = new Set<() => void>();
const SPEED = 0.024;

function tick() {
    clockT = (clockT + SPEED) % 1;
    drawers.forEach(d => d());
    rafId = requestAnimationFrame(tick);
}
function addDrawer(fn: () => void) {
    drawers.add(fn);
    if (rafId == null) rafId = requestAnimationFrame(tick);
}
function removeDrawer(fn: () => void) {
    drawers.delete(fn);
    if (drawers.size === 0 && rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
}

const EXT = 12;

export const ViperBorder: React.FC<{ theme: ViperTheme; animate?: boolean }> = ({ theme, animate = true }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const themeRef = useRef(theme);
    themeRef.current = theme;

    useEffect(() => {
        const canvas = canvasRef.current;
        const parent = canvas?.parentElement;
        if (!canvas || !parent) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let cw = 0, ch = 0, dpr = 1;

        const resize = () => {
            const pw = parent.offsetWidth, ph = parent.offsetHeight;
            if (pw === 0) return;
            dpr = Math.min(1.5, window.devicePixelRatio || 1);
            cw = pw + EXT * 2;
            ch = ph + EXT * 2;
            canvas.width = Math.max(1, Math.round(cw * dpr));
            canvas.height = Math.max(1, Math.round(ch * dpr));
            canvas.style.width = `${cw}px`;
            canvas.style.height = `${ch}px`;
        };

        const pointOnRect = (t: number, x0: number, y0: number, w: number, h: number) => {
            const perim = 2 * (w + h);
            let d = (((t % 1) + 1) % 1) * perim;
            if (d < w) return { x: x0 + d, y: y0 };
            d -= w;
            if (d < h) return { x: x0 + w, y: y0 + d };
            d -= h;
            if (d < w) return { x: x0 + w - d, y: y0 + h };
            d -= w;
            return { x: x0, y: y0 + h - d };
        };

        const draw = () => {
            if (cw === 0) { resize(); if (cw === 0) return; }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, cw, ch);

            const colors = THEMES[themeRef.current];
            const cellW = cw - EXT * 2, cellH = ch - EXT * 2;
            const inset = Math.max(1.5, Math.min(cellW, cellH) * 0.03);
            const x0 = EXT + inset, y0 = EXT + inset;
            const w = cellW - inset * 2, h = cellH - inset * 2;
            const scale = Math.min(1.0, Math.min(w, h) / 130);
            const snakeLen = 0.40;  // < 0.5 leaves a gap between the two snakes so the rotation is visible
            const tNow = animate ? clockT : 0;
            const heads = [tNow, (tNow + 0.5) % 1];
            const steps = 24; // points along each snake — stroked as ONE continuous line (no per-segment caps)

            // Trace a snake as a single continuous path, then stroke once per pass.
            // Stroking the whole polyline (instead of per-segment) means round caps appear
            // only at the two ends — no beaded "dots" along the line — and it's far cheaper.
            const tracePath = (head: number) => {
                ctx.beginPath();
                for (let i = 0; i <= steps; i++) {
                    const ph = head - (1 - i / steps) * snakeLen;
                    const pp = pointOnRect(ph, x0, y0, w, h);
                    if (i === 0) ctx.moveTo(pp.x, pp.y);
                    else ctx.lineTo(pp.x, pp.y);
                }
            };

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (const head of heads) {
                // PASS 1 — soft outer glow halo (wide, low-alpha, additive blend fakes the bloom)
                ctx.globalCompositeOperation = 'lighter';
                ctx.strokeStyle = colors.glowHead;
                ctx.lineWidth = Math.max(1.5, 10 * scale);
                ctx.globalAlpha = 0.28;
                tracePath(head);
                ctx.stroke();

                // PASS 2 — saturated colour body
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = colors.bodyHead;
                ctx.lineWidth = Math.max(0.8, 3.8 * scale);
                ctx.globalAlpha = 0.95;
                tracePath(head);
                ctx.stroke();

                // PASS 3 — bright core line riding on top
                ctx.strokeStyle = colors.coreHead;
                ctx.lineWidth = Math.max(0.5, 1.6 * scale);
                ctx.globalAlpha = 1;
                tracePath(head);
                ctx.stroke();
            }
            ctx.restore();
        };

        resize();
        const ro = new ResizeObserver(() => { resize(); if (!animate) draw(); });
        ro.observe(parent);

        if (animate) addDrawer(draw);
        else draw();

        return () => { ro.disconnect(); if (animate) removeDrawer(draw); };
    }, [animate]);

    return (
        <canvas ref={canvasRef}
            className="absolute pointer-events-none"
            style={{ left: -EXT, top: -EXT, zIndex: 26 }} />
    );
};
