'use client';

import { motion } from 'framer-motion';

interface Props {
  label: string;
  value: number;
  max?: number;
  /** 低量警戒阈值（低于则转红） */
  low?: number;
  color?: 'hp' | 'sp' | 'st' | 'toxic' | 'amber';
  showNumber?: boolean;
}

const GRADIENT: Record<string, string> = {
  hp: 'linear-gradient(90deg,#7a0000,#c41e1e 55%,#ff4d4d)',
  sp: 'linear-gradient(90deg,#0b3b2e,#00ff9d 70%,#b6ffe4)',
  st: 'linear-gradient(90deg,#3b2f08,#d4af37 70%,#fff0b8)',
  toxic: 'linear-gradient(90deg,#003b28,#00ff9d)',
  amber: 'linear-gradient(90deg,#3a2c05,#d4af37)',
};

export default function StatBar({ label, value, max = 100, low = 30, color = 'hp', showNumber = true }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const danger = pct <= low;

  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between text-[10px] tracking-[0.18em] text-muted">
        <span>{label}</span>
        {showNumber && (
          <span className={danger ? 'text-blood-bright' : 'text-chalk/70'}>
            {Math.round(value)}/{max}
          </span>
        )}
      </div>
      <div className="relative h-[6px] w-full overflow-hidden border border-hairline bg-black/60">
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{
            background: danger
              ? 'linear-gradient(90deg,#8b0000,#ff2a2a)'
              : GRADIENT[color],
            boxShadow: danger ? '0 0 10px rgba(196,30,30,0.7)' : '0 0 8px rgba(255,255,255,0.08)',
          }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        {/* 刻度纹理 */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.55) 0 1px, transparent 1px 10%)',
          }}
        />
      </div>
    </div>
  );
}
