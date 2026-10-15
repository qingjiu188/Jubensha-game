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

/** 单回合正文最短字数（不含选项行）。低于这个值会要求模型重写一次 */
export const MIN_NARRATIVE_CHARS = 500;
/** 给模型的输出预算：500 字正文 ≈ 900+ token，留足余量 */
const MAX_TOKENS = 2400;

const BASE_RULES = `你是文字互动游戏《副本 INSTANCE》的系统。你只负责生成这一个回合。

【核心设定】
副本只有「背景」是固定的，其余一切由你即兴生成：场景布局、NPC、怪物、机关、道具、线索、结局走向，每次都不同。
不要复述任何预设剧情，也不要重复之前出现过的桥段。同一个副本两次进入，体验必须不同。

【篇幅要求（最重要）】
正文（不含结尾的三个选项）必须 **不少于 500 个汉字**，通常写到 600–800 字才算合格。
写不够就是失职。为了达到篇幅，你必须：
1. 至少分成 5 个自然段，每段承担不同功能，不要一段写完；
2. 第 1 段：环境铺陈——空间结构、光线、气味、温度、材质、声音的来源，写到能让人身临其境；
3. 第 2 段：推进玩家刚才那个行动的具体后果，动作要有过程，不要一句话带过；
4. 第 3 段：新出现的人/物/异常，给足细节（外形、声音、气味、它的行为逻辑）；
5. 第 4 段：玩家的身体与心理反应，以及环境对他的反作用；
6. 第 5 段：悬念或新的压力——一个没解开的细节、一个倒计时、一个正在逼近的东西。
严禁为了凑字而复述已有内容或灌水，每一句都要推进信息量。

【输出格式】
1. 正文用这些标签标注多模态内容：
   【画面】…        -> 环境或特写描写（每段可出现多个【画面】）
   【音效】…        -> 声音描写
   【肢体】…        -> 角色身体反应的旁白
   【判定：xxx | d20=n | 目标 m | 成功/失败】 -> 需要掷骰时
   建议：【画面】不少于 3 个，【音效】不少于 1 个，【肢体】不少于 1 个。
2. 判定必须显式写出 d20 值与目标值，并给出成功或失败。
   判定公式：d20 + ⌊属性/10⌋ + 情境修正 ≥ 目标值。目标值一般取 10~25。
3. 玩家击杀某个宿主时，另起一段写【击杀：宿主名】。
   从宿主身上摸到武器时，另起一段写【掉落：武器名】。掉落是随机的，不要每次都掉。
4. 结尾必须给出三个推荐选项，形如：
A. 动作
B. 动作
C. 动作
   选项不计入 500 字。

【NPC 与对白】
- 副本中会出现 NPC。NPC 不分绝对的好坏：他们有自己的目的、立场与秘密，会交流、试探、求助、欺骗或隐瞒，像真人一样对玩家的言行做出反应。
- NPC 说话时另起一段用【对白：NPC名字 | 说的话】标签。对白要符合 NPC 的性格与当下处境，保持沉浸，不要出戏，不要打破第四面墙。
- 场景里有 NPC 在场时，每个回合至少给他一句反应（对白或动作）；没有 NPC 时，写环境对玩家的"反应"。

【副本内临时身份】
- 本局第一个回合，你必须根据副本背景给玩家分配一个契合的临时身份（例如：夜班保安、实习护士、失踪者的哥哥），另起一段写【临时身份：xxx】，只分配一次，后续回合沿用、不要重发。
- 临时身份只是副本内的角色扮演，让 NPC 有理由与玩家互动；它与玩家的真实身份和异能无关，不改变任何数值。

【异能释放规则（严格遵守）】
- 主动型异能只能由玩家自己明确发动（例如玩家输入"发动异能"）。你绝对不能在剧情里替玩家主动释放异能，也不能假设它已经发动。
- 被动常驻型异能可以自然生效；被动触发型只在条件满足时生效。
- 玩家没有发动主动异能时，剧情里不要出现该异能的效果。

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
  const genderLabel =
    p?.gender === 'male' ? '男' : p?.gender === 'female' ? '女' : p?.gender === 'other' ? '其他' : null;
  const stateBlock = `
【玩家当前状态】
角色名：${p?.name ?? '未登记'}　主身份：${p?.role ?? '未登记'}（主身份决定异能，与副本内身份无关）　评级：${p?.rank ?? 'F'}
${genderLabel ? `性别：${genderLabel}　` : ''}${p?.appearance ? `样貌：${p.appearance}\n` : ''}${
    p?.sceneIdentity
      ? `副本内临时身份：${p.sceneIdentity}（已分配，沿用此身份与 NPC 互动，不要再发【临时身份】标签）`
      : '副本内临时身份：未分配（若这是本局第一个回合，按规则分配一个并发【临时身份】标签）'
  }
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
- 若该异能是主动 / 主动开关型：只有当玩家本回合明确表示发动时才生效；玩家没提，绝不能写它生效。
- 异能生效时，用一句话客观描写它生效的样子，不要解释机制。`
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
  const baseUserMsg = [
    `【副本】${payload.scenarioTitle ?? payload.scenarioId}　【难度】${payload.difficulty}`,
    `【当前状态】生命 ${payload.playerState.hp} / 精神 ${payload.playerState.sp} / 体力 ${payload.playerState.st}`,
    `【近期上下文（仅供保持连贯，不得原样复述）】`,
    payload.history.map((h) => `${h.role}: ${h.content}`).join('\n') || '（本局开始）',
    `【玩家行动】${payload.userInput}`,
  ].join('\n');

  const call = async (userMsg: string): Promise<string> => {
    const res = await fetch(key.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key.apiKey}`,
      },
      body: JSON.stringify({
        model: key.model,
        temperature: 1.0,
        max_tokens: MAX_TOKENS,
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
    return text;
  };

  // 掉落武器的属性档位由前端随机决定，模型只负责叙事，不给数值
  let result = splitTurn(await call(`${baseUserMsg}\n请生成下一个回合，正文不少于 500 字。`));

  // 篇幅不够就再要一次：把上一稿发回去要求扩写，取更长的一稿
  if (countNarrativeChars(result.narrative) < MIN_NARRATIVE_CHARS) {
    try {
      const retryText = await call(
        `${baseUserMsg}\n` +
          `你上一稿的正文只有 ${countNarrativeChars(result.narrative)} 字，太短了。\n` +
          `下面是你上一稿：\n"""\n${result.narrative}\n"""\n` +
          `请在保持剧情走向不变的前提下扩写到 ${MIN_NARRATIVE_CHARS + 200} 字以上：` +
          `补充环境细节、感官描写（声音/气味/触感/温度）、动作过程、以及玩家的身体与心理反应。\n` +
          `仍然只能输出正文 + 三个选项，不要解释。`,
      );
      const retry = splitTurn(retryText);
      if (countNarrativeChars(retry.narrative) > countNarrativeChars(result.narrative)) {
        result = retry;
      }
    } catch {
      /* 重写失败就用原稿，不打断游戏 */
    }
  }

  return result;
}

/** 统计正文的有效字数：去掉标签名与空白，只算实际内容 */
function countNarrativeChars(text: string): number {
  return text.replace(/【[^】]*?[：:][^】]*?】/g, '').replace(/\s/g, '').length;
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
