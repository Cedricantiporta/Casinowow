import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { formatK } from '../constants';
import { audioService } from '../services/audioService';

export interface AnimatedBalanceHandle {
    // Count the displayed coin total from `from` to `to`, with the glow + coin
    // ticks. `onDone` fires once the count finishes (used by the welcome gift to
    // then credit the balance and navigate).
    animate: (from: number, to: number, durationMs?: number, onDone?: () => void) => void;
}

// The topbar coins pill, isolated from App so its count-up animation (~20 state
// updates per win, 60fps for the welcome gift) re-renders only this leaf instead
// of the entire ~8000-line App tree — a major device-heat reduction. App drives
// it imperatively via a ref; between animations it just shows the real balance.
export const AnimatedBalance = forwardRef<AnimatedBalanceHandle, { balance: number }>(({ balance }, ref) => {
    const [display, setDisplay] = useState<number | null>(null);
    const [glow, setGlow] = useState(false);
    const ivRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useImperativeHandle(ref, () => ({
        animate(from, to, durationMs = 1000, onDone) {
            if (ivRef.current) clearInterval(ivRef.current);
            setGlow(true);
            setDisplay(from);
            const startT = Date.now();
            let lastTick = 0;
            ivRef.current = setInterval(() => {
                const elapsed = Date.now() - startT;
                if (elapsed >= durationMs) {
                    clearInterval(ivRef.current!);
                    ivRef.current = null;
                    setDisplay(null);
                    setGlow(false);
                    onDone?.();
                    return;
                }
                const p = 1 - Math.pow(1 - elapsed / durationMs, 2);
                setDisplay(Math.round(from + (to - from) * p));
                const spd = 1 + p * 1.5;
                if (elapsed - lastTick >= Math.max(80, 160 / spd)) {
                    audioService.playCoinTick(spd);
                    lastTick = elapsed;
                }
            }, 50);
        },
    }), []);

    useEffect(() => () => { if (ivRef.current) clearInterval(ivRef.current); }, []);

    const shown = display !== null ? display : balance;
    return (
        <div className="currency-pill flex items-center gap-1 flex-1"
            style={{ overflow: 'visible', minWidth: '130px', maxWidth: 'none', ...(glow ? { boxShadow: '0 0 10px 2px rgba(255,220,0,0.6)', transition: 'box-shadow 0.2s' } : {}) }}>
            <img src="/new_coinicon.png" alt="" style={{ width: 30, height: 30, objectFit: 'contain', flexShrink: 0, marginLeft: '-6px' }} />
            <span className="num flex-1" style={{ paddingRight: '4px' }}>{formatK(shown)}</span>
        </div>
    );
});
