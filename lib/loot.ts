import {
  POTION_HEAL,
  POTION_PRICE,
  WEAPON_TIERS,
  type DifficultyId,
  type EndingType,
  type PotionKind,
  type Weapon,
} from '@/types';

/** 同构 ID：服务端与浏览器都可用 */
const newId = (): string =>
  `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/* =========================================================
 * 战利品 / 商城工具
 *   恢复剂：只有 sp / st 两种，各恢复 POTION_HEAL 点，售价 POTION_PRICE 积分
 *   武器：杀怪概率掉落，装备后提供判定加成，可卖出换积分
 * ========================================================= */

export { POTION_HEAL, POTION_PRICE };

/** 恢复剂存量归零化（兼容脏数据） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizePotions(raw: any): { sp: number; st: number } {
  const pick = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  return { sp: pick(raw?.sp), st: pick(raw?.st) };
}

/** 武器列表归零化（兼容脏数据 / 截断超长库存） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeWeapons(raw: any, cap = 40): Weapon[] {
  if (!Array.isArray(raw)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((w: any) => w && typeof w.name === 'string' && w.name.trim())
    .slice(0, cap)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((w: any) => ({
      id: String(w.id ?? newId()),
      name: String(w.name).slice(0, 24),
      from: String(w.from ?? '未知宿主').slice(0, 24),
      stat: w.stat === 'str' || w.stat === 'int' || w.stat === 'agi' ? w.stat : null,
      bonus: Math.max(0, Math.min(9, Math.floor(Number(w.bonus) || 0))),
      value: Math.max(0, Math.min(99999, Math.floor(Number(w.value) || 150))),
    }));
}

/** 武器名后缀：按掉落宿主随机生成一件武器 */
export function rollWeaponDrop(from: string): Weapon {
  const tier = WEAPON_TIERS[Math.floor(Math.random() * WEAPON_TIERS.length)];
  const prefix = WEAPON_NAME_POOL[Math.floor(Math.random() * WEAPON_NAME_POOL.length)];
  const suffix = WEAPON_SUFFIX_POOL[Math.floor(Math.random() * WEAPON_SUFFIX_POOL.length)];
  return {
    id: newId(),
    name: `${prefix}·${suffix}`,
    from: String(from || '未知宿主').slice(0, 24),
    stat: tier.stat,
    bonus: tier.bonus,
    value: tier.value,
  };
}

const WEAPON_NAME_POOL = [
  '断刃', '骨刺', '锈钩', '裂爪', '残牙', '碎颅', '钝斧', '暗刃',
  '铁棘', '绞索', '割喉', '锈钉', '枯枝', '裂甲', '盲枪', '断指',
];
const WEAPON_SUFFIX_POOL = [
  '低语', '哀鸣', '腐蚀', '灼痕', '霜噬', '血契', '残响', '缄默',
  '饥渴', '夜行', '断章', '回响', '沉溺', '悖论', '灰烬', '倒影',
];

/** 武器加成的人类可读描述 */
export function weaponLabel(w: Weapon): string {
  if (!w.stat) return '无属性加成';
  const key = w.stat === 'str' ? '武力' : w.stat === 'int' ? '智力' : '敏捷';
  return `${key} +${w.bonus}`;
}

/** 装备加成汇总：返回三维修正值（用于判定与展示） */
export function weaponBonus(
  weapons: Weapon[],
  equippedId: string | null,
): { str: number; int: number; agi: number } {
  const zero = { str: 0, int: 0, agi: 0 };
  if (!equippedId) return zero;
  const w = weapons.find((x) => x.id === equippedId);
  if (!w || !w.stat) return zero;
  return { ...zero, [w.stat]: w.bonus };
}

/** 使用一罐恢复剂：返回新的存量与被恢复的属性键（库存为空返回 null） */
export function consumePotion(
  potions: { sp: number; st: number },
  kind: PotionKind,
): { potions: { sp: number; st: number }; healed: number } | null {
  if ((potions[kind] ?? 0) <= 0) return null;
  return {
    potions: { ...potions, [kind]: potions[kind] - 1 },
    healed: POTION_HEAL,
  };
}

/**
 * 通关积分（货币三大来源之一：通关 / 杀怪 / 卖武器）
 * 死亡（BE）不发积分 —— 档案都销毁了，积分无从携带。
 */
export function clearCredits(ending: EndingType, difficulty: DifficultyId): number {
  const base = ending === 'HE' ? 800 : ending === 'NE' ? 400 : 0;
  if (base === 0) return 0;
  const mult = difficulty === 'purgatory' ? 2 : difficulty === 'hard' ? 1.5 : 1;
  return Math.round(base * mult);
}

/**
 * 副本内生命值锁死：任何正向 HP 修正一律作废，
 * 除非异能本身具备治疗语义（如「治愈」「生机」「修复肉体」）。
 */
export function abilityHealsHp(ability: { name?: string; desc?: string } | null | undefined): boolean {
  const text = `${ability?.name ?? ''}${ability?.desc ?? ''}`;
  return /治愈|治疗|愈合|生机|再生|回血|恢复生命|修复肉体|缝合/.test(text);
}

/** 商城条目（只卖两种恢复剂，不回血） */
export const SHOP_ITEMS: {
  kind: PotionKind;
  name: string;
  sub: string;
  desc: string;
  price: number;
}[] = [
  {
    kind: 'sp',
    name: '精神恢复剂',
    sub: 'MENTAL · SP',
    desc: `稳定脑波，压制幻觉。精神值 +${POTION_HEAL}。对生命值无效。`,
    price: POTION_PRICE,
  },
  {
    kind: 'st',
    name: '体力恢复剂',
    sub: 'STAMINA · ST',
    desc: `强制代谢乳酸，短期亢奋。体力值 +${POTION_HEAL}。对生命值无效。`,
    price: POTION_PRICE,
  },
];
