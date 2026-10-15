'use client';

import { useEffect, useRef } from 'react';
import { useGame } from '@/store/gameStore';

/* =========================================================
 * 全局粒子背景（原生 Canvas）
 * ---------------------------------------------------------
 * 形态：悬浮的暗物质余烬 —— 无连线（避免蛛网感）
 *   · 彗星拖尾：沿速度方向拉出尾迹，长度 ∝ 速度，越快越亮越偏白
 *   · 辉光：预渲染 radial-gradient 精灵 + drawImage（比逐帧
 *     shadowBlur 快一个量级），亮度做正弦呼吸脉动
 *   · 深度视差：远景小而暗慢，近景大而亮快
 *   · 缓慢上升气流 + 双频正弦横摆，像悬浮的灰烬
 *   · 偶发流星：随机粒子突然冲刺，划出长尾
 * 交互
 *   · 鼠标 <70px 斥力推开；70~210px 切向漩涡（绕鼠标旋转）+ 轻微向心
 *   · 点击：冲击波炸开 + 双层扩散环 + 被波及粒子瞬间染色为炽白
 *   · BE 结局：整场转为狂暴暗红，速度 ×2.6，拖尾加长
 *
 * 用原生 Canvas 而非配置式粒子库的原因：
 * 冲击波 / 漩涡 / 阻尼回落 / 模式热切换都需要逐粒子施力控制。
 * ========================================================= */

const BASE_COLORS = ['#8b0000', '#00ff9d', '#d4af37'];
const RAGE_COLORS = ['#8b0000', '#cc0000', '#ff2a2a'];

const COUNT = 130;
const REPEL_R = 70;
const VORTEX_R = 210;
const SHOCK_R = 340;

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 基础漂移速度（冲击波后回归的目标） */
  bx: number;
  by: number;
  r: number;
  /** 景深 0(远) ~ 1(近) */
  depth: number;
  c: string;
  /** 呼吸相位 */
  ph: number;
  /** 被冲击波染色后的剩余帧数 */
  hot: number;
  /** 横摆相位与频率 */
  sw: number;
  sf: number;
}

interface Shock {
  x: number;
  y: number;
  t: number;
}

