/* =========================================================
 * 《副本 / INSTANCE》全局类型定义
 * ========================================================= */

/** 状态机的阶段（AUTH 为接入首屏，COMMUNITY/SOCIAL 为账号层功能） */
export type Phase =
  | 'AUTH'
  | 'LOBBY'
  | 'CHARACTER'
  | 'DIFFICULTY'
  | 'GAMEPLAY'
  | 'ENDING'
  | 'COMMUNITY'
  | 'SOCIAL'
  | 'SHOP'
  | 'SETTINGS';

/** 登录态 */
export interface SessionUser {
  id: string;
  /** 档案代号 */
  username: string;
  /** 全局编号 No.X */
  playerNo: number;
}

/** 异能（存档快照） */
export interface AbilitySnapshot {
  name: string;
  desc: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  /** 注入 LLM 的判定规则 */
  bonus?: string;
  /** 身份所属类别，如「通灵与神秘学类」 */
  category?: string;
}

/** 结局类型 */
export type EndingType = 'HE' | 'NE' | 'BE';

/** 难度 */
export type DifficultyId = 'easy' | 'hard' | 'purgatory';

/** 玩家三维属性（初始 0~100，成长点可无限追加） */
export interface PlayerStats {
  /** 武力 */
  str: number;
  /** 智力 */
  int: number;
  /** 敏捷 */
  agi: number;
}

/** 三维键名 */
export type StatKey = keyof PlayerStats;

/** 初始掷点上限（超过即为成长点投入所得） */
export const STAT_BASE_MAX = 100;

/** 资源条 */
export interface PlayerVitals {
  hp: number;
  sp: number;
  st: number;
}

/** 玩家档案（也是发给后端的最小状态快照） */
export interface PlayerState extends PlayerVitals, PlayerStats {
  name: string;
  /** 当前身份标签，如「见习调查员」 */
  role: string;
  /** 评级 F~SSS */
  rank: Rank;
  /** 已收集线索数 */
  clues: number;
  /** 总线索数 */
  clueTotal: number;
  /** 当前回合 */
  turn: number;
  /** 未分配的成长点（仅由完成副本发放，角色层，死亡清零） */
  growthPoints: number;
  /** 积分（商城唯一货币） */
  credits: number;
  /** 恢复剂存量 */
  potions: { sp: number; st: number };
  /** 武器库 */
  weapons: Weapon[];
  /** 装备中的武器 id */
  equippedWeaponId: string | null;
  /** 本局击杀数 */
  kills: number;
  /** 随机异能：终身锁定，死亡后重新随机 */
  ability?: AbilitySnapshot | null;
}

export type Rank = 'F' | 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface Scenario {
  id: string;
  /** 文档中的编号（1~98） */
  no: number;
  title: string;
  /** 档案袋上的背景描述（禁止剧透数值） */
  blurb: string;
  clueTotal: number;
  /** 所属难度档：简单 / 困难 / 炼狱 */
  difficulty: DifficultyId;
}

export interface Difficulty {
  id: DifficultyId;
  name: string;
  desc: string;
  danger: boolean;
}

/* ---------- 货币 / 战利品 ---------- */

/** 恢复剂种类：精神 / 体力（商城仅售这两种，均不回血） */
export type PotionKind = 'sp' | 'st';

/** 一罐恢复剂恢复的点数 */
export const POTION_HEAL = 33;
/** 一罐恢复剂的售价（积分） */
export const POTION_PRICE = 500;
/** 击杀一个宿主发放的积分 */
export const KILL_CREDITS = 120;
/** 击杀后掉落宿主武器的概率 */
export const DROP_RATE = 0.35;

/** 武器（杀怪概率掉落，装备后提供判定加成，跨局保留，死亡随角色销毁） */
export interface Weapon {
  id: string;
  name: string;
  /** 掉落来源（怪物名） */
  from: string;
  /** 加成属性：null 表示只作用于剧情描述 */
  stat: 'str' | 'int' | 'agi' | null;
  /** 加成数值 */
  bonus: number;
  /** 卖出可得积分 */
  value: number;
}

/** 武器加成档位（掉落时随机） */
export const WEAPON_TIERS: { stat: Weapon['stat']; bonus: number; value: number }[] = [
  { stat: 'str', bonus: 1, value: 180 },
  { stat: 'str', bonus: 2, value: 260 },
  { stat: 'str', bonus: 3, value: 380 },
  { stat: 'int', bonus: 1, value: 180 },
  { stat: 'int', bonus: 2, value: 260 },
  { stat: 'int', bonus: 3, value: 380 },
  { stat: 'agi', bonus: 1, value: 180 },
  { stat: 'agi', bonus: 2, value: 260 },
  { stat: 'agi', bonus: 3, value: 380 },
  { stat: null, bonus: 0, value: 150 },
];

/* ---------- 日志流 ---------- */

export type LogRole = 'system' | 'narration' | 'player' | 'result';

export interface LogEntry {
  id: string;
  role: LogRole;
  /** LLM 返回的原始文本（保留以便调试 / 重放） */
  raw: string;
  /** 解析后的 token 序列 */
  tokens: Token[];
  /** 该条是否已完成打字机播放 */
  done?: boolean;
}

/* ---------- 解析器 Token ---------- */

export type Token =
  | { kind: 'text'; text: string }
  | { kind: 'scene'; text: string }
  | { kind: 'sound'; text: string }
  | { kind: 'action'; text: string }
  /** 击杀宿主：正文标签【击杀：xxx】 */
  | { kind: 'kill'; text: string }
  /** 掉落武器：正文标签【掉落：xxx】 */
  | { kind: 'loot'; text: string }
  | {
      kind: 'check';
      /** 判定项名称，如「力量」 */
      label: string;
      /** 骰子表达式，如 d20=17 */
      dice: string;
      /** 骰值 */
      value: number;
      /** 成功与否 */
      success: boolean;
      /** 原始文本 */
      text: string;
    };

/* ---------- API ---------- */

/** 玩家自带的 AI 配置（随请求发给后端代理，服务端不落库） */
export interface PlayerAIConfig {
  apiKey: string;
  endpoint?: string;
  model?: string;
}

export interface SendActionPayload {
  playerState: PlayerState;
  userInput: string;
  scenarioId: string;
  difficulty: DifficultyId;
  /** 近期对话，供 LLM 保持上下文 */
  history: { role: 'system' | 'player'; content: string }[];
  /** 玩家自带 AI 密钥（优先级高于服务端环境变量） */
  ai?: PlayerAIConfig | null;
  /** 剧本标题与背景（AI 生成剧情时只固定背景） */
  scenarioTitle?: string;
  scenarioBlurb?: string;
}

export interface SendActionResult {
  /** LLM 返回的带标签正文 */
  narrative: string;
  /** 三个推荐选项 */
  options: [string, string, string];
  /** 状态增量补丁 */
  patch?: Partial<PlayerState>;
  /** 若非空，则本次触发结局 */
  ending?: EndingType;
  /** 结局标题（HE/NE/BE 共用） */
  endingTitle?: string;
}
