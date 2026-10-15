/* =========================================================
 * 身份 / 异能分发
 * ---------------------------------------------------------
 * · 数据源唯一：《副本异能.docx》→ lib/identities.ts（100 条）
 *   身份与异能一一绑定，禁止在此之外新增
 * · 身份即系统分发的代号：全局唯一，同一时刻不允许两人占用同一身份
 * · 抽取规则：从「未被占用」的身份池里等概率随机（不再按稀有度权重）
 * · desc 会作为 bonus 注入 LLM System Prompt，让异能真正影响判定
 * ========================================================= */

import {
  IDENTITIES,
  IDENTITY_BY_NAME,
  IDENTITY_NAMES,
  abilityOf,
  type IdentityEntry,
  type Rarity,
} from '@/lib/identities';

export type { Rarity, IdentityEntry };
export { IDENTITIES, IDENTITY_BY_NAME, IDENTITY_NAMES };

export const RARITY_META: Record<Rarity, { label: string; color: string; glow: string }> = {
  common:    { label: '普通', color: '#9aa0a6', glow: 'rgba(154,160,166,0.45)' },
  rare:      { label: '稀有', color: '#4a9eff', glow: 'rgba(74,158,255,0.55)' },
  epic:      { label: '史诗', color: '#a855f7', glow: 'rgba(168,85,247,0.6)' },
  legendary: { label: '传说', color: '#d4af37', glow: 'rgba(212,175,55,0.7)' },
};

/** 类别 → 代表色（UI 分层用） */
export const CATEGORY_COLOR: Record<string, string> = {
  通灵与神秘学类: '#7c5cff',
  医疗与科学类: '#00ff9d',
  探索与调查类: '#4a9eff',
  边缘与黑暗职业类: '#c41e1e',
  特殊状态与弱势群体类: '#9aa0a6',
  宗教与信仰类: '#d4af37',
  现代科技与工程类: '#00d0ff',
  '艺术、文化与心理类': '#ff7ac6',
  '自然、元素与变异类': '#4ade80',
  '概念、规则与Meta类': '#ff4d4d',
};

/** 身份条数 */
export const IDENTITY_TOTAL = IDENTITIES.length;

/** 该身份是否在总表内 */
export function isValidIdentity(name: string | null | undefined): boolean {
  return !!name && !!IDENTITY_BY_NAME[name];
}

/** 校验「身份 + 异能」是否匹配（防止前端伪造） */
export function isIdentityAbilityMatch(
  identity: string | null | undefined,
  abilityName: string | null | undefined,
): boolean {
  if (!identity || !abilityName) return false;
  const e = IDENTITY_BY_NAME[identity];
  return !!e && e.ability === abilityName;
}

/**
 * 从「未被占用」的身份池里随机分发一个。
 * 池空时抛出 IDENTITY_EXHAUSTED（100 个身份同时存活才会发生）。
 */
export function rollIdentity(taken: string[] = []): IdentityEntry {
  const used = new Set(taken.filter(Boolean));
  const pool = IDENTITIES.filter((e) => !used.has(e.identity));
  if (pool.length === 0) {
    const err = new Error('IDENTITY_EXHAUSTED') as Error & { code?: string };
    err.code = 'IDENTITY_EXHAUSTED';
    throw err;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 身份 → 存档里的异能快照 */
export function abilitySnapshotOf(entry: IdentityEntry) {
  return abilityOf(entry);
}

/** 按稳定编号取身份 */
export function identityById(id: string): IdentityEntry | undefined {
  return IDENTITIES.find((e) => e.id === id);
}
