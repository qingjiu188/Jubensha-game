'use client';

import { motion } from 'framer-motion';
import { AudioLines, Dices, PackageOpen, Quote, Skull } from 'lucide-react';
import Typewriter from '@/components/ui/Typewriter';
import type { Token } from '@/types';

/**
 * 单个 Token 的渲染器。
 * 四类标签各有独立视觉：
 *   画面 -> 左侧细竖线 + 「场景」文字标签（流式，无相框）
 *   音效 -> 声波图标 + 斜体
 *   肢体 -> 灰色小字旁白
 *   判定 -> 骰子系统框（成功绿 / 失败红）
 *
 * 流式播放：父层按「整条日志」维护一个全局进度，这里只负责
 * 把属于自己的那一段字符切出来，从而做到从开头一路输出到结尾。
 */
export default function TokenView({
  token,
  animate,
  stream,
  onDone,
}: {
  token: Token;
  animate: boolean;
  /** 流式模式下：本 token 已经打出的字数 + 光标是否停在它身上 */
  stream?: { chars: number; caret: boolean } | null;
  onDone?: () => void;
}) {
  /** 统一处理「流式截断 / 独立打字机 / 直接全显」三种情况 */
  const body = (text: string, speed: number) => {
    if (!animate) return <>{text}</>;
    if (stream) {
      return (
        <>
          {text.slice(0, stream.chars)}
          {stream.caret && (
            <span className="ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.12em] animate-caret bg-toxic/80 align-middle" />
          )}
        </>
      );
    }
    return <Typewriter text={text} speed={speed} onDone={onDone} />;
  };

  switch (token.kind) {
    /* ---------- 画面：细竖线 + 「场景」标签 ---------- */
    case 'scene':
      return (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="my-2.5 border-l-2 border-toxic/40 pl-3"
        >
          <p className="text-[12.5px] leading-[1.9] text-chalk/85">
            <span className="mr-2 align-middle text-[10px] tracking-[0.25em] text-toxic/55">
              场景
            </span>
            {body(token.text, 20)}
          </p>
        </motion.div>
      );

    /* ---------- 音效：声波图标 + 斜体 ---------- */
    case 'sound':
      return (
        <p className="my-2 flex items-center gap-2 text-[12px] italic tracking-wide text-amber/80">
          <AudioLines size={13} className={`shrink-0 ${animate ? 'animate-pulse' : ''}`} />
          {body(token.text, 24)}
        </p>
      );

    /* ---------- 肢体：灰色小字旁白 ---------- */
    case 'action':
      return (
        <p className="my-1.5 pl-3 text-[11px] leading-relaxed text-muted/90">
          <Quote size={10} className="mr-1.5 inline align-middle opacity-60" />
          {body(token.text, 26)}
        </p>
      );

    /* ---------- 判定：骰子系统框 ---------- */
    case 'check': {
      const ok = token.success;
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`my-3 flex items-center gap-3 border px-3 py-2.5 ${
            ok
              ? 'border-toxic/50 bg-toxic/[0.06] shadow-glow-toxic'
              : 'border-blood/60 bg-blood/[0.10] shadow-glow-blood'
          }`}
        >
          <Dices size={16} className={ok ? 'text-toxic' : 'text-blood-bright'} />
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] tracking-[0.2em] ${ok ? 'text-toxic' : 'text-blood-bright'}`}>
              {ok ? '判定成功' : '判定失败'} · {token.label}
            </p>
            <p className="text-[10px] tracking-[0.15em] text-muted">
              {token.dice} · 原始指令：{token.text}
            </p>
          </div>
          <span
            className={`font-serif text-xl ${ok ? 'text-toxic' : 'text-blood-bright'}`}
            style={{ textShadow: ok ? '0 0 14px rgba(0,255,157,0.5)' : '0 0 14px rgba(196,30,30,0.6)' }}
          >
            {Number.isNaN(token.value) ? '—' : token.value}
          </span>
        </motion.div>
      );
    }

    /* ---------- 击杀：宿主已清除 ---------- */
    case 'kill':
      return (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="my-2 inline-flex items-center gap-2 border border-blood/60 bg-blood/[0.10] px-3 py-1.5"
        >
          <Skull size={13} className="text-blood-bright" />
          <span className="text-[10px] tracking-[0.25em] text-blood-bright">KILL</span>
          <span className="text-[11px] text-chalk/80">{token.text}</span>
        </motion.div>
      );

    /* ---------- 掉落：武器入库 ---------- */
    case 'loot':
      return (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="my-2 inline-flex items-center gap-2 border border-amber/60 bg-amber/[0.08] px-3 py-1.5"
        >
          <PackageOpen size={13} className="text-amber" />
          <span className="text-[10px] tracking-[0.25em] text-amber">DROP</span>
          <span className="text-[11px] text-chalk/80">{token.text}</span>
        </motion.div>
      );

    /* ---------- 普通正文 ---------- */
    default:
      return (
        <p className="my-2 whitespace-pre-wrap text-[13px] leading-[1.9] text-chalk/90">
          {body(token.text, 18)}
        </p>
      );
  }
}
