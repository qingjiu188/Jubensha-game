'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Play, ScrollText, User } from 'lucide-react';
import GlitchText from '@/components/ui/GlitchText';
import TerminalButton from '@/components/ui/TerminalButton';
import { useGame } from '@/store/gameStore';

const RULES = [
  '每次只推进一个回合。你输入什么，系统就裁定什么。',
  'HP 归零即档案销毁：用户名、三维、成长点、线索、存档全部清除。',
  'SP 低于 30 时，你看到的描述开始不可靠；但真实线索不会因此改变。',
  '判定公式：d20 + ⌊属性/10⌋ + 情境修正 ≥ 目标值。',
  '你可以随时放弃本局，但放弃同样会被记录。',
];

export default function LobbyView() {
  const go = useGame((s) => s.go);
  const rollStats = useGame((s) => s.rollStats);
  const hasArchive = useGame((s) => s.hasArchive);
  const userEmail = useGame((s) => s.userEmail);
  const logout = useGame((s) => s.logout);
  const [rules, setRules] = useState(false);

  const enter = () => {
    if (hasArchive) {
      go('DIFFICULTY');
    } else {
      rollStats();
      go('CHARACTER');
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6">
      {/* 右上角：当前登录用户 */}
      <div className="absolute right-5 top-5 flex items-center gap-3">
        <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.25em] text-muted">
          <User size={12} className="text-toxic/70" />
          {userEmail ?? '未登录'}
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

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.37, duration: 0.45 }}
        >
          <TerminalButton prefix="[2]" onClick={() => setRules((v) => !v)} variant="ghost">
            <span className="inline-flex items-center gap-3">
              <ScrollText size={14} className="opacity-60" />
              规则说明
            </span>
          </TerminalButton>
        </motion.div>
      </div>

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
