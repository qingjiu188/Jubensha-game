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
import CommunityView from '@/components/views/CommunityView';
import SocialView from '@/components/views/SocialView';
import ShopView from '@/components/views/ShopView';
import SettingsView from '@/components/views/SettingsView';

/**
 * 状态机宿主：按 phase 切换视图，不做任何路由跳转。
 * 启动时先 bootstrap()：读 session → 查数据库档案 → 落到 AUTH / LOBBY / CHARACTER。
 */
export default function StageHost() {
  const phase = useGame((s) => s.phase);
  const authReady = useGame((s) => s.authReady);
  const netError = useGame((s) => s.netError);
  const retryBootstrap = useGame((s) => s.retryBootstrap);
  const bootstrap = useGame((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-void">
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
        {netError ? (
          <div className="flex h-full w-full items-center justify-center px-6">
            <div className="max-w-md border border-blood-bright/40 bg-void/80 p-6 text-center">
              <p className="text-[11px] tracking-[0.4em] text-blood-bright">连接失败</p>
              <p className="mt-4 text-[12px] leading-relaxed text-chalk/70">
                无法连接到 INSTANCE 服务端。可能是当前网络无法访问该站点，
                <br />
                请切换网络（Wi-Fi / 移动数据）后重试。
              </p>
              <button
                onClick={retryBootstrap}
                className="mt-6 border border-chalk/40 px-6 py-2 text-[11px] tracking-[0.3em] text-chalk/80 transition-colors hover:border-toxic hover:text-toxic"
              >
                重新连接
              </button>
            </div>
          </div>
        ) : !authReady ? (
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
              /* 移动端内容超出时允许整页滚动（GAMEPLAY 内部自有滚动区，不受影响） */
              className="h-full w-full overflow-y-auto overscroll-contain"
            >
              {phase === 'AUTH' && <AuthView />}
              {phase === 'LOBBY' && <LobbyView />}
              {phase === 'CHARACTER' && <CharacterView />}
              {phase === 'DIFFICULTY' && <DifficultyView />}
              {phase === 'GAMEPLAY' && <GameplayView />}
              {phase === 'ENDING' && <EndingView />}
              {phase === 'COMMUNITY' && <CommunityView />}
              {phase === 'SOCIAL' && <SocialView />}
              {phase === 'SHOP' && <ShopView />}
              {phase === 'SETTINGS' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
