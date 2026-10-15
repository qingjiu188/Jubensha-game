import type { SendActionPayload, SendActionResult } from '@/types';
import { SCRIPT } from '@/lib/mock';

/* =========================================================
 * LLM 调度层（服务端）
 * ---------------------------------------------------------
 * 前端永远不算骰子、不写剧情，只把 playerState + userInput 发过来。
 *
 * 三级降级：
 *   1. payload.ai.apiKey（玩家自带的密钥，优先级最高）
 *   2. process.env.LLM_API_KEY（服务端全局密钥）
 *   3. 内置脚本（Mock）
 * 玩家密钥仅用于当次请求，用完即弃：不落库、不写日志。
 * ========================================================= */

const DEFAULT_ENDPOINT =
  process.env.LLM_ENDPOINT ?? 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.LLM_MODEL ?? 'gpt-4o-mini';

/** 未接入任何密钥时的兜底说明（只给前端展示，不含密钥） */
export const LLM_SOURCE = { player: 'PLAYER_KEY', env: 'SERVER_KEY', mock: 'MOCK' } as const;

const BASE_RULES = `你是文字互动游戏《副本 INSTANCE》的系统。你只负责生成这一个回合。

【核心设定】
副本只有「背景」是固定的，其余一切由你即兴生成：场景布局、NPC、怪物、机关、道具、线索、结局走向，每次都不同。
不要复述任何预设剧情，也不要重复之前出现过的桥段。同一个副本两次进入，体验必须不同。

【输出格式】
1. 正文用这些标签标注多模态内容：
   【画面】…        -> 环境或特写描写
   【音效】…        -> 声音描写
   【肢体】…        -> 角色身体反应的旁白
   【判定：xxx | d20=n | 目标 m | 成功/失败】 -> 需要掷骰时
2. 判定必须显式写出 d20 值与目标值，并给出成功或失败。
   判定公式：d20 + ⌊属性/10⌋ + 情境修正 ≥ 目标值。目标值一般取 10~25。
3. 玩家击杀某个宿主时，另起一段写【击杀：宿主名】。
   从宿主身上摸到武器时，另起一段写【掉落：武器名】。掉落是随机的，不要每次都掉。
4. 结尾必须给出三个推荐选项，形如：
A. 动作
B. 动作
C. 动作

【硬性约束】
- 只推进一个回合，然后停下，等玩家输入。
- 只输出正文与选项，不要解释你的推理，不要加前后缀说明。
- 生命值在副本内无法恢复。除非玩家异能明确写着能治疗，否则任何情况下都不要把生命值写成上升。
- 不要在正文里直接暴露玩家的属性数值。`;

/**
 * 组装 System Prompt：注入副本背景 + 玩家异能 + 装备。
 * 背景之外一律交给模型即兴生成，保证随机性。
 */
function buildSystemPrompt(payload: SendActionPayload): string {
  const title = payload.scenarioTitle ?? payload.scenarioId ?? '未知副本';
  const blurb = payload.scenarioBlurb ?? '';
  const p = payload.playerState;

  const head = `${BASE_RULES}

【本局副本背景（唯一的固定内容，不得改动）】
副本名：${title}
背景：${blurb}`;

  const gear = p?.weapons?.find((w) => w.id === p.equippedWeaponId);
  const stateBlock = `
【玩家当前状态】
身份：${p?.name ?? '未登记'}　评级：${p?.rank ?? 'F'}
生命 ${p?.hp ?? 100} / 100　精神 ${p?.sp ?? 100} / 100　体力 ${p?.st ?? 100} / 100
难度：${payload.difficulty}
${p?.ability?.name ? `异能：${p.ability.name} —— ${p.ability.desc ?? ''}` : '异能：无'}
${gear ? `装备：${gear.name}（${gear.stat ? `${gear.stat.toUpperCase()} +${gear.bonus}` : '无属性加成'}）` : '装备：空手'}`;

  const abilityRule = p?.ability?.bonus
    ? `
【异能强制规则】
玩家拥有异能，你必须在相关情境中严格执行它的效果，并在判定行中体现加成
（例如写成「判定：智力 | d20=11 + 7 + 3(${p.ability.name}) = 21 | 目标 16 | 成功」）：
${p.ability.bonus}
异能触发时，用一句话客观描写它生效的样子，不要解释机制。`
    : '';

  const survive = `
【生存规则】
- 生命值归零或精神值归零 = 玩家死亡，此时输出 BE 结局并结束本局。
- 副本内生命值不可恢复（异能治疗除外）。精神与体力可以被消耗，也可以被恢复剂补回。
- 玩家不能中途退出副本，只有走到结局才会被释放。
- 走到结局时，在末尾另起一行输出【结局：HE】或【结局：NE】或【结局：BE】，并给出结局标题。`;

  return `${head}\n${stateBlock}${abilityRule}\n${survive}`;
}

