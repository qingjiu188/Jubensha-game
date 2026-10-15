import type { SendActionPayload, SendActionResult } from '@/types';

/* =========================================================
 * 剧情接口（客户端）
 * ---------------------------------------------------------
 * 前端只做三件事：
 *   1. 把 playerState + userInput 发给 /api/game/action；
 *   2. 拿回「带标签的正文 + 三个选项 + 状态补丁」；
 *   3. 交给 parser 渲染。
 * 前端绝不计算骰子、绝不生成剧情 —— 那是服务端 LLM 调度层的事。
 * ========================================================= */

export async function sendAction(payload: SendActionPayload): Promise<SendActionResult> {
  const res = await fetch('/api/game/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `INSTANCE_API ${res.status}`);
  }
  return (await res.json()) as SendActionResult;
}
