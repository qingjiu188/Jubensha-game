'use client';

import type { Rank } from '@/types';
import { RANK_STYLE } from '@/lib/rank';

interface Props {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SIZE = {
  sm: { box: 'h-9 w-9', text: 'text-base' },
  md: { box: 'h-14 w-14', text: 'text-2xl' },
  lg: { box: 'h-24 w-24', text: 'text-5xl' },
};

/** F~SSS 评级徽章；SSS 带金色流光 */
export default function RankBadge({ rank, size = 'md', showLabel = true }: Props) {
  const st = RANK_STYLE[rank];
  const s = SIZE[size];
  const isSSS = rank === 'SSS';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`relative ${s.box} grid place-items-center border transition-all`}
        style={{
          borderColor: isSSS ? 'rgba(212,175,55,0.9)' : st.color,
          boxShadow: `0 0 12px ${st.glow}, inset 0 0 18px rgba(0,0,0,0.65)`,
          background: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.06), rgba(0,0,0,0.75))',
        }}
      >
        {/* 徽章内的四角刻痕 */}
        <span className="absolute left-1 top-1 h-1.5 w-1.5 border-l border-t" style={{ borderColor: st.color }} />
        <span className="absolute right-1 top-1 h-1.5 w-1.5 border-r border-t" style={{ borderColor: st.color }} />
        <span className="absolute bottom-1 left-1 h-1.5 w-1.5 border-b border-l" style={{ borderColor: st.color }} />
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 border-b border-r" style={{ borderColor: st.color }} />

        <span
          className={`font-serif font-bold tracking-tight ${s.text} ${
            isSSS ? 'gold-shimmer animate-shimmer' : ''
          }`}
          style={!isSSS ? { color: st.color, textShadow: `0 0 14px ${st.glow}` } : undefined}
        >
          {rank}
        </span>
      </div>
      {showLabel && (
        <span className="text-[10px] tracking-[0.3em]" style={{ color: isSSS ? '#d4af37' : st.color }}>
          {st.label}
        </span>
      )}
    </div>
  );
}
