'use client';

import { Bookmark, Clock3, Skull } from 'lucide-react';
import StatBar from '@/components/ui/StatBar';
import RankBadge from '@/components/ui/RankBadge';
import { useGame } from '@/store/gameStore';

export default function Hud() {
  const player = useGame((s) => s.player);
  const scenario = useGame((s) => s.scenario);
  const destroyed = useGame((s) => s.destroyed);

  const gone = (f: string) => destroyed.includes(f);

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
