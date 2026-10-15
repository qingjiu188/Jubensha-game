import type { PlayerAIConfig } from '@/types';

/* =========================================================
 * 玩家自带 AI 接入配置
 * ---------------------------------------------------------
 * 只存在浏览器 localStorage，随每次剧情请求一起发给后端代理，
 * 服务端用完即弃、绝不落库、绝不写日志。
 * ========================================================= */

const KEY = 'instance.ai.config.v1';

export function loadAIConfig(): PlayerAIConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Partial<PlayerAIConfig>;
    if (!obj || typeof obj.apiKey !== 'string' || !obj.apiKey.trim()) return null;
    return {
      apiKey: obj.apiKey.trim(),
      endpoint: typeof obj.endpoint === 'string' && obj.endpoint.trim() ? obj.endpoint.trim() : undefined,
      model: typeof obj.model === 'string' && obj.model.trim() ? obj.model.trim() : undefined,
    };
  } catch {
    return null;
  }
}

export function saveAIConfig(cfg: PlayerAIConfig | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!cfg || !cfg.apiKey.trim()) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {
    /* 隐私模式下 localStorage 可能不可写，静默降级 */
  }
}

/** 面具：只用于界面回显，不泄露完整密钥 */
export function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 8) return '•'.repeat(k.length);
  return `${k.slice(0, 4)}${'•'.repeat(Math.min(12, k.length - 8))}${k.slice(-4)}`;
}
