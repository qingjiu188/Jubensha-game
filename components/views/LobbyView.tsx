'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  LogOut,
  MessagesSquare,
  Play,
  Plus,
  Radio,
  ScrollText,
  Settings,
  ShoppingBag,
  User,
} from 'lucide-react';
import GlitchText from '@/components/ui/GlitchText';
import TerminalButton from '@/components/ui/TerminalButton';
import StatBar from '@/components/ui/StatBar';
import { useGame } from '@/store/gameStore';
import type { StatKey } from '@/types';

const RULES = [
  '每次只推进一个回合。你输入什么，系统就裁定什么。',
  '三维初始值 0~100。建档后只能消耗成长点提升，没有上限。',
  '成长点仅由通关副本发放（HE > NE，难度越高越多），角色死亡即清零。',
  '生命值在副本内无法恢复（除非异能本身能治），只有离开副本才会回满。',
  '生命值或精神值归零即死亡，强制触发 BadEnding，档案随即销毁。',
  '副本无法自行退出 —— 只有走到结局才会被释放。',
  '体力与精神可以靠商城的恢复剂补，但生命值买不到。',
  '积分来源：通关副本、击杀宿主、卖出武器。500 积分一罐恢复剂。',
  '武器由击杀概率掉落，装备后跨局保留，死亡随档案销毁。',
  '账号与你在论坛、频道留下的一切不受死亡影响。',
  '判定公式：d20 + ⌊属性/10⌋ + 情境修正（含异能 / 武器加成）≥ 目标值。',
];

const STAT_ROWS: { key: StatKey; label: string; color: 'amber' | 'toxic' }[] = [
  { key: 'str', label: '武力', color: 'amber' },
  { key: 'int', label: '智力', color: 'toxic' },
  { key: 'agi', label: '敏捷', color: 'toxic' },
];

