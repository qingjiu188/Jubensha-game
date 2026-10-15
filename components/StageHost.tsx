'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '@/store/gameStore';
import ParticleField from '@/components/ui/ParticleField';
import ScanOverlay from '@/components/ui/ScanOverlay';
import AuthView from '@/components/views/AuthView';
import LobbyView from '@/components/views/LobbyView';
import CharacterView from '@/components/views/CharacterView';
import DifficultyView from '@/components/views/DifficultyView';
import GameplayView from '@/components/views/GameplayView';
import EndingView from '@/components/views/EndingView';

/**
 * 状态机宿主：按 phase 切换视图，不做任何路由跳转。
 * 启动时先 bootstrap()：读 session → 查数据库档案 → 落到 AUTH / LOBBY / CHARACTER。
 */
export default function StageHost() {
  const phase = useGame((s) => s.phase);
  const authReady = useGame((s) => s.authReady);
  const bootstrap = useGame((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-void">
      {/* 全局粒子背景（最底层，贯穿所有视图，永不卸载） */}
      <ParticleField />

      {/* 常驻氛围层 */}
      <ScanOverlay intensity={phase === 'GAMEPLAY' ? 1 : 0.75} />

      {/* 背景网格 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(224,224,224,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(224,224,224,0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 h-full w-full">
        {!authReady ? (
          <div className="flex h-full w-full items-center justify-center">
            <p className="animate-pulse text-[11px] tracking-[0.5em] text-muted">
              正在校验身份……
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, scale: 1.015, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.99, filter: 'blur(8px)' }}
              transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
              className="h-full w-full"
            >
              {phase === 'AUTH' && <AuthView />}
              {phase === 'LOBBY' && <LobbyView />}
              {phase === 'CHARACTER' && <CharacterView />}
              {phase === 'DIFFICULTY' && <DifficultyView />}
              {phase === 'GAMEPLAY' && <GameplayView />}
              {phase === 'ENDING' && <EndingView />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
