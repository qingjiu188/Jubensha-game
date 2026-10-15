'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'ghost';
  className?: string;
  prefix?: string;
}

const VARIANT = {
  default: 'border-hairline text-chalk hover:border-toxic/70 hover:text-toxic hover:shadow-glow-toxic',
  danger: 'border-blood/60 text-blood-bright hover:border-blood-bright hover:text-blood-bright hover:shadow-glow-blood',
  ghost: 'border-transparent text-muted hover:border-hairline hover:text-chalk',
};

/** 终端命令行风格按钮：hover 轻微位移 + 边框高亮 */
export default function TerminalButton({
  children,
  onClick,
  disabled,
  variant = 'default',
  className = '',
  prefix = '>',
}: Props) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full border bg-black/40 px-4 py-3 text-left text-sm tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${className}`}
    >
      <span className="mr-2 select-none opacity-50">{prefix}</span>
      <span className="relative z-10">{children}</span>
      {/* hover 时从左到右扫过的高亮 */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-toxic/10 to-transparent transition-all duration-300 group-hover:w-full" />
    </motion.button>
  );
}
