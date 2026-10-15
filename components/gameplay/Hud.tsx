'use client';

import { Bookmark, Clock3, Skull, Swords } from 'lucide-react';
import StatBar from '@/components/ui/StatBar';
import RankBadge from '@/components/ui/RankBadge';
import { AbilityIcon } from '@/components/ui/AbilityBadge';
import { useGame } from '@/store/gameStore';

export default function Hud() {
  const player = useGame((s) => s.player);
  const scenario = useGame((s) => s.scenario);
  const destroyed = useGame((s) => s.destroyed);
  const account = useGame((s) => s.account);

  const gone = (f: string) => destroyed.includes(f);
  const equipped = (player.weapons ?? []).find((w) => w.id === player.equippedWeaponId) ?? null;

  return (
    <header className="panel scanlines relative z-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-hairline px-5 py-3">
      <div className="relative z-[2] flex w-full flex-wrap items-center gap-x-6 gap-y-3">
        {/* 左：HP / SP / ST */}
        <div className={`flex min-w-[240px] flex-1 gap-4 ${gone('str') ? 'animate-dissolve' : ''}`}>
          <div className="flex-1">
            <StatBar label="HP" value={player.hp} color="hp" low={30} />
          </div>
          <div className="flex-1">
            <StatBar label="SP" value={player.sp} color="sp" low={25} />
          </div>
          <div className="flex-1">
            <StatBar label="ST" value={player.st} color="st" low={25} />
          </div>
        </div>

        {/* 中：身份 + 评级 */}
        <div className={`flex items-center gap-4 ${gone('role') ? 'animate-dissolve' : ''}`}>
          <div className="text-right">
            <p className="text-[9px] tracking-[0.3em] text-muted">IDENTITY</p>
            <p className="text-[13px] tracking-[0.15em] text-chalk">{player.role}</p>
            <p className="text-[10px] tracking-[0.2em] text-toxic/70">
              {scenario?.title ?? '未挂载'}
            </p>
          </div>
          <div className={gone('rank') ? 'animate-dissolve' : ''}>
            <RankBadge rank={player.rank} size="sm" showLabel={false} />
          </div>
        </div>

        {/* 中右：异能 */}
        {player.ability && (
          <div
            className={`flex items-center gap-2.5 border-l border-hairline pl-5 ${
              gone('ability') ? 'animate-dissolve' : ''
            }`}
            title={player.ability.desc}
          >
            <AbilityIcon
              name={player.ability.name}
              rarity={player.ability.rarity}
              size="sm"
              category={player.ability.category}
            />
            <div className="leading-tight">
              <p className="text-[9px] tracking-[0.3em] text-muted">ABILITY</p>
              <p className="text-[12px] tracking-[0.12em] text-chalk">{player.ability.name}</p>
            </div>
          </div>
        )}

        {/* 中右：装备中的武器（跨局保留，加成立即生效） */}
        {equipped && (
          <div
            className="flex items-center gap-2.5 border-l border-hairline pl-5"
            title={`掉落自 ${equipped.from} · 卖出可得 ${equipped.value} 积分`}
          >
            <Swords size={14} className="shrink-0 text-amber" />
            <div className="leading-tight">
              <p className="text-[9px] tracking-[0.3em] text-muted">WEAPON</p>
              <p className="text-[12px] tracking-[0.12em] text-chalk">{equipped.name}</p>
              {equipped.stat && (
                <p className="text-[10px] tracking-[0.15em] text-amber/80">
                  {equipped.stat === 'str' ? '武力' : equipped.stat === 'int' ? '智力' : '敏捷'} +
                  {equipped.bonus}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 账号编号 */}
        {account && (
          <div className="flex items-center border-l border-hairline pl-5 text-[10px] tracking-[0.2em] text-toxic/80">
            No.{account.playerNo}
          </div>
        )}

        {/* 右：线索 / 回合 */}
        <div className={`flex items-center gap-5 ${gone('clues') ? 'animate-dissolve' : ''}`}>
          <div className="flex items-center gap-2">
            <Bookmark size={13} className="text-amber" />
            <span className="text-[11px] tracking-[0.2em]">
              <span className="text-amber">{player.clues}</span>
              <span className="text-muted">/{player.clueTotal}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 size={13} className="text-muted" />
            <span className="text-[11px] tracking-[0.2em] text-muted">回合 {player.turn}</span>
          </div>
          <div className="flex items-center gap-2">
            <Skull size={13} className="text-blood-bright/70" />
            <span className="text-[11px] tracking-[0.2em] text-blood-bright/70">不可逆</span>
          </div>
        </div>
      </div>
    </header>
  );
}
