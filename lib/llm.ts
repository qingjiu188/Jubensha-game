import type { SendActionPayload, SendActionResult } from '@/types';
import { SCRIPT } from '@/lib/mock';

/* =========================================================
 * LLM 调度层（服务端）
 * ---------------------------------------------------------
 * 前端永远不算骰子、不写剧情，只把 playerState + userInput 发过来。
 *
 * 现在：USE_REAL_LLM = false → 走内置脚本（Mock）。
 * 接真实模型时：把 process.env.LLM_API_KEY 配上即可自动切换，
 * 其余代码（API Route、解析器、UI）一行都不用改。
 * ========================================================= */

const ENDPOINT = process.env.LLM_ENDPOINT ?? 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.LLM_MODEL ?? 'gpt-4o-mini';

const SYSTEM_PROMPT = `你是文字互动游戏《副本 INSTANCE》的系统。
规则：
1. 只推进一个回合，然后停下，等玩家输入。
2. 正文用【画面】【音效】【肢体】【判定：xxx | d20=n | 目标 m】标签标注多模态内容。
3. 判定必须显式写出 d20 值与目标值。
4. 结尾必须给出三个推荐选项，形如：
A. 动作
B. 动作
C. 动作
5. 只输出正文与选项，不要解释你的推理。`;

export async function generateTurn(payload: SendActionPayload): Promise<SendActionResult> {
  if (process.env.LLM_API_KEY) return realLLM(payload);
  return mockLLM(payload);
}

/* ---------- Mock：按回合推进内置脚本 ---------- */
async function mockLLM(payload: SendActionPayload): Promise<SendActionResult> {
  const idx = Math.min(Math.max(payload.playerState.turn, 0), SCRIPT.length - 1);
  const step = SCRIPT[idx];

  return {
    narrative: step.narrative,
    options: step.options,
    patch: step.patch,
    ending: step.ending,
    endingTitle: step.endingTitle,
  };
}

/* ---------- 真实 LLM ---------- */
async function realLLM(payload: SendActionPayload): Promise<SendActionResult> {
  const userMsg = [
    `【当前状态】${JSON.stringify(payload.playerState)}`,
    `【副本】${payload.scenarioId}　【难度】${payload.difficulty}`,
    `【近期上下文】${payload.history.map((h) => `${h.role}: ${h.content}`).join('\n')}`,
    `【玩家行动】${payload.userInput}`,
  ].join('\n');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.9,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
    }),
  });

  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? '';

  return splitTurn(text);
}

/** 把 LLM 纯文本切成「正文 + 三个选项」 */
export function splitTurn(text: string): SendActionResult {
  const lines = text.split('\n');
  const optIdx = lines.findIndex((l) => /^\s*A[.、]/.test(l));

  if (optIdx < 0) {
    return { narrative: text.trim(), options: ['继续', '观察', '后退'] };
  }

  const narrative = lines.slice(0, optIdx).join('\n').trim();
  const opts = lines
    .slice(optIdx)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);

  const options: [string, string, string] = [
    opts[0] ?? 'A. 继续',
    opts[1] ?? 'B. 观察',
    opts[2] ?? 'C. 后退',
  ];

  return { narrative, options };
}
