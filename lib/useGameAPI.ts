'use client';

import { useCallback, useState } from 'react';
import type { SendActionPayload, SendActionResult } from '@/types';
import { sendAction } from './api';
import { useGame } from '@/store/gameStore';

/**
 * 与后端对话的 Hook。
 * 组件层只需要 `submit(input)`，不需要关心状态拼装 / 解析 / 补丁。
 *
 * 若你不想用全局 store，也可以单独使用本 Hook：
 *   const { submit, pending, error } = useGameAPI();
 */
export function useGameAPI() {
  const player = useGame((s) => s.player);
  const scenario = useGame((s) => s.scenario);
  const difficulty = useGame((s) => s.difficulty);
  const logs = useGame((s) => s.logs);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (userInput: string): Promise<SendActionResult | null> => {
      if (!scenario || pending) return null;
      setPending(true);
      setError(null);

      const payload: SendActionPayload = {
        playerState: player,
        userInput,
        scenarioId: scenario.id,
        difficulty,
        history: logs.slice(-6).map((l) => ({
          role: l.role === 'player' ? 'player' : 'system',
          content: l.raw,
        })),
      };

      try {
        return await sendAction(payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : '未知错误');
        return null;
      } finally {
        setPending(false);
      }
    },
    [player, scenario, difficulty, logs, pending]
  );

  return { submit, pending, error };
}
