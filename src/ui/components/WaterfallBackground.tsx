import { useState } from "react";

interface WaterfallBackgroundProps {
  items: string[];
  enabled?: boolean;
}

const COLUMN_COUNT = 6;

// Shuffle function
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

interface Column {
  id: number;
  items: string[];
  speed: number;
  delay: number;
}

export function WaterfallBackground({ items, enabled = true }: WaterfallBackgroundProps) {
  // Generate columns with randomized content and speeds
  // We use a state initializer to ensure this only runs once and stays stable
  const [columns] = useState<Column[]>(() => {
    return Array.from({ length: COLUMN_COUNT }).map((_, i) => ({
      id: i,
      items: shuffle([...items, ...items]),
      speed: 40 + Math.random() * 40, // Random speed between 40s and 80s
      delay: -Math.random() * 40, // Random start offset
    }));
  });

  if (!enabled || columns.length === 0 || items.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-[0.12]">
      <style>
        {`
          @keyframes waterfall-scroll {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
        `}
      </style>

      {/* Gradient Masks */}
      <div className="absolute inset-0 z-10 bg-gradient-to-b from-surface-cream via-transparent to-surface-cream" />
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-surface-cream to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-surface-cream to-transparent z-10" />

      <div className="flex justify-between w-full h-[200%] -mt-10">
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex flex-col items-center gap-8 py-4"
            style={{
              animation: `waterfall-scroll ${col.speed}s linear infinite`,
              animationDelay: `${col.delay}s`,
              willChange: 'transform',
            }}
          >
            {/* Render items twice to ensure seamless loop */}
            {[...col.items, ...col.items].map((item, idx) => (
              <div
                key={`${col.id}-${idx}`}
                className="text-xl font-bold whitespace-nowrap text-ink-900 tracking-wider font-serif"
                style={{
                  opacity: Math.random() * 0.5 + 0.5, // Subtle opacity variation per item
                }}
              >
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
