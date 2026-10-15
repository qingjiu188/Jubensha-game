/* =========================================================
 * 随机异能池
 * ---------------------------------------------------------
 * · 建档 / 重建档案时随机抽取一个，终身锁定，死亡后重新随机
 * · 四档稀有度，权重递减
 * · bonus 字段是给 LLM 看的「判定规则」，会被注入 System Prompt，
 *   让异能真正影响 gameplay 而不是摆设
 * ========================================================= */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Ability {
  id: string;
  name: string;
  desc: string;
  rarity: Rarity;
  /** lucide-react 图标名 */
  icon: string;
  /** 注入 LLM System Prompt 的判定规则 */
  bonus: string;
}

export const RARITY_META: Record<
  Rarity,
  { label: string; color: string; glow: string; weight: number }
> = {
  common:    { label: '普通', color: '#9aa0a6', glow: 'rgba(154,160,166,0.45)', weight: 46 },
  rare:      { label: '稀有', color: '#4a9eff', glow: 'rgba(74,158,255,0.55)',  weight: 30 },
  epic:      { label: '史诗', color: '#a855f7', glow: 'rgba(168,85,247,0.6)',   weight: 17 },
  legendary: { label: '传说', color: '#d4af37', glow: 'rgba(212,175,55,0.7)',   weight: 7 },
};