/** 解析玩家自带的 AI 配置（只在这一次请求内有效） */
function resolveKey(payload: SendActionPayload): {
  apiKey: string;
  endpoint: string;
  model: string;
  source: (typeof LLM_SOURCE)[keyof typeof LLM_SOURCE];
} | null {
  const playerKey = payload.ai?.apiKey?.trim();
  if (playerKey) {
    return {
      apiKey: playerKey,
      endpoint: payload.ai?.endpoint?.trim() || DEFAULT_ENDPOINT,
      model: payload.ai?.model?.trim() || DEFAULT_MODEL,
      source: LLM_SOURCE.player,
    };
  }
  const envKey = process.env.LLM_API_KEY?.trim();
  if (envKey) {
    return {
      apiKey: envKey,
      endpoint: DEFAULT_ENDPOINT,
      model: DEFAULT_MODEL,
      source: LLM_SOURCE.env,
    };
  }
  return null;
}

export async function generateTurn(payload: SendActionPayload): Promise<SendActionResult> {
  const key = resolveKey(payload);
  if (!key) return mockLLM(payload);
  try {
    return await realLLM(payload, key);
  } catch (err) {
    // 玩家密钥失效时降级到内置脚本，保证游戏不中断
    console.warn('[llm] 调用失败，已降级到内置脚本:', err instanceof Error ? err.message : err);
    const fallback = await mockLLM(payload);
    return {
      ...fallback,
      narrative: `${fallback.narrative}\n\n>> 剧情引擎无响应，本回合按预设走向推进。`,
    };
  }
}

/* ---------- Mock：按回合推进内置脚本 ---------- */
async function mockLLM(payload: SendActionPayload): Promise<SendActionResult> {
  const idx = Math.min(Math.max(payload.playerState.turn, 0), SCRIPT.length - 1);
  const step = SCRIPT[idx];

  return {
    // 系统分发的身份注入正文占位符
    narrative: step.narrative.replace(/\{identity\}/g, payload.playerState.name || '未登记'),
    options: step.options,
    patch: step.patch,
    ending: step.ending,
    endingTitle: step.endingTitle,
  };
}

/* ---------- 真实 LLM ---------- */
async function realLLM(
  payload: SendActionPayload,
  key: { apiKey: string; endpoint: string; model: string },
): Promise<SendActionResult> {
  const userMsg = [
    `【副本】${payload.scenarioTitle ?? payload.scenarioId}　【难度】${payload.difficulty}`,
    `【当前状态】生命 ${payload.playerState.hp} / 精神 ${payload.playerState.sp} / 体力 ${payload.playerState.st}`,
    `【近期上下文（仅供保持连贯，不得原样复述）】`,
    payload.history.map((h) => `${h.role}: ${h.content}`).join('\n') || '（本局开始）',
    `【玩家行动】${payload.userInput}`,
    `请生成下一个回合。`,
  ].join('\n');

  const res = await fetch(key.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.apiKey}`,
    },
    body: JSON.stringify({
      model: key.model,
      temperature: 1.0,
      messages: [
        { role: 'system', content: buildSystemPrompt(payload) },
        { role: 'user', content: userMsg },
      ],
    }),
  });

  if (!res.ok) throw new Error(`LLM ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text.trim()) throw new Error('LLM_EMPTY');

  // 掉落武器的属性档位由前端随机决定，模型只负责叙事，不给数值
  return splitTurn(text);
}

/** 把 LLM 纯文本切成「正文 + 三个选项 + 结局」 */
export function splitTurn(text: string): SendActionResult {
  const lines = text.split('\n');

  // 结局标签：【结局：HE】
  const endIdx = lines.findIndex((l) => /【\s*结局\s*[:：]?\s*(HE|NE|BE)\s*】/i.test(l));
  let ending: SendActionResult['ending'];
  let endTitle = '';
  if (endIdx >= 0) {
    const m = /【\s*结局\s*[:：]?\s*(HE|NE|BE)\s*】/i.exec(lines[endIdx]);
    ending = (m?.[1]?.toUpperCase() as 'HE' | 'NE' | 'BE') ?? undefined;
    endTitle = lines[endIdx].replace(/【\s*结局[^】]*】/g, '').replace(/^[\s:：—-]+/, '').trim();
  }

  const optIdx = lines.findIndex((l) => /^\s*A[.、]/.test(l));
  if (optIdx < 0) {
    return {
      narrative: text.trim(),
      options: ['继续', '观察', '后退'],
      ending,
      endingTitle: ending ? endTitle || '结局' : undefined,
    };
  }

  const narrative = lines.slice(0, optIdx).join('\n').trim();
  const opts = lines
    .slice(optIdx)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/【\s*结局/i.test(l))
    .slice(0, 3);

  const options: [string, string, string] = [
    opts[0] ?? 'A. 继续',
    opts[1] ?? 'B. 观察',
    opts[2] ?? 'C. 后退',
  ];

  return {
    narrative,
    options,
    ending,
    endingTitle: ending ? endTitle || '结局' : undefined,
  };
}
