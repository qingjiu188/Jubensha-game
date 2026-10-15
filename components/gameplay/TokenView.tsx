'use client';

import { motion } from 'framer-motion';
import { AudioLines, Camera, Dices, PackageOpen, Quote, Skull } from 'lucide-react';
import Typewriter from '@/components/ui/Typewriter';
import type { Token } from '@/types';

/**
 * 单个 Token 的渲染器。
 * 四类标签各有独立视觉：
 *   画面 -> 拍立得相框
 *   音效 -> 声波图标 + 斜体
 *   肢体 -> 灰色小字旁白
 *   判定 -> 骰子系统框（成功绿 / 失败红）
 */
export default function TokenView({ token, animate, onDone }: { token: Token; animate: boolean; onDone?: () => void }) {
  switch (token.kind) {
    /* ---------- 画面：拍立得相框 ---------- */
    case 'scene':
      return (
        <motion.div
          initial={{ opacity: 0, rotate: -1.2, y: 8 }}
          animate={{ opacity: 1, rotate: -0.6, y: 0 }}
          transition={{ duration: 0.4 }}
          className="my-3 w-[min(100%,420px)] border border-hairline bg-[#151518] p-2 shadow-[0_6px_24px_rgba(0,0,0,0.6)]"
        >
          <div className="relative flex h-24 items-center justify-center overflow-hidden bg-gradient-to-br from-[#202024] via-[#101013] to-[#08080a]">
            {/* 相纸颗粒 */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 5px)',
              }}
            />
            <Camera size={22} className="relative text-chalk/25" />
            <span className="absolute bottom-1.5 right-2 text-[9px] tracking-[0.2em] text-chalk/25">
              FRAME
            </span>
          </div>
          <p className="px-1.5 py-2 text-[11px] leading-relaxed text-chalk/70">
            {animate ? <Typewriter text={token.text} speed={20} onDone={onDone} /> : token.text}
          </p>
        </motion.div>
      );

    /* ---------- 音效：声波图标 + 斜体 ---------- */
    case 'sound':
      return (
        <p className="my-2 flex items-center gap-2 text-[12px] italic tracking-wide text-amber/80">
          <AudioLines size={13} className="shrink-0 animate-pulse" />
          {animate ? <Typewriter text={token.text} speed={24} onDone={onDone} /> : token.text}
        </p>
      );

    /* ---------- 肢体：灰色小字旁白 ---------- */
    case 'action':
      return (
        <p className="my-1.5 pl-3 text-[11px] leading-relaxed text-muted/90">
          <Quote size={10} className="mr-1.5 inline align-middle opacity-60" />
          {animate ? <Typewriter text={token.text} speed={26} onDone={onDone} /> : token.text}
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
          {animate ? <Typewriter text={token.text} speed={18} onDone={onDone} /> : token.text}
        </p>
      );
  }
}