export const ABILITIES: Ability[] = [
  /* ---------------- 普通 ---------------- */
  {
    id: 'nightvision',
    name: '夜视',
    desc: '瞳孔在黑暗里会扩张到不正常的大小。黑暗、无光、浓雾环境下的所有判定 +2。',
    rarity: 'common',
    icon: 'Eye',
    bonus: '【夜视】处于黑暗/无光/浓雾环境时，该玩家所有属性检定结果 +2。',
  },
  {
    id: 'ironstomach',
    name: '铁胃',
    desc: '你吃过比这更糟的东西。摄入不明物质、接触腐败物导致的精神值损失减半。',
    rarity: 'common',
    icon: 'Utensils',
    bonus: '【铁胃】因摄入/腐败/气味导致的精神值(SP)损失减半（向下取整）。',
  },
  {
    id: 'direction',
    name: '方向感',
    desc: '你从不迷路，只是偶尔会走到不该走的地方。寻路、逃脱、追踪类判定 +2。',
    rarity: 'common',
    icon: 'Compass',
    bonus: '【方向感】寻路、逃脱、追踪相关检定 +2。',
  },
  {
    id: 'breath',
    name: '屏息',
    desc: '你能让自己在墙角消失整整四分钟。潜行、躲藏、静默类判定 +2。',
    rarity: 'common',
    icon: 'Wind',
    bonus: '【屏息】潜行、躲藏、静默移动相关检定 +2。',
  },
  {
    id: 'numb',
    name: '钝感',
    desc: '有些东西进不到你脑子里，这是好事。受到精神冲击时额外少损失 3 点精神值。',
    rarity: 'common',
    icon: 'ShieldOff',
    bonus: '【钝感】每次精神冲击的 SP 损失额外 -3（最低不低于 1）。',
  },
  {
    id: 'deft',
    name: '手法灵巧',
    desc: '你的手指比你的判断力可靠。开锁、拆解、精细操作类判定 +2。',
    rarity: 'common',
    icon: 'Hand',
    bonus: '【手法灵巧】开锁、拆解、精细操作相关检定 +2。',
  },
  {
    id: 'stamina',
    name: '体力充沛',
    desc: '你睡过更差的床。每回合结束额外恢复 2 点体力值。',
    rarity: 'common',
    icon: 'BatteryCharging',
    bonus: '【体力充沛】每回合结束时，该玩家额外恢复 2 点 ST（上限 100）。',
  },
  {
    id: 'fury',
    name: '血性',
    desc: '血流出来的时候你反而更清醒。生命值低于 30 时，武力判定 +2。',
    rarity: 'common',
    icon: 'Flame',
    bonus: '【血性】HP < 30 时，武力(STR)相关检定 +2。',
  },

  /* ---------------- 稀有 ---------------- */
  {
    id: 'liarsniff',
    name: '谎言嗅觉',
    desc: '人说谎时会有一种味道，你说不上来是什么味。识破谎言检定 +3。',
    rarity: 'rare',
    icon: 'Search',
    bonus: '【谎言嗅觉】识破谎言、察觉矛盾的智力(INT)检定 +3。',
  },
  {
    id: 'adrenaline',
    name: '肾上腺素',
    desc: '快死的时候你会变得非常快。体力值低于 30 时，敏捷判定结果翻倍。',
    rarity: 'rare',
    icon: 'Zap',
    bonus: '【肾上腺素】ST < 30 时，敏捷(AGI)检定结果（d20+修正）翻倍后再比对 DC。',
  },
  {
    id: 'palace',
    name: '记忆宫殿',
    desc: '你把见过的每一个字都放在固定的房间里。记忆比对、文献解读判定 +3。',
    rarity: 'rare',
    icon: 'Brain',
    bonus: '【记忆宫殿】记忆比对、文献解读、符号破译的智力(INT)检定 +3。',
  },
  {
    id: 'painless',
    name: '无痛',
    desc: '疼痛要很久才追上你。本副本第一次受到致命伤害时，减免 20 点伤害。',
    rarity: 'rare',
    icon: 'HeartPulse',
    bonus: '【无痛】本副本首次致命伤害减免 20 点（仅一次）。',
  },
  {
    id: 'intuition',
    name: '直觉',
    desc: '后颈发凉是有道理的。每副本一次，可要求系统告知当前场景是否存在即时致命威胁。',
    rarity: 'rare',
    icon: 'Radar',
    bonus: '【直觉】每副本限一次：玩家询问时，明确告知当前场景是否存在即时致命威胁（是/否，不说明具体内容）。',
  },
  {
    id: 'symbiosis',
    name: '共生',
    desc: '你和什么东西住在一起。每副本一次，可将 10 点精神值转化为 15 点生命值。',
    rarity: 'rare',
    icon: 'Droplets',
    bonus: '【共生】每副本限一次：玩家可主动消耗 10 SP 换取 15 HP（HP 上限 100）。',
  },

  /* ---------------- 史诗 ---------------- */
  {
    id: 'medium',
    name: '灵媒',
    desc: '你能听见他们真正想说的那句。可以看见精神值低于 50 的 NPC 的隐藏台词。',
    rarity: 'epic',
    icon: 'Ghost',
    bonus: '【灵媒】当 NPC 的 SP < 50 时，在对话后额外输出一行「【隐藏台词】……」，内容是该 NPC 未说出口的真实想法。',
  },
  {
    id: 'rewind',
    name: '回溯',
    desc: '你可以让某件事没发生过，一次。每副本一次，可重掷任意一次判定。',
    rarity: 'epic',
    icon: 'RotateCcw',
    bonus: '【回溯】每副本限一次：玩家可要求重掷刚刚发生的那次判定，取新结果。',
  },
  {
    id: 'bloodpact',
    name: '血契',
    desc: '有东西替你签了字。死亡时若仍有成长点，消耗全部成长点以 1 点生命值复活。',
    rarity: 'epic',
    icon: 'Scroll',
    bonus: '【血契】HP 归零时，若 growthPoints > 0，则清空全部成长点并以 1 HP 复活（每副本限一次）。',
  },
  {
    id: 'hollow',
    name: '空壳',
    desc: '里面已经没有什么可以被摧毁的了。免疫一次精神崩解。',
    rarity: 'epic',
    icon: 'Skull',
    bonus: '【空壳】首次 SP 归零时不进入崩解，SP 锁定在 1（每副本限一次）。',
  },

  /* ---------------- 传说 ---------------- */
  {
    id: 'bystander',
    name: '旁观者',
    desc: '你偶尔会站在副本外面看自己。每副本一次，可窥见本副本隐藏台账的一行。',
    rarity: 'legendary',
    icon: 'Orbit',
    bonus: '【旁观者】每副本限一次：玩家询问时，从隐藏台账中如实透露一行关键信息（不得是凶手姓名，须是与当前处境直接相关的客观事实）。',
  },
  {
    id: 'paradox',
    name: '悖论',
    desc: '你说过的某句话，会在你需要的时候被收回。每副本三次，可让系统重掷任意判定。',
    rarity: 'legendary',
    icon: 'Infinity',
    bonus: '【悖论】每副本限三次：玩家可要求重掷任意一次判定，取新结果。',
  },
  {
    id: 'nameless',
    name: '无名者',
    desc: '没人记得你，所以没人防备你。所有 NPC 初始信任 +15，但本副本无法达成好结局。',
    rarity: 'legendary',
    icon: 'EyeOff',
    bonus: '【无名者】所有 NPC 初始信任 +15；但本副本最高只能达成 Normal Ending，无法达成 Happy Ending。',
  },
];

/* ---------------- 抽取 ---------------- */

const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

/** 按稀有度权重抽取一档，再从该档内等概率抽一个异能 */
export function rollAbility(): Ability {
  const total = RARITY_ORDER.reduce((s, r) => s + RARITY_META[r].weight, 0);
  let roll = Math.random() * total;

  let picked: Rarity = 'common';
  for (const r of RARITY_ORDER) {
    roll -= RARITY_META[r].weight;
    if (roll <= 0) {
      picked = r;
      break;
    }
  }

  const pool = ABILITIES.filter((a) => a.rarity === picked);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function abilityById(id: string): Ability | undefined {
  return ABILITIES.find((a) => a.id === id);
}
