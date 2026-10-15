'use client';

interface Props {
  children: string;
  className?: string;
  /** 是否持续故障闪烁 */
  active?: boolean;
  as?: 'h1' | 'h2' | 'span' | 'div' | 'p';
}

/** 双色错位伪影的故障标题 */
export default function GlitchText({ children, className = '', active = true, as = 'span' }: Props) {
  const Tag = as;
  return (
    <Tag
      className={`glitch-text ${active ? 'animate-flicker' : ''} ${className}`}
      data-text={children}
    >
      {children}
    </Tag>
  );
}
