'use client';

import {
  BatteryCharging,
  Brain,
  Compass,
  Droplets,
  Eye,
  EyeOff,
  Flame,
  Ghost,
  Hand,
  HeartPulse,
  Infinity as InfinityIcon,
  Orbit,
  Radar,
  RotateCcw,
  Scroll,
  Search,
  ShieldOff,
  Skull,
  Utensils,
  Wind,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { AbilitySnapshot } from '@/types';
import { RARITY_META, type Rarity } from '@/lib/abilities';

/* =========================================================
 * 异能徽章
 *   · 边框 / 发光颜色随稀有度变化（普通灰、稀有蓝、史诗紫、传说金）
 *   · 每个异能有专属 lucide 图标
 *   · 史诗 / 传说带持续的流光扫过效果
 * ========================================================= */

const ICONS: Record<string, LucideIcon> = {
  Eye,
  Utensils,
  Compass,
  Wind,
  ShieldOff,
  Hand,
  BatteryCharging,
  Flame,
  Search,
  Zap,
  Brain,
  HeartPulse,
  Radar,
  Droplets,
  Ghost,
  RotateCcw,
  Scroll,
  Skull,
  Orbit,
  InfinityIcon,
  EyeOff,
};

/** 异能名 → 图标（按 lib/abilities.ts 里的 icon 字段取） */
const NAME_ICON: Record<string, string> = {
  夜视: 'Eye',
  铁胃: 'Utensils',
  方向感: 'Compass',
  屏息: 'Wind',
  钝感: 'ShieldOff',
  手法灵巧: 'Hand',
  体力充沛: 'BatteryCharging',
  血性: 'Flame',
  谎言嗅觉: 'Search',
  肾上腺素: 'Zap',
  记忆宫殿: 'Brain',
  无痛: 'HeartPulse',
  直觉: 'Radar',
  共生: 'Droplets',
  灵媒: 'Ghost',
  回溯: 'RotateCcw',
  血契: 'Scroll',
  空壳: 'Skull',
  旁观者: 'Orbit',
  悖论: 'InfinityIcon',
  无名者: 'EyeOff',
};

interface Props {
  ability: AbilitySnapshot | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示描述文字 */
  showDesc?: boolean;
  className?: string;
}

const SIZE = {
  sm: { box: 'h-8 w-8', icon: 14, text: 'text-[11px]' },
  md: { box: 'h-12 w-12', icon: 20, text: 'text-sm' },
  lg: { box: 'h-16 w-16', icon: 26, text: 'text-base' },
};

export function AbilityIcon({
  name,
  rarity,
  size = 'md',
}: {
  name: string;
  rarity: Rarity;
  size?: 'sm' | 'md' | 'lg';
}) {
  const meta = RARITY_META[rarity];
  const s = SIZE[size];
  const Icon = ICONS[NAME_ICON[name] ?? 'Eye'] ?? Eye;
  const shine = rarity === 'epic' || rarity === 'legendary';

  return (
    <div
      className={`relative ${s.box} grid shrink-0 place-items-center overflow-hidden border transition-all duration-300`}
      style={{
        borderColor: meta.color,
        boxShadow: `0 0 ${size === 'lg' ? 22 : 14}px ${meta.glow}, inset 0 0 14px rgba(0,0,0,0.7)`,
        background: `radial-gradient(circle at 50% 28%, ${meta.glow}, rgba(0,0,0,0.82))`,
      }}
    >
      <Icon size={s.icon} style={{ color: meta.color }} strokeWidth={1.6} />
      {/* 四角刻痕 */}
      <span
        className="absolute left-1 top-1 h-1.5 w-1.5 border-l border-t"
        style={{ borderColor: meta.color, opacity: 0.8 }}
      />
      <span
        className="absolute bottom-1 right-1 h-1.5 w-1.5 border-b border-r"
        style={{ borderColor: meta.color, opacity: 0.8 }}
      />
      {/* 史诗 / 传说的流光 */}
      {shine && (
        <span
          className="pointer-events-none absolute inset-0 animate-[shimmer_2.8s_linear_infinite]"
          style={{
            background:
              'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 48%, transparent 66%)',
          }}
        />
      )}
    </div>
  );
}

export default function AbilityBadge({ ability, size = 'md', showDesc = true, className = '' }: Props) {
  if (!ability) {
    return (
      <div
        className={`flex items-center gap-2 border border-white/10 px-3 py-2 text-xs text-zinc-500 ${className}`}
      >
        <span className="opacity-60">无异能</span>
      </div>
    );
  }

  const rarity = (ability.rarity ?? 'common') as Rarity;
  const meta = RARITY_META[rarity];
  const s = SIZE[size];

  return (
    <div
      className={`flex items-start gap-3 border px-3 py-2.5 ${className}`}
      style={{
        borderColor: `${meta.color}55`,
        boxShadow: `0 0 16px ${meta.glow}, inset 0 0 22px rgba(0,0,0,0.6)`,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(0,0,0,0.55))',
      }}
    >
      <AbilityIcon name={ability.name} rarity={rarity} size={size} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`${s.text} font-serif tracking-wide`}
            style={{ color: meta.color }}
          >
            【{ability.name}】
          </span>
          <span
            className="border px-1.5 py-[1px] text-[10px] tracking-widest"
            style={{ borderColor: `${meta.color}66`, color: meta.color }}
          >
            {meta.label.toUpperCase()}
          </span>
        </div>
        {showDesc && (
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{ability.desc}</p>
        )}
      </div>
    </div>
  );
}
