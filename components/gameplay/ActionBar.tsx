'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Lock, Send } from 'lucide-react';
import TerminalButton from '@/components/ui/TerminalButton';
import { useGame } from '@/store/gameStore';
import { POTION_HEAL } from '@/types';

export default function ActionBar() {
  const options = useGame((s) => s.options);
  const submit = useGame((s) => s.submitAction);
  const busy = useGame((s) => s.busy);
  const player = useGame((s) => s.player);
  const usePotion = useGame((s) => s.usePotion);
  const [custom, setCustom] = useState('');
  const potions = player.potions ?? { sp: 0, st: 0 };

  const send = async (v: string) => {
    if (busy || !v.trim()) return;
    setCustom('');
    await submit(v.trim());
  };

  return (
    <div className="panel relative z-10 border-t border-hairline px-5 py-4">
      <div className="grid gap-3 md:grid-cols-3">
        {options.map((o, i) => (
          <motion.div
            key={o + i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <TerminalButton onClick={() => send(o)} disabled={busy} prefix={`[${['A', 'B', 'C'][i]}]`}>
              {o.replace(/^[ABC]\.\s*/, '')}
            </TerminalButton>
          </motion.div>
        ))}
      </div>

      {/* D. 自定义行动 */}
      <div className="mt-3 flex items-stretch gap-2">
        <span className="flex items-center pl-1 text-xs tracking-[0.2em] text-muted">[D]</span>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(custom);
          }}
          disabled={busy}
          placeholder="自定义行动……（Enter 发送）"
          maxLength={120}
          className="flex-1 border border-hairline bg-black/50 px-3 py-2.5 font-mono text-[12px] tracking-wide text-chalk outline-none transition-colors placeholder:text-muted/50 focus:border-toxic/60 focus:shadow-glow-toxic disabled:opacity-40"
        />
        <button
          onClick={() => send(custom)}
          disabled={busy || !custom.trim()}
          className="flex items-center gap-2 border border-hairline px-4 text-xs tracking-[0.2em] text-muted transition-colors hover:border-toxic/70 hover:text-toxic disabled:opacity-40"
        >
          <Send size={13} />
          发送
        </button>
      </div>

      {/* 副本内的道具栏：只有恢复剂可用，回血手段一律锁死 */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        <button
          onClick={() => usePotion('sp')}
          disabled={busy || (potions.sp ?? 0) <= 0}
          title={`精神值 +${POTION_HEAL}`}
          className="inline-flex items-center gap-1.5 border border-toxic/50 px-2.5 py-1 text-[10px] tracking-[0.2em] text-toxic transition-colors hover:bg-toxic/10 disabled:cursor-not-allowed disabled:border-hairline disabled:text-muted/40"
        >
          <FlaskConical size={11} />
          精神恢复剂 ×{potions.sp ?? 0}
        </button>
        <button
          onClick={() => usePotion('st')}
          disabled={busy || (potions.st ?? 0) <= 0}
          title={`体力值 +${POTION_HEAL}`}
          className="inline-flex items-center gap-1.5 border border-amber/50 px-2.5 py-1 text-[10px] tracking-[0.2em] text-amber transition-colors hover:bg-amber/10 disabled:cursor-not-allowed disabled:border-hairline disabled:text-muted/40"
        >
          <FlaskConical size={11} />
          体力恢复剂 ×{potions.st ?? 0}
        </button>
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] text-blood-bright/70">
          <Lock size={11} />
          生命值在副本内锁定 · 无法退出
        </span>
      </div>

      {busy && (
        <p className="mt-2 text-[10px] tracking-[0.3em] text-toxic/70">
          ▍系统正在生成 …… 请勿重复提交
        </p>
      )}
    </div>
  );
}
