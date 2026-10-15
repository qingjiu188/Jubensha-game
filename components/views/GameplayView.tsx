'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Hud from '@/components/gameplay/Hud';
import ActionBar from '@/components/gameplay/ActionBar';
import TokenView from '@/components/gameplay/TokenView';
import { useGame } from '@/store/gameStore';
import type { Token } from '@/types';

/** 流式打字速度：每字毫秒（越小越快） */
const CHAR_MS = 14;

/** 只有这几类 token 参与逐字输出；判定/击杀/掉落是整块闪现 */
function streamLen(t: Token): number {
  return t.kind === 'text' || t.kind === 'scene' || t.kind === 'sound' || t.kind === 'action'
    ? t.text.length
    : 0;
}

export default function GameplayView() {
  const logs = useGame((s) => s.logs);
  const player = useGame((s) => s.player);
  const busy = useGame((s) => s.busy);
  const markDone = useGame((s) => s.markDone);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastLog = logs[logs.length - 1];
  const lastId = lastLog?.id ?? '';
  const animate = !!lastLog && lastLog.role !== 'player';

  /* ---------- 整条日志的字数表：每个 token 的起始偏移与长度 ---------- */
  const { offsets, total } = useMemo(() => {
    const lens = (lastLog?.tokens ?? []).map(streamLen);
    const off: number[] = [];
    let acc = 0;
    for (const l of lens) {
      off.push(acc);
      acc += l;
    }
    return { offsets: off, total: acc };
  }, [lastLog]);

  /* ---------- 全局进度：从 0 一路涨到 total ---------- */
  const [progress, setProgress] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const doneRef = useRef(false);

  // 换一条新日志就重新从头播
  useEffect(() => {
    setProgress(0);
    setSkipped(false);
    doneRef.current = false;
  }, [lastId]);

  useEffect(() => {
    if (!animate) return;

    if (skipped || total === 0) {
      setProgress(total);
      if (!doneRef.current) {
        doneRef.current = true;
        markDone(lastId);
      }
      return;
    }

    let raf = 0;
    let start = 0;
    let last = -1;

    const tick = (t: number) => {
      if (!start) start = t;
      const n = Math.min(total, Math.floor((t - start) / CHAR_MS));
      if (n !== last) {
        last = n;
        setProgress(n);
      }
      if (n < total) {
        raf = requestAnimationFrame(tick);
      } else if (!doneRef.current) {
        doneRef.current = true;
        markDone(lastId);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, total, lastId, skipped, markDone]);

  /* ---------- 跟随打字进度持续滚到底 ---------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [progress, logs.length, busy]);

  const typing = animate && progress < total;

  return (
    <div className="flex h-full w-full flex-col">
      <Hud />

      {/* 中间：系统日志流（点击任意处可跳过打字） */}
      <div
        ref={scrollRef}
        onClick={() => typing && setSkipped(true)}
        className="relative flex-1 overflow-y-auto px-5 py-6"
      >
        <div className="mx-auto max-w-3xl">
          {logs.map((log, li) => {
            const isLast = li === logs.length - 1;
            const shouldAnimate = isLast && log.role !== 'player';
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

                {log.tokens.map((t, ti) => {
                  // 整块闪现的 token：进度走到它的偏移点才出现
                  if (shouldAnimate && !skipped && progress < offsets[ti]) return null;

                  const len = streamLen(t);
                  const chars = shouldAnimate
                    ? skipped
                      ? len
                      : Math.max(0, Math.min(len, progress - offsets[ti]))
                    : len;
                  const caret = shouldAnimate && !skipped && progress >= offsets[ti] && progress < offsets[ti] + len;

                  return (
                    <TokenView
                      key={ti}
                      token={t}
                      animate={shouldAnimate}
                      stream={shouldAnimate ? { chars, caret } : null}
                    />
                  );
                })}
              </motion.div>
            );
          })}
          <div ref={bottomRef} className="h-2" />
        </div>

        {typing && (
          <p className="pointer-events-none sticky bottom-0 text-right text-[10px] tracking-[0.25em] text-muted/60">
            点击任意处跳过
          </p>
        )}
      </div>

      <ActionBar />
    </div>
  );
}
