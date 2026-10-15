'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Dices, Fingerprint } from 'lucide-react';
import TerminalButton from '@/components/ui/TerminalButton';
import StatBar from '@/components/ui/StatBar';
import RankBadge from '@/components/ui/RankBadge';
import RadarChart from '@/components/ui/RadarChart';
import Typewriter from '@/components/ui/Typewriter';
import { useGame } from '@/store/gameStore';
import { snarkOf, totalScore } from '@/lib/rank';

export default function CharacterView() {
  const player = useGame((s) => s.player);
  const setName = useGame((s) => s.setName);
  const rollStats = useGame((s) => s.rollStats);
  const confirm = useGame((s) => s.confirmCharacter);
  const submitting = useGame((s) => s.submitting);

  const total = useMemo(() => totalScore(player), [player]);
  const snark = useMemo(() => snarkOf(player, player.rank), [player]);
  const ready = player.name.trim().length > 0;

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-6 px-6 py-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-2xl tracking-[0.3em] text-chalk">建 档</h2>
        <span className="text-[10px] tracking-[0.3em] text-muted">STEP 01 / CHARACTER</span>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* 左：输入 */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="panel scanlines relative flex flex-col justify-between p-6"
        >
          <div>
            <p className="mb-2 text-[10px] tracking-[0.3em] text-muted">INPUT / 身份登记</p>
            <label className="mb-3 block font-serif text-lg tracking-widest text-chalk/90">
              报上你的名字
            </label>
            <input
              value={player.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="在此键入……"
              maxLength={12}
              className="w-full border border-hairline bg-black/60 px-4 py-3 font-mono text-base tracking-[0.2em] text-toxic outline-none transition-colors placeholder:text-muted/50 focus:border-toxic/60 focus:shadow-glow-toxic"
            />
            <div className="mt-4 h-px w-full bg-hairline" />
            <p className="mt-4 text-xs leading-relaxed text-muted">
              档案一经确认，姓名将被写入副本实例。
              <br />
              销毁流程不会询问你是否备份。
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={rollStats}
              className="group flex items-center gap-2 border border-hairline px-3 py-2 text-xs tracking-widest text-muted transition-colors hover:border-amber/60 hover:text-amber"
            >
              <Dices size={14} className="transition-transform group-hover:rotate-180" />
              重新评级
            </button>
            <span className="flex items-center gap-2 text-[10px] tracking-[0.2em] text-muted">
              <Fingerprint size={13} className="text-toxic/60" />
              身份：{player.role}
            </span>
          </div>
        </motion.div>

        {/* 右：档案卡 */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="panel noise relative p-6"
        >
          <div className="relative z-[2]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-[10px] tracking-[0.3em] text-muted">DOSSIER / 档案卡</p>
                <p className="mt-1 font-serif text-3xl tracking-[0.2em] text-chalk">
                  {player.name || '________'}
                </p>
                <p className="mt-1 text-[11px] tracking-[0.2em] text-toxic/70">{player.role}</p>
              </div>
              <RankBadge rank={player.rank} size="md" />
            </div>

            {/* HP / SP / ST */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              <StatBar label="HP" value={player.hp} color="hp" />
              <StatBar label="SP" value={player.sp} color="sp" />
              <StatBar label="ST" value={player.st} color="st" />
            </div>

            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-6">
              <RadarChart
                data={[
                  { label: '武力', value: player.str },
                  { label: '智力', value: player.int },
                  { label: '敏捷', value: player.agi },
                ]}
                max={20}
              />
              <div className="space-y-4">
                <StatBar label="武力 STR" value={player.str} max={20} low={4} color="amber" />
                <StatBar label="智力 INT" value={player.int} max={20} low={4} color="toxic" />
                <StatBar label="敏捷 AGI" value={player.agi} max={20} low={4} color="toxic" />
                <div className="flex items-baseline justify-between border-t border-hairline pt-3 text-xs">
                  <span className="tracking-[0.25em] text-muted">综合评分</span>
                  <span className="font-serif text-2xl text-amber">{total}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 毒舌点评 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="panel relative border-l-2 border-l-blood/70 px-5 py-4"
      >
        <p className="mb-1 text-[10px] tracking-[0.3em] text-blood-bright/80">SYSTEM NOTE</p>
        <p className="min-h-[3em] text-xs leading-relaxed text-chalk/80">
          <Typewriter text={snark} speed={22} key={snark} />
        </p>
      </motion.div>

      <div className="flex justify-end">
        <div className="w-full md:w-72">
          <TerminalButton
            onClick={() => void confirm()}
            disabled={!ready || submitting}
            variant={ready ? 'default' : 'ghost'}
            prefix="[→]"
          >
            {submitting ? '正在写入数据库……' : ready ? '确认档案，进入筛选' : '请先报上名字'}
          </TerminalButton>
        </div>
      </div>
    </div>
  );
}
