import React, { useRef, useEffect } from 'react';

export type ViperTheme = 'blue' | 'gold';

const THEMES: Record<ViperTheme, { core: string; mid: string; outer: string }> = {
    blue: { core: '#ffffff', mid: '#00e1ff', outer: '#0026ff' },
    gold: { core: '#ffffff', mid: '#ffbe1a', outer: '#ff4c00' },
};

// ── Shared animation clock ───────────────────────────────────────────────
// A single requestAnimationFrame loop drives every animated border on screen.
// Each ViperBorder registers a draw callback; the loop advances one phase and
// repaints all of them per frame. When none are active, the loop stops.
let clockT = 0;
let rafId: number | null = null;
const drawers = new Set<() => void>();
const SPEED = 0.045; // phase advanced per frame (matches reference engine)

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

const EXT = 12; // px the canvas extends past the cell so the outer glow can bleed out

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
            // offsetWidth/Height give the layout size in the parent's own coordinate
            // space — unaffected by the ancestor `transform: scale(mobileScale)` that
            // getBoundingClientRect would otherwise bake in (which mis-sizes the canvas).
            const pw = parent.offsetWidth, ph = parent.offsetHeight;
            if (pw === 0) return;
            dpr = Math.min(2, window.devicePixelRatio || 1);
            cw = pw + EXT * 2;
            ch = ph + EXT * 2;
            canvas.width = Math.max(1, Math.round(cw * dpr));
            canvas.height = Math.max(1, Math.round(ch * dpr));
            canvas.style.width = `${cw}px`;
            canvas.style.height = `${ch}px`;
        };

        // Point at phase t (0..1) along the rectangle perimeter, clockwise from top-left.
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
            // Inset the border inside the cell so adjacent winning cells stay
            // visually separate (the grid has no gap between cells).
            const inset = Math.max(2, Math.min(cellW, cellH) * 0.07);
            const x0 = EXT + inset, y0 = EXT + inset;
            const w = cellW - inset * 2, h = cellH - inset * 2;
            // Cap scale so the glow/line stays tight on large cells (no bleeding
            // across into neighbouring cells).
            const scale = Math.min(1.0, Math.min(w, h) / 130);
            const snakeLen = 0.46;             // each snake covers ~46% of the perimeter
            const tNow = animate ? clockT : 0;
            const heads = [tNow, (tNow + 0.5) % 1]; // two snakes, exactly opposite
            const steps = 22;

            for (const head of heads) {
                // Precompute the tapered ribbon points (tail → head).
                const pts: { x: number; y: number; p: number }[] = [];
                for (let i = 0; i <= steps; i++) {
                    const pc = i / steps;
                    const ph = head - (1 - pc) * snakeLen;
                    const pp = pointOnRect(ph, x0, y0, w, h);
                    pts.push({ x: pp.x, y: pp.y, p: pc });
                }

                // PASS 1 — wide atmospheric outer haze (only pass that uses shadowBlur,
                // which is the expensive op; keeping it to one pass keeps this cheap).
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.lineCap = 'square';
                ctx.lineJoin = 'miter';
                ctx.strokeStyle = colors.outer;
                ctx.shadowColor = colors.outer;
                ctx.shadowBlur = 11 * scale;
                for (let i = 1; i < pts.length; i++) {
                    const a = pts[i - 1], b = pts[i];
                    ctx.beginPath();
                    ctx.lineWidth = Math.max(0.5, 5.5 * scale * b.p);
                    ctx.globalAlpha = Math.pow(b.p, 1.8) * 0.7;
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
                ctx.restore();

                // PASS 2 — saturated mid flame (crisp, no shadow)
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.lineCap = 'square';
                ctx.lineJoin = 'miter';
                ctx.strokeStyle = colors.mid;
                for (let i = 1; i < pts.length; i++) {
                    const a = pts[i - 1], b = pts[i];
                    ctx.beginPath();
                    ctx.lineWidth = Math.max(0.4, 3.6 * scale * b.p);
                    ctx.globalAlpha = Math.pow(b.p, 1.2) * 0.95;
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
                ctx.restore();

                // PASS 3 — bright white laser core (crisp, no shadow)
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.lineCap = 'square';
                ctx.lineJoin = 'miter';
                ctx.strokeStyle = colors.core;
                for (let i = 1; i < pts.length; i++) {
                    const a = pts[i - 1], b = pts[i];
                    ctx.beginPath();
                    ctx.lineWidth = Math.max(0.3, 1.7 * scale * b.p);
                    ctx.globalAlpha = Math.pow(b.p, 0.6);
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
                ctx.restore();
            }
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
