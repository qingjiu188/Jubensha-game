'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Hud from '@/components/gameplay/Hud';
import ActionBar from '@/components/gameplay/ActionBar';
import TokenView from '@/components/gameplay/TokenView';
import { useGame } from '@/store/gameStore';

export default function GameplayView() {
  const logs = useGame((s) => s.logs);
  const player = useGame((s) => s.player);
  const busy = useGame((s) => s.busy);
  const markDone = useGame((s) => s.markDone);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logs.length, busy]);

  return (
    <div className="flex h-full w-full flex-col">
      <Hud />

      {/* 中间：系统日志流 */}
      <div className="relative flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto max-w-3xl">
          {logs.map((log, li) => {
            const isLast = li === logs.length - 1;
            const animate = isLast && log.role !== 'player';
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={
                  log.role === 'player'
                    ? 'my-3 border-l-2 border-toxic/60 bg-toxic/[0.04] px-3 py-2'
                    : log.role === 'system'
                    ? 'my-2 text-[11px] tracking-[0.2em] text-muted'
                    : log.role === 'result'
                    ? 'my-4 border border-blood/50 bg-blood/[0.08] px-3 py-2 text-center font-serif text-sm tracking-[0.3em] text-blood-bright'
                    : ''
                }
              >
                {log.role === 'player' && (
                  <p className="mb-1 text-[10px] tracking-[0.3em] text-toxic/70">
                    ▸ {player.name || '你'}
                  </p>
                )}
                {log.tokens.map((t, ti) => (
                  <TokenView
                    key={ti}
                    token={t}
                    animate={animate}
                    onDone={ti === log.tokens.length - 1 ? () => markDone(log.id) : undefined}
                  />
                ))}
              </motion.div>
            );
          })}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      <ActionBar />
    </div>
  );
}
