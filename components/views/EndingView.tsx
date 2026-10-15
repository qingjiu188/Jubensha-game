'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Archive, Flame, Scroll } from 'lucide-react';
import TerminalButton from '@/components/ui/TerminalButton';
import Typewriter, { TypewriterLines } from '@/components/ui/Typewriter';
import RankBadge from '@/components/ui/RankBadge';
import { useGame } from '@/store/gameStore';
import { DESTRUCTION_LOG } from '@/lib/mock';

export default function EndingView() {
  const ending = useGame((s) => s.ending);
  return ending === 'BE' ? <BadEnding /> : <GoodEnding type={ending} />;
}

/* =========================================================
 * HE / NE：档案归档 + 真相卷轴
 * ========================================================= */
function GoodEnding({ type }: { type: 'HE' | 'NE' }) {
  const player = useGame((s) => s.player);
  const reset = useGame((s) => s.reset);
  const reward = useGame((s) => s.lastReward);
  const payout = useGame((s) => s.lastPayout);
  const he = type === 'HE';

  const truth = he
    ? '真相：你从未进入副本。你是上一轮被销毁的那份档案，系统在重放你的最后一次呼吸。'
    : '真相：你活着出去了，但档案里多了一页写着别人名字的记录。下次进来的人会替你走完。';

  return (
    <div className="flex h-full w-full items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="w-full max-w-2xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-amber">
            <Archive size={14} /> ARCHIVED / 已归档
          </span>
          <span className="text-[10px] tracking-[0.3em] text-muted">
            {he ? 'ENDING · HE' : 'ENDING · NE'}
          </span>
        </div>

        <h2 className="mb-6 font-serif text-4xl tracking-[0.2em] text-chalk">
          {he ? '真 相 归 档' : '带 着 缺 口 离 开'}
        </h2>

        {/* 真相卷轴 */}
        <div className="panel relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber/60 to-transparent" />
          <div className="flex gap-4 p-6">
            <Scroll size={18} className="mt-1 shrink-0 text-amber/80" />
            <p className="text-[13px] leading-[2] text-chalk/85">
              <Typewriter text={truth} speed={28} />
            </p>
          </div>
        </div>

        {/* 结算 */}
        <div className="panel mt-4 flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <RankBadge rank={player.rank} size="sm" />
            <div>
              <p className="text-[10px] tracking-[0.3em] text-muted">SURVIVOR</p>
              <p className="font-serif text-lg tracking-[0.15em] text-chalk">{player.name || '无名者'}</p>
              <p className="text-[11px] tracking-[0.2em] text-muted">
                线索 {player.clues}/{player.clueTotal} · 回合 {player.turn}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-[0.3em] text-muted">GROWTH / 成长点</p>
            <p className="font-serif text-2xl text-toxic">+{reward}</p>
            <p className="text-[10px] tracking-[0.2em] text-toxic/70">
              当前可用 {player.growthPoints ?? 0} 点
            </p>
            <p className="mt-1 text-[10px] tracking-[0.2em] text-amber/70">
              回主界面可分配（1 点 = 属性 +1，无上限）
            </p>
            <p className="mt-2 text-[10px] tracking-[0.3em] text-muted">CREDITS / 积分</p>
            <p className="font-serif text-xl text-amber">+{payout}</p>
            <p className="text-[10px] tracking-[0.2em] text-amber/70">
              击杀 {player.kills ?? 0} · 账户 {player.credits ?? 0}
            </p>
          </div>
        </div>

        <p className="mt-3 text-center text-[10px] tracking-[0.2em] text-muted/70">
          离开副本：生命 / 精神 / 体力已全部恢复至 100。
        </p>

        <div className="mt-6 w-56">
          <TerminalButton onClick={reset} prefix="[→]">
            返回主界面
          </TerminalButton>
        </div>
      </motion.div>
    </div>
  );
}

/* =========================================================
 * BE：故障销毁
 * ========================================================= */