/** hex → rgba 字符串 */
function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** 预渲染发光精灵：一次性 radial-gradient，运行时只 drawImage */
function makeGlow(hex: string, size = 64): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  if (!g) return c;
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, rgba(hex, 1));
  grd.addColorStop(0.18, rgba(hex, 0.62));
  grd.addColorStop(0.45, rgba(hex, 0.16));
  grd.addColorStop(1, rgba(hex, 0));
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
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
    let tick = 0;

    // 三种基色 + 狂暴色的发光精灵
    const glow: Record<string, HTMLCanvasElement> = {};
    for (const c of [...BASE_COLORS, ...RAGE_COLORS]) glow[c] = makeGlow(c);
    const HOT_GLOW = makeGlow('#fff6f0');

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
    };

    const spawn = () => {
      particles = Array.from({ length: COUNT }, () => {
        const angle = Math.random() * Math.PI * 2;
        const sp = 0.16 + Math.random() * 0.4;
        const depth = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(angle) * sp,
          vy: Math.sin(angle) * sp,
          bx: Math.cos(angle) * sp,
          by: Math.sin(angle) * sp,
          r: 0.5 + depth * 1.8,
          depth,
          c: BASE_COLORS[Math.floor(Math.random() * BASE_COLORS.length)],
          ph: Math.random() * Math.PI * 2,
          hot: 0,
          sw: Math.random() * Math.PI * 2,
          sf: 0.006 + Math.random() * 0.014,
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

    /** 点击冲击波：逐粒子施加远离点击点的初速度，并染成炽白 */
    const onDown = (e: PointerEvent) => {
      shocks.push({ x: e.clientX, y: e.clientY, t: 0 });
      for (const p of particles) {
        const dx = p.x - e.clientX;
        const dy = p.y - e.clientY;
        const d = Math.hypot(dx, dy) || 1;
        if (d > SHOCK_R) continue;
        const falloff = 1 - d / SHOCK_R;
        const force = falloff * falloff * 22 + 2.5;
        p.vx += (dx / d) * force * (0.5 + p.depth);
        p.vy += (dy / d) * force * (0.5 + p.depth);
        p.hot = 26;
      }
    };

    const frame = () => {
      tick++;
      const rageOn = rageRef.current;

      // 低透明度覆盖 → 长拖尾（狂暴模式拖尾更长）
      ctx.globalAlpha = 1;
      ctx.fillStyle = rageOn ? 'rgba(10,10,12,0.09)' : 'rgba(10,10,12,0.14)';
      ctx.fillRect(0, 0, w, h);

      const speedMul = rageOn ? 2.6 : 1;

      for (const p of particles) {
        // ---- 鼠标交互 ----
        if (mouse.active) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const md = Math.hypot(mdx, mdy) || 1;
          if (md < REPEL_R) {
            // 内圈：强力推开
            const f = (1 - md / REPEL_R) * 1.5;
            p.vx -= (mdx / md) * f;
            p.vy -= (mdy / md) * f;
          } else if (md < VORTEX_R) {
            // 外圈：切向漩涡 + 轻微向心（绕鼠标旋转）
            const nx = mdx / md;
            const ny = mdy / md;
            const strength = (1 - md / VORTEX_R) * 0.34;
            p.vx += -ny * strength + nx * 0.05;
            p.vy += nx * strength + ny * 0.05;
          }
        }

        // ---- 上升气流 + 正弦横摆（悬浮灰烬感）----
        p.sw += p.sf;
        p.vx += Math.sin(p.sw) * 0.012;
        p.vy -= 0.006 * (0.4 + p.depth); // 缓慢上浮

        // ---- 阻尼 + 回归基础漂移（冲击波后自然恢复）----
        p.vx += (p.bx * speedMul - p.vx) * 0.016;
        p.vy += (p.by * speedMul - p.vy) * 0.016;
        p.vx *= 0.985;
        p.vy *= 0.985;

        // ---- 偶发流星冲刺 ----
        if (!rageOn && Math.random() < 0.0006) {
          const a = Math.random() * Math.PI * 2;
          p.vx += Math.cos(a) * 4.5;
          p.vy += Math.sin(a) * 4.5;
          p.hot = 18;
        }

        p.x += p.vx * speedMul;
        p.y += p.vy * speedMul;

        // ---- 出界回绕 ----
        if (p.x < -30) p.x = w + 30;
        if (p.x > w + 30) p.x = -30;
        if (p.y < -30) p.y = h + 30;
        if (p.y > h + 30) p.y = -30;

        if (p.hot > 0) p.hot--;
      }

      /* ---------------- 绘制 ---------------- */

      for (const p of particles) {
        const speed = Math.hypot(p.vx, p.vy);
        const fast = Math.min(speed / 3.2, 1); // 0~1 速度归一

        // 颜色：狂暴模式每帧抖动取红系；被冲击波命中时炽白
        let color: string;
        if (p.hot > 0) {
          color = '#fff6f0';
        } else if (rageOn) {
          color = RAGE_COLORS[(tick + Math.round(p.x)) % RAGE_COLORS.length];
        } else {
          color = p.c;
        }

        // 呼吸脉动：亮度在 0.55~1 之间起伏，近景更明显
        const pulse = 0.62 + 0.38 * Math.sin(tick * 0.022 + p.ph);
        const depthAlpha = 0.3 + p.depth * 0.7;
        const alpha = Math.min(1, (0.45 + fast * 0.75) * pulse * depthAlpha);

        // 1) 拖尾：沿速度方向的线段，长度 ∝ 速度
        const tail = 2.4 + fast * (rageOn ? 26 : 17);
        if (speed > 0.05) {
          ctx.globalAlpha = Math.min(alpha * 0.85, 0.9);
          ctx.strokeStyle = color;
          ctx.lineWidth = p.r * (0.9 + fast * 0.7);
          ctx.beginPath();
          ctx.moveTo(p.x - (p.vx / speed) * tail, p.y - (p.vy / speed) * tail);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }

        // 2) 辉光：预渲染精灵 drawImage
        const gs = p.r * (rageOn ? 13 : 10) * (1 + fast * 0.55) * (0.7 + pulse * 0.5);
        ctx.globalAlpha = alpha * (p.hot > 0 ? 0.95 : 0.62);
        const sprite = p.hot > 0 ? HOT_GLOW : glow[color] ?? glow[p.c];
        ctx.drawImage(sprite, p.x - gs / 2, p.y - gs / 2, gs, gs);

        // 3) 核心亮点：高速时偏白
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.65 + fast * 0.55), 0, Math.PI * 2);
        ctx.fillStyle = fast > 0.55 ? 'rgba(255,250,246,0.95)' : color;
        ctx.fill();
      }

      // ---- 点击冲击波：双层扩散环 ----
      for (let i = shocks.length - 1; i >= 0; i--) {
        const s = shocks[i];
        s.t += 1;
        const radius = s.t * 11;
        const life = 1 - s.t / 32;
        if (life <= 0) {
          shocks.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = life * 0.55;
        ctx.strokeStyle = '#8b0000';
        ctx.lineWidth = 1.6 * life + 0.4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = life * 0.22;
        ctx.strokeStyle = '#ff5a4a';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius * 0.62, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
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
