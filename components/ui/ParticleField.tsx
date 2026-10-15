'use client';

import { useEffect, useRef } from 'react';
import { useGame } from '@/store/gameStore';

/* =========================================================
 * 全局粒子背景（原生 Canvas）
 * ---------------------------------------------------------
 * · 120 个粒子，颜色在 暗血红 / 冷荧光绿 / 琥珀黄 之间随机
 * · 近距离连线，透明度随距离衰减
 * · 鼠标：60px 内斥力推开，60~170px 引力吸引（流体跟随感）
 * · 点击：以点击点为圆心的冲击波，粒子高速炸开后阻尼回落
 * · BE 结局：整场粒子转为狂暴暗红，速度 ×2.6
 *
 * 用原生 Canvas 而非配置式粒子库的原因：
 * 冲击波需要逐粒子施加初速度 + 逐帧阻尼回落 + 模式热切换，
 * 这些必须拿到粒子实例才能精确控制。
 * ========================================================= */

const BASE_COLORS = ['#8b0000', '#00ff9d', '#d4af37'];
const RAGE_COLORS = ['#8b0000', '#cc0000', '#ff2020'];

const COUNT = 120;
const LINK_DIST = 132;
const REPEL_R = 60;
const ATTRACT_R = 170;
const SHOCK_R = 320;

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 基础漂移速度（冲击波后回归的目标） */
  bx: number;
  by: number;
  r: number;
  c: string;
}

interface Shock {
  x: number;
  y: number;
  t: number;
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // BE 时进入狂暴模式（用 ref 传递，避免重启动画循环）
  const rage = useGame((s) => s.phase === 'ENDING' && s.ending === 'BE');
  const rageRef = useRef(false);
  useEffect(() => {
    rageRef.current = rage;
  }, [rage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;

    const mouse = { x: -9999, y: -9999, active: false };
    const shocks: Shock[] = [];
    let particles: P[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = () => {
      particles = Array.from({ length: COUNT }, () => {
        const angle = Math.random() * Math.PI * 2;
        const sp = 0.18 + Math.random() * 0.42;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(angle) * sp,
          vy: Math.sin(angle) * sp,
          bx: Math.cos(angle) * sp,
          by: Math.sin(angle) * sp,
          r: 0.6 + Math.random() * 1.9,
          c: BASE_COLORS[Math.floor(Math.random() * BASE_COLORS.length)],
        };
      });
    };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
    };

    /** 点击冲击波：逐粒子施加远离点击点的初速度 */
    const onDown = (e: PointerEvent) => {
      shocks.push({ x: e.clientX, y: e.clientY, t: 0 });
      for (const p of particles) {
        const dx = p.x - e.clientX;
        const dy = p.y - e.clientY;
        const d = Math.hypot(dx, dy) || 1;
        if (d > SHOCK_R) continue;
        const force = (1 - d / SHOCK_R) * 16 + 2;
        p.vx += (dx / d) * force;
        p.vy += (dy / d) * force;
      }
    };

    const frame = () => {
      const rageOn = rageRef.current;

      // 暗色拖尾（不透明覆盖，留一点点残影）
      ctx.fillStyle = rageOn ? 'rgba(10,10,12,0.34)' : 'rgba(10,10,12,0.26)';
      ctx.fillRect(0, 0, w, h);

      const speedMul = rageOn ? 2.6 : 1;

      for (const p of particles) {
        // 鼠标交互
        if (mouse.active) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const md = Math.hypot(mdx, mdy) || 1;
          if (md < REPEL_R) {
            p.vx -= (mdx / md) * 0.55;
            p.vy -= (mdy / md) * 0.55;
          } else if (md < ATTRACT_R) {
            p.vx += (mdx / md) * 0.055;
            p.vy += (mdy / md) * 0.055;
          }
        }

        // 阻尼 + 缓慢回归基础漂移（冲击波后自然恢复）
        p.vx += (p.bx * speedMul - p.vx) * 0.018;
        p.vy += (p.by * speedMul - p.vy) * 0.018;
        p.vx *= 0.982;
        p.vy *= 0.982;

        p.x += p.vx;
        p.y += p.vy;

        // 出界回绕
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;
      }

      // 连线
      ctx.lineWidth = 0.6;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK_DIST * LINK_DIST) continue;
          const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * (rageOn ? 0.34 : 0.16);
          ctx.strokeStyle = `rgba(224,224,224,${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // 粒子
      for (const p of particles) {
        const speed = Math.hypot(p.vx, p.vy);
        const color = rageOn ? RAGE_COLORS[Math.floor(Math.random() * RAGE_COLORS.length)] : p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + (rageOn ? 0.5 : 0), 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.min(4 + speed * 3.2, rageOn ? 26 : 16);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // 冲击波圆环
      for (let i = shocks.length - 1; i >= 0; i--) {
        const s = shocks[i];
        s.t += 1;
        const radius = s.t * 9;
        const alpha = Math.max(0, 1 - s.t / 34);
        if (alpha <= 0) {
          shocks.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(139,0,0,${(alpha * 0.5).toFixed(3)})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    spawn();
    raf = requestAnimationFrame(frame);

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