export default function LobbyView() {
  const go = useGame((s) => s.go);
  const rollStats = useGame((s) => s.rollStats);
  const hasArchive = useGame((s) => s.hasArchive);
  const account = useGame((s) => s.account);
  const logout = useGame((s) => s.logout);
  const player = useGame((s) => s.player);
  const spendPoint = useGame((s) => s.spendPoint);
  const [rules, setRules] = useState(false);
  const [growth, setGrowth] = useState(false);
  const points = player.growthPoints ?? 0;

  const loadTaken = useGame((s) => s.loadTaken);

  const enter = async () => {
    if (hasArchive) {
      go('DIFFICULTY');
      return;
    }
    // 先拉最新占用列表，保证分发到的是确实没人用的身份
    await loadTaken();
    rollStats();
    go('CHARACTER');
  };

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-start px-6 py-10 md:justify-center">
      {/* 右上角：当前账号 */}
      <div className="absolute right-5 top-5 flex items-center gap-3">
        <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] text-muted">
          <User size={12} className="text-toxic/70" />
          {account ? (
            <>
              <span className="text-chalk/80">{account.username}</span>
              <span className="border border-toxic/40 px-1.5 py-0.5 text-toxic">
                No.{account.playerNo}
              </span>
            </>
          ) : (
            '未登录'
          )}
          {hasArchive && (
            <span className="ml-1 inline-flex items-center gap-1 border border-amber/50 px-1.5 py-0.5 text-amber">
              <Coins size={10} />
              {player.credits ?? 0}
            </span>
          )}
        </span>
        <button
          onClick={() => void logout()}
          className="inline-flex items-center gap-1.5 border border-hairline px-2.5 py-1.5 text-[10px] tracking-[0.25em] text-muted transition-colors hover:border-blood/70 hover:text-blood-bright"
        >
          <LogOut size={11} />
          登出
        </button>
      </div>

      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="mb-14 text-center"
      >
        <p className="mb-3 text-[10px] tracking-[0.6em] text-muted">INSTANCE — 副本</p>
        <GlitchText
          as="h1"
          className="animate-breathe font-serif text-6xl font-bold tracking-[0.16em] text-chalk sm:text-7xl"
        >
          副 本
        </GlitchText>
        <p className="mt-3 font-mono text-xs tracking-[0.55em] text-toxic/70">I N S T A N C E</p>
        <div className="mx-auto mt-6 h-px w-40 bg-gradient-to-r from-transparent via-toxic/40 to-transparent" />
      </motion.div>

      {/* 终端命令 */}
      <div className="w-full max-w-md space-y-3">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
        >
          <TerminalButton prefix="[1]" onClick={enter}>
            <span className="inline-flex items-center gap-3">
              <Play size={14} className="opacity-60" />
              {hasArchive ? '继续生涯' : '建立新档案'}
            </span>
          </TerminalButton>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.33, duration: 0.45 }}
          >
            <TerminalButton
              prefix="[2]"
              onClick={() => hasArchive && go('SHOP')}
              variant={hasArchive ? 'default' : 'ghost'}
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingBag size={13} className="opacity-60" />
                商城
                {hasArchive && (
                  <span className="inline-flex items-center gap-1 text-amber">
                    <Coins size={11} />
                    {player.credits ?? 0}
                  </span>
                )}
              </span>
            </TerminalButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.33, duration: 0.45 }}
          >
            <TerminalButton prefix="[3]" onClick={() => go('COMMUNITY')} variant="ghost">
              <span className="inline-flex items-center gap-2">
                <MessagesSquare size={13} className="opacity-60" />
                暗网论坛
              </span>
            </TerminalButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.38, duration: 0.45 }}
          >
            <TerminalButton prefix="[4]" onClick={() => go('SOCIAL')} variant="ghost">
              <span className="inline-flex items-center gap-2">
                <Radio size={13} className="opacity-60" />
                幸存者频道
              </span>
            </TerminalButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.38, duration: 0.45 }}
          >
            <TerminalButton prefix="[5]" onClick={() => go('SETTINGS')} variant="ghost">
              <span className="inline-flex items-center gap-2">
                <Settings size={13} className="opacity-60" />
                接入设置
              </span>
            </TerminalButton>
          </motion.div>
        </div>

        {hasArchive && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.41, duration: 0.45 }}
          >
            <TerminalButton
              prefix="[6]"
              onClick={() => setGrowth((v) => !v)}
              variant={points > 0 ? 'default' : 'ghost'}
            >
              <span className="inline-flex items-center gap-3">
                <Plus size={14} className="opacity-60" />
                属性强化
                <span className={points > 0 ? 'text-amber' : 'text-muted'}>
                  成长点 {points}
                </span>
              </span>
            </TerminalButton>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.48, duration: 0.45 }}
        >
          <TerminalButton prefix="[7]" onClick={() => setRules((v) => !v)} variant="ghost">
            <span className="inline-flex items-center gap-3">
              <ScrollText size={14} className="opacity-60" />
              规则说明
            </span>
          </TerminalButton>
        </motion.div>
      </div>

      {/* 属性强化：唯一的三维修正入口 */}
      <AnimatePresence>
        {growth && hasArchive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32 }}
            className="mt-5 w-full max-w-md overflow-hidden"
          >
            <div className="panel scanlines px-5 py-4">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-[10px] tracking-[0.3em] text-toxic/70">ENHANCE / 属性强化</p>
                <p className="text-[10px] tracking-[0.2em] text-muted">
                  可用成长点{' '}
                  <span className={`font-serif text-xl ${points > 0 ? 'text-amber' : 'text-muted'}`}>
                    {points}
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                {STAT_ROWS.map((row) => (
                  <div key={row.key} className="flex items-center gap-3">
                    <span className="w-9 shrink-0 text-[11px] tracking-[0.2em] text-chalk/80">
                      {row.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <StatBar
                        label={row.key.toUpperCase()}
                        value={player[row.key]}
                        max={100}
                        low={0}
                        color={row.color}
                        showNumber={false}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right font-mono text-sm text-chalk/90">
                      {player[row.key]}
                    </span>
                    <button
                      onClick={() => spendPoint(row.key)}
                      disabled={points <= 0}
                      title={points <= 0 ? '没有可用成长点' : `消耗 1 点，${row.label} +1`}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center border text-sm transition-colors ${
                        points <= 0
                          ? 'cursor-not-allowed border-hairline text-muted/40'
                          : 'border-amber/60 text-amber hover:bg-amber/15 hover:shadow-glow-toxic'
                      }`}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>

              <p className="mt-4 border-t border-hairline pt-3 text-[10px] leading-relaxed tracking-[0.12em] text-muted">
                每消耗 1 点成长点，对应属性 +1，无上限。成长点只能靠通关副本获得，
                角色死亡时随档案一并清零。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 规则说明 */}
      <AnimatePresence>
        {rules && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32 }}
            className="mt-5 w-full max-w-md overflow-hidden"
          >
            <div className="panel scanlines px-5 py-4">
              <p className="mb-2 text-[10px] tracking-[0.3em] text-toxic/70">RULEBOOK</p>
              <ul className="space-y-1.5">
                {RULES.map((r) => (
                  <li key={r} className="text-[11px] leading-relaxed tracking-[0.12em] text-chalk/75">
                    · {r}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部警告 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.9 }}
        className="mt-12 text-center text-[11px] tracking-[0.25em] text-blood-bright/80"
      >
        ⚠ 死亡不可回溯。你会失去这里的一切。
      </motion.p>
    </div>
  );
}
