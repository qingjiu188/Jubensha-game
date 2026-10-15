import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 背景：极暗冷灰，拒绝纯黑
        void: '#0a0a0c',
        abyss: '#121214',
        surface: '#17171b',
        elevated: '#1e1e23',
        // 主色
        blood: '#8b0000',
        'blood-bright': '#c41e1e',
        toxic: '#00ff9d',
        amber: '#d4af37',
        // 文本
        chalk: '#e0e0e0',
        muted: '#888888',
        hairline: 'rgba(224,224,224,0.10)',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['var(--font-serif)', 'Playfair Display', 'Noto Serif SC', 'Songti SC', 'serif'],
      },
      boxShadow: {
        'glow-toxic': '0 0 12px rgba(0,255,157,0.35), 0 0 32px rgba(0,255,157,0.12)',
        'glow-blood': '0 0 12px rgba(196,30,30,0.45), 0 0 32px rgba(139,0,0,0.25)',
        'glow-amber': '0 0 12px rgba(212,175,55,0.40), 0 0 36px rgba(212,175,55,0.15)',
        'glow-soft': '0 0 10px rgba(224,224,224,0.10)',
      },
      keyframes: {
        breathe: {
          '0%,100%': { opacity: '0.55', textShadow: '0 0 12px rgba(0,255,157,0.25)' },
          '50%': { opacity: '1', textShadow: '0 0 26px rgba(0,255,157,0.65)' },
        },
        flicker: {
          '0%,100%': { opacity: '1' },
          '42%': { opacity: '1' },
          '44%': { opacity: '0.35' },
          '46%': { opacity: '1' },
          '62%': { opacity: '0.7' },
          '64%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        pulseDanger: {
          '0%,100%': { boxShadow: '0 0 0 1px rgba(196,30,30,0.55), 0 0 14px rgba(139,0,0,0.25)' },
          '50%': { boxShadow: '0 0 0 1px rgba(255,60,60,0.9), 0 0 30px rgba(196,30,30,0.55)' },
        },
        glitchShift: {
          '0%,100%': { transform: 'translate(0,0)' },
          '20%': { transform: 'translate(-3px,1px) skewX(-2deg)' },
          '40%': { transform: 'translate(3px,-1px) skewX(2deg)' },
          '60%': { transform: 'translate(-2px,-2px)' },
          '80%': { transform: 'translate(2px,2px)' },
        },
        dissolve: {
          '0%': { opacity: '1', filter: 'blur(0)', transform: 'translateX(0)' },
          '40%': { opacity: '0.7', filter: 'blur(2px)', transform: 'translateX(-6px) skewX(4deg)' },
          '100%': { opacity: '0', filter: 'blur(8px)', transform: 'translateX(14px) scale(0.96)' },
        },
        caret: {
          '0%,49%': { opacity: '1' },
          '50%,100%': { opacity: '0' },
        },
      },
      animation: {
        breathe: 'breathe 4.5s ease-in-out infinite',
        flicker: 'flicker 4s infinite steps(1)',
        shimmer: 'shimmer 2.6s linear infinite',
        scanline: 'scanline 7s linear infinite',
        'pulse-danger': 'pulseDanger 2s ease-in-out infinite',
        'glitch-shift': 'glitchShift 0.35s steps(2) infinite',
        dissolve: 'dissolve 0.7s ease-in forwards',
        caret: 'caret 1s steps(1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
