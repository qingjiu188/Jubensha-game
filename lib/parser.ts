import type { Token } from '@/types';

/* =========================================================
 * LLM 文本标签解析器
 * ---------------------------------------------------------
 * 支持四类标签：
 *   【画面】xxx        -> 拍立得相框式描述块
 *   【音效】xxx        -> 声波图标 + 斜体
 *   【肢体】xxx        -> 灰色小字旁白
 *   【判定：xxx | d20=n】 -> 骰子系统提示框（成功绿 / 失败红）
 *
 * 未匹配标签的普通正文按段落切分为 text token。
 * ========================================================= */

const TAG_RE = /【\s*(画面|音效|肢体|判定)\s*[:：]?([\s\S]*?)\s*】/g;

/** 从判定标签正文中提取骰值与成败 */
function parseCheck(body: string) {
  // 形如：撬开铁门 | d20=17 | 目标 12     或   力量判定 | d20=3
  const parts = body.split('|').map((p) => p.trim()).filter(Boolean);
  let label = parts[0] ?? '判定';
  let dice = '';
  let value = NaN;
  let target = NaN;
  let success: boolean | null = null;

  for (const p of parts) {
    const d = /d\s*20\s*=\s*(-?\d+)/i.exec(p);
    if (d) {
      value = Number(d[1]);
      dice = p;
      continue;
    }
    const t = /(?:目标|难度|dc)\s*[:：]?\s*(\d+)/i.exec(p);
    if (t) {
      target = Number(t[1]);
      continue;
    }
    if (/(成功|通过|命中)/.test(p)) success = true;
    if (/(失败|未通过|miss)/i.test(p)) success = false;
  }

  if (success === null) {
    // 未显式给出结论时：有目标值则比较，否则以中位数 11 判定
    success = !Number.isNaN(target) ? value >= target : value >= 11;
  }

  return { label, dice: dice || 'd20', value, success };
}

export function parseNarrative(raw: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(raw)) !== null) {
    // 标签之前的普通正文
    const before = raw.slice(lastIndex, m.index);
    pushText(tokens, before);

    const tag = m[1] as '画面' | '音效' | '肢体' | '判定';
    const body = m[2];

    if (tag === '画面') tokens.push({ kind: 'scene', text: body });
    else if (tag === '音效') tokens.push({ kind: 'sound', text: body });
    else if (tag === '肢体') tokens.push({ kind: 'action', text: body });
    else tokens.push({ kind: 'check', ...parseCheck(body), text: body });

    lastIndex = m.index + m[0].length;
  }

  pushText(tokens, raw.slice(lastIndex));
  return tokens;
}

function pushText(tokens: Token[], chunk: string) {
  if (!chunk) return;
  // 按空行分段，段内换行保留
  chunk
    .split(/\n{2,}/)
    .map((s) => s.replace(/^\n+|\n+$/g, ''))
    .filter(Boolean)
    .forEach((s) => tokens.push({ kind: 'text', text: s }));
}

/** 判断一段原始文本里有多少个判定标签（用于统计） */
export function countChecks(raw: string): number {
  return (raw.match(/【\s*判定/g) ?? []).length;
}
