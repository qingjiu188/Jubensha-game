'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  text: string;
  /** 每字毫秒 */
  speed?: number;
  /** 起始延迟 */
  delay?: number;
  className?: string;
  onDone?: () => void;
  /** 完成后是否保留光标 */
  caret?: boolean;
}

/**
 * 逐字打字机。用 rAF 累积时间驱动，避免大量 setTimeout。
 */
export default function Typewriter({
  text,
  speed = 26,
  delay = 0,
  className = '',
  onDone,
  caret = false,
}: Props) {
  const [out, setOut] = useState('');
  const doneRef = useRef(false);
  const cbRef = useRef(onDone);
  cbRef.current = onDone;

  useEffect(() => {
    setOut('');
    doneRef.current = false;
    let raf = 0;
    let start = 0;
    let waited = 0;

    const tick = (t: number) => {
      if (!start) start = t;
      const elapsed = t - start - delay;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const n = Math.min(text.length, Math.floor(elapsed / speed));
      setOut(text.slice(0, n));
      if (n >= text.length) {
        if (!doneRef.current) {
          doneRef.current = true;
          cbRef.current?.();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, delay]);

  return (
    <span className={className}>
      {out}
      {(caret || out.length < text.length) && (
        <span className="ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.12em] bg-toxic/80 animate-caret align-middle" />
      )}
    </span>
  );
}

/**
 * 多行逐行打字：一行播完再播下一行，每行结束回调用于联动动画。
 */
export function TypewriterLines({
  lines,
  speed = 22,
  lineDelay = 320,
  onLineDone,
  className = '',
  lineClassName = '',
}: {
  lines: string[];
  speed?: number;
  lineDelay?: number;
  onLineDone?: (index: number) => void;
  className?: string;
  lineClassName?: string;
}) {
  const [n, setN] = useState(0);
  const cbRef = useRef(onLineDone);
  cbRef.current = onLineDone;

  useEffect(() => setN(0), [lines]);

  return (
    <div className={className}>
      {lines.slice(0, n + 1).map((line, i) => (
        <div key={i} className={lineClassName}>
          {i < n ? (
            <span>{line}</span>
          ) : (
            <Typewriter
              text={line}
              speed={speed}
              onDone={() => {
                cbRef.current?.(i);
                setTimeout(() => setN((v) => v + 1), lineDelay);
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
