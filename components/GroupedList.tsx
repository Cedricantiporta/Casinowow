import React from 'react';

// Inbox-style grouped list: one continuous rounded container with thin inset
// separators between rows (not full-width, not per-row cards) instead of a
// stack of separately-rounded/shadowed bars.
export function GroupedList<T>({ items, keyFn, renderRow, emptyText, className, rowBackground, rowBoxShadow, rowRef }: {
    items: T[];
    keyFn: (item: T, i: number) => string;
    renderRow: (item: T, i: number) => React.ReactNode;
    emptyText?: string;
    className?: string;
    rowBackground?: (item: T, i: number) => string | undefined;
    rowBoxShadow?: (item: T, i: number) => string | undefined;
    rowRef?: (item: T, i: number) => React.Ref<HTMLDivElement> | undefined;
}) {
    if (items.length === 0) {
        return <div className="flex-1 flex items-center justify-center text-white/30 text-sm font-bold py-8">{emptyText || 'Nothing here'}</div>;
    }
    return (
        <div className={`flex flex-col ${className || ''}`}>
            {items.map((item, i) => (
                <React.Fragment key={keyFn(item, i)}>
                    {i > 0 && <div style={{ height: 1, marginLeft: 16, marginRight: 16, background: 'rgba(255,255,255,0.08)' }} />}
                    <div ref={rowRef?.(item, i)} style={{
                        background: rowBackground?.(item, i) ?? 'rgba(0,0,0,0.22)',
                        boxShadow: rowBoxShadow?.(item, i) ?? 'inset 0 2px 6px rgba(0,0,0,0.45)',
                        borderRadius: items.length === 1 ? 16 : i === 0 ? '16px 16px 0 0' : i === items.length - 1 ? '0 0 16px 16px' : 0,
                    }}>
                        {renderRow(item, i)}
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
}
