import { useMemo } from 'react';

const ShimmerBlock = ({ className }: { className?: string }) => {
    const prefersReducedMotion = useMemo(() =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        []
    );

    return (
        <div className={`overflow-hidden bg-ink-900/10 relative ${className}`}>
            {!prefersReducedMotion && (
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ink-900/30 to-transparent animate-shimmer" />
            )}
        </div>
    );
};

export const SkeletonLoader = () => {
    return (
        <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto py-6 animate-in fade-in duration-300">
            {/* Mock User Message */}
            <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-surface-secondary">
                    <ShimmerBlock className="h-4 w-48 rounded" />
                </div>
            </div>

            {/* Mock Agent Message */}
            <div className="flex gap-4">
                <ShimmerBlock className="h-8 w-8 rounded-lg flex-shrink-0" />
                <div className="flex flex-col gap-3 flex-1 pt-1">
                    <ShimmerBlock className="h-4 w-32 rounded" />
                    <div className="space-y-2">
                        <ShimmerBlock className="h-3 w-full rounded" />
                        <ShimmerBlock className="h-3 w-5/6 rounded" />
                        <ShimmerBlock className="h-3 w-4/6 rounded" />
                    </div>
                </div>
            </div>

            {/* Mock User Message */}
            <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-5 py-3.5 bg-surface-secondary">
                    <ShimmerBlock className="h-4 w-64 rounded" />
                </div>
            </div>

            {/* Mock Agent Message */}
            <div className="flex gap-4">
                <ShimmerBlock className="h-8 w-8 rounded-lg flex-shrink-0" />
                <div className="flex flex-col gap-3 flex-1 pt-1">
                    <ShimmerBlock className="h-4 w-24 rounded" />
                    <div className="space-y-2">
                        <ShimmerBlock className="h-3 w-full rounded" />
                        <ShimmerBlock className="h-3 w-11/12 rounded" />
                        <ShimmerBlock className="h-3 w-3/4 rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
};
