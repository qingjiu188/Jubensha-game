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
  | 'SOCIAL';

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

export interface SendActionPayload {
  playerState: PlayerState;
  userInput: string;
  scenarioId: string;
  difficulty: DifficultyId;
  /** 近期对话，供 LLM 保持上下文 */
  history: { role: 'system' | 'player'; content: string }[];
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
