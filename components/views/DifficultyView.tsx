'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import TerminalButton from '@/components/ui/TerminalButton';
import { useGame } from '@/store/gameStore';
import { DIFFICULTIES, SCENARIOS } from '@/lib/mock';
import type { Scenario } from '@/types';

export default function DifficultyView() {
  const difficulty = useGame((s) => s.difficulty);
  const chooseDifficulty = useGame((s) => s.chooseDifficulty);
  const chooseScenario = useGame((s) => s.chooseScenario);

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 overflow-y-auto px-6 py-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl tracking-[0.3em] text-chalk">筛 选</h2>
        <span className="text-[10px] tracking-[0.3em] text-muted">STEP 02 / DIFFICULTY & SCENARIO</span>
      </div>

      {/* 难度 */}
      <div className="grid gap-4 md:grid-cols-3">
        {DIFFICULTIES.map((d, i) => {
          const on = difficulty === d.id;
          return (
            <motion.button
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              onClick={() => chooseDifficulty(d.id)}
              className={`panel relative border p-5 text-left transition-colors ${
                on ? 'border-toxic/70 shadow-glow-toxic' : 'border-hairline hover:border-chalk/30'
              } ${d.danger && !on ? 'animate-pulse-danger border-blood/60' : ''}`}
            >
              {d.danger && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 text-[9px] tracking-[0.2em] text-blood-bright">
                  <AlertTriangle size={11} /> 高危
                </span>
              )}
              <p className="font-serif text-xl tracking-[0.25em] text-chalk">{d.name}</p>
              <div className="my-3 h-px w-full bg-hairline" />
              <p className="text-xs leading-relaxed text-muted">{d.desc}</p>
              <p className={`mt-4 text-[10px] tracking-[0.3em] ${on ? 'text-toxic' : 'text-muted/50'}`}>
                {on ? '● 已选中' : '○ 未选择'}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* 剧本卡 */}
      <div className="mt-2 flex items-baseline justify-between">
        <h3 className="text-xs tracking-[0.35em] text-muted">AVAILABLE INSTANCES / 待选剧本</h3>
        <span className="text-[10px] tracking-[0.2em] text-muted/70">共 {SCENARIOS.length} 份</span>
      </div>

      <div className="grid gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.map((s, i) => (
          <ScenarioCard key={s.id} s={s} index={i} onPick={() => chooseScenario(s)} />
        ))}
      </div>
    </div>
  );
}

function ScenarioCard({ s, index, onPick }: { s: Scenario; index: number; onPick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.06 }}
      className="group h-[200px] [perspective:1200px]"
    >
      <div className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
        {/* 正面：档案袋纹理 + 剧本名 */}
        <div className="panel dossier-texture absolute inset-0 flex flex-col justify-between p-5 [backface-visibility:hidden]">
          <div>
            <span className="text-[10px] tracking-[0.3em] text-muted">
              NO.{String(index + 1).padStart(2, '0')}
            </span>
            <h4 className="mt-2 font-serif text-2xl leading-snug tracking-[0.12em] text-chalk">
              {s.title}
            </h4>
          </div>
          <p className="text-[11px] leading-relaxed text-muted">{s.blurb}</p>
          {/* 封口绳 */}
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-blood/40 to-transparent" />
        </div>

        {/* 背面：hover 翻转后浮现血迹 / 线索图标 */}
        <div className="panel absolute inset-0 flex flex-col items-center justify-center gap-3 border-blood/50 bg-gradient-to-br from-[#1a0d0d] to-void p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <BloodStain />
          <p className="text-center font-serif text-lg tracking-[0.2em] text-blood-bright">进入副本</p>
          <p className="text-center text-[10px] leading-relaxed text-muted">
            实例一经挂载，中途退出视为死亡。
          </p>
          <div className="mt-2 w-40">
            <TerminalButton onClick={onPick} variant="danger" prefix="[→]">
              开始
            </TerminalButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** 手绘感血迹（内联 SVG） */
function BloodStain() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <path
        d="M36 6c9 0 12 8 20 12s16 6 14 16-10 12-16 18-8 14-18 14-14-8-20-14S4 44 8 34s10-12 12-18 7-10 16-10z"
        fill="rgba(139,0,0,0.55)"
      />
      <path
        d="M36 16c6 0 8 6 14 9s10 4 9 11-7 8-11 12-5 10-12 10-9-6-13-10-6-8-3-14 7-8 8-12 3-6 8-6z"
        fill="rgba(196,30,30,0.45)"
      />
      <circle cx="26" cy="58" r="2.5" fill="rgba(196,30,30,0.7)" />
      <circle cx="52" cy="20" r="2" fill="rgba(196,30,30,0.6)" />
      <circle cx="60" cy="46" r="1.6" fill="rgba(196,30,30,0.5)" />
    </svg>
  );
}