function BadEnding() {
  const player = useGame((s) => s.player);
  const destroyed = useGame((s) => s.destroyed);
  /** 每打印一行 → 前端字段消失 + 数据库对应字段清空 */
  const purgeField = useGame((s) => s.purgeField);
  /** 打印完毕 → 物理删除整条档案记录 */
  const finalizePurge = useGame((s) => s.finalizePurge);
  const reset = useGame((s) => s.reset);

  const [step, setStep] = useState<'flash' | 'destroying' | 'black'>('flash');
  const lines = useMemo(() => DESTRUCTION_LOG.map((d) => d.text), []);

  // 1) 开场红光闪烁 -> 进入销毁阶段
  useEffect(() => {
    const t1 = setTimeout(() => setStep('destroying'), 1500);
    return () => clearTimeout(t1);
  }, []);

  const gone = (f: string) => destroyed.includes(f);
  const cls = (f: string) => (gone(f) ? 'animate-dissolve' : 'animate-glitch-shift');

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 红光闪烁 */}
      <AnimatePresence>
        {step === 'flash' && (
          <motion.div
            className="death-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.2, 0.9, 0.1, 0.75, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, times: [0, 0.1, 0.25, 0.4, 0.6, 0.75, 1] }}
          />
        )}
      </AnimatePresence>

      {/* 背景血雾 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(139,0,0,0.35),transparent_65%)]" />

      {step !== 'black' && (
        <div className="relative mx-auto flex h-full w-full max-w-3xl flex-col justify-center px-6 py-10">
          {/* 标题 */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-blood-bright">
              <Flame size={13} /> PURGE PROTOCOL / 档案销毁
            </span>
            <h2 className="mt-2 font-serif text-4xl tracking-[0.2em] text-blood-bright">
              <span className="glitch-text animate-glitch-shift" data-text="档案销毁">
                档案销毁
              </span>
            </h2>
          </div>

          {/* 被销毁的 UI 元素：每打印一行，对应元素消失 */}
          <div className="panel noise relative mb-6 p-5">
            <div className="relative z-[2] grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="身份" value={player.name || '未登记'} gone={gone('identity')} />
              <Field label="身份" value={player.role} gone={gone('role')} />
              <Field label="评级" value={player.rank} gone={gone('rank')} />
              <Field label="线索" value={`${player.clues}/${player.clueTotal}`} gone={gone('clues')} />
              <Field label="武力" value={String(player.str)} gone={gone('str')} />
              <Field label="智力" value={String(player.int)} gone={gone('int')} />
              <Field label="敏捷" value={String(player.agi)} gone={gone('agi')} />
              <Field label="实例" value="INSTANCE-03" gone={gone('instance')} />
            </div>
          </div>

          {/* 逐行销毁清单 */}
          <div className="min-h-[14rem] border-l-2 border-blood/60 bg-black/40 px-4 py-3">
            <p className="mb-2 text-[10px] tracking-[0.3em] text-blood-bright/80">
              &gt; purge --force --no-backup
            </p>
            <TypewriterLines
              lines={lines}
              speed={16}
              lineDelay={260}
              lineClassName="text-[12px] leading-[2] tracking-[0.15em] text-chalk/80"
              onLineDone={(i) => {
                const target = DESTRUCTION_LOG[i]?.target;
                if (target) void purgeField(target);
                if (i === lines.length - 1) {
                  void finalizePurge().then(() => setTimeout(() => setStep('black'), 900));
                }
              }}
            />
          </div>
        </div>
      )}

      {/* 全黑 + 绿字 */}
      {step === 'black' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 z-[80] flex items-center justify-center bg-black"
        >
          <p className="px-6 text-center font-mono text-sm tracking-[0.3em] text-toxic sm:text-base">
            <Typewriter
              text="欢迎回来。请问，你叫什么名字？"
              speed={70}
              caret
              onDone={() => setTimeout(reset, 3000)}
            />
          </p>
        </motion.div>
      )}
    </div>
  );
}

function Field({ label, value, gone }: { label: string; value: string; gone: boolean }) {
  return (
    <div className={gone ? 'animate-dissolve' : ''}>
      <p className="text-[9px] tracking-[0.3em] text-muted">{label}</p>
      <p className={`font-serif text-lg tracking-[0.1em] ${gone ? 'text-blood-bright/50' : 'text-chalk'}`}>
        {value}
      </p>
    </div>
  );
}
