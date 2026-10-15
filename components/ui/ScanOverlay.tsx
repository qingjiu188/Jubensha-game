'use client';

/** 全屏扫描线 + 噪点 + 暗角（常驻氛围层） */
export default function ScanOverlay({ intensity = 1 }: { intensity?: number }) {
  return (
    <>
      {/* 噪点 */}
      <div
        className="pointer-events-none fixed inset-0 z-[70] noise"
        style={{ opacity: 0.13 * intensity }}
        aria-hidden
      />
      {/* 扫描线 */}
      <div
        className="pointer-events-none fixed inset-0 z-[71] scanlines"
        style={{ opacity: 0.55 * intensity }}
        aria-hidden
      />
      {/* 缓慢下移的扫描光带 */}
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-[72] h-[22vh] animate-scanline bg-gradient-to-b from-transparent via-white/[0.035] to-transparent"
        aria-hidden
      />
      {/* 暗角 */}
      <div
        className="pointer-events-none fixed inset-0 z-[73]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,0.5) 80%, rgba(0,0,0,0.9) 100%)',
        }}
        aria-hidden
      />
    </>
  );
}
