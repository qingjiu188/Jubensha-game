'use client';

import { create } from 'zustand';
import { signIn, signOut } from 'next-auth/react';
import type {
  AbilitySnapshot,
  DifficultyId,
  EndingType,
  LogEntry,
  Phase,
  PlayerState,
  Scenario,
  StatKey,
  Token,
} from '@/types';
import { STAT_BASE_MAX } from '@/types';
import { extractKills, extractLootNames, parseNarrative } from '@/lib/parser';
import { rankOf, totalScore } from '@/lib/rank';
import { rollIdentity } from '@/lib/abilities';
import type { IdentityEntry } from '@/lib/identities';
import {
  POTION_PRICE,
  abilityHealsHp,
  clearCredits,
  consumePotion,
  rollWeaponDrop,
  sanitizePotions,
  sanitizeWeapons,
} from '@/lib/loot';
import { loadAIConfig, saveAIConfig } from '@/lib/aiConfig';
import type { PlayerAIConfig, PotionKind, Weapon } from '@/types';
import { DROP_RATE, KILL_CREDITS } from '@/types';
import { sendAction, timeoutFetch } from '@/lib/api';
import {
  createArchive as apiCreateArchive,
  fetchArchive,
  patchArchive,
  wipeArchiveField,
  deleteArchive as apiDeleteArchive,
} from '@/lib/archive';
import type { DbArchive } from '@/lib/db';

let seq = 0;
const uid = () => `log_${++seq}`;

/** /api/auth/check 对「已存在」返回的文案，登录时靠它区分账号错 / 密钥错 */
const TAKEN_REASON = '该档案代号已被占用';

/** BE 销毁清单的 target → 数据库字段 */
const PURGE_MAP: Record<string, keyof DbArchive> = {
  role: 'currentRole',
  str: 'str',
  int: 'int',
  agi: 'agi',
  clues: 'currentClues',
  rank: 'rating',
  /** 身份：清掉代号并释放全局占用，随后整条档案被物理删除 */
  identity: 'identity',
  instance: 'turn',
  ability: 'abilityName',
};

export interface Account {
  id: string;
  username: string;
  playerNo: number;
}

interface GameStore {
  /* ---------- 状态 ---------- */
  phase: Phase;
  player: PlayerState;
  scenario: Scenario | null;
  difficulty: DifficultyId;
  logs: LogEntry[];
  options: [string, string, string];
  busy: boolean;
  ending: EndingType;
  endingTitle: string;
  /** 上一次通关发放的成长点（结算页展示用） */
  lastReward: number;
  /** 上一次通关发放的积分（结算页展示用） */
  lastPayout: number;
  /** 已被占用的身份（全局唯一） */
  takenIdentities: string[];
  /** 剩余可分发的身份数 */
  identityRemaining: number;
  /** BE 销毁动画已经抹除的字段 */
  destroyed: string[];
  /** 玩家自带的 AI 接入配置（仅存本地，后端代理不落库） */
  ai: PlayerAIConfig | null;

  /* ---------- 登录态（账号层，死亡不清零） ---------- */
  account: Account | null;
  authReady: boolean;
  /** 数据库里是否已存在存活档案 */
  hasArchive: boolean;
  authError: string | null;
  /**
   * 登录/注册失败的具体类型，用于区分「账号不存在」与「密钥错误」：
   *   no-user      代号未注册
   *   bad-key      代号存在但密钥错误
   *   credentials  无法区分（网络/格式问题）时的兜底
   *   other        建档等其他环节的错误
   */
  authErrorKind: 'none' | 'no-user' | 'bad-key' | 'credentials' | 'other';
  submitting: boolean;
  /** 启动阶段的网络异常（连不上服务端时展示重试卡片，替代无限转圈） */
  netError: string | null;

  /* ---------- 动作 ---------- */
  go: (p: Phase) => void;
  /** 网络异常后由用户手动重试启动流程 */
  retryBootstrap: () => void;
  /** 身份由系统分发，不再由玩家输入；此接口保留用于兼容 */
  setName: (name: string) => void;
  /** 拉取已被占用的身份（唯一性） */
  loadTaken: () => Promise<void>;
  rollStats: () => void;
  /** 消耗 1 点成长点，给指定属性 +1（无上限） */
  spendPoint: (key: StatKey) => void;
  /** 商城：花 500 积分买一罐恢复剂 */
  buyPotion: (kind: PotionKind) => boolean;
  /** 使用一罐恢复剂（副本内也可用，只回 SP / ST，不回血） */
  usePotion: (kind: PotionKind) => boolean;
  /** 卖出武器换积分 */
  sellWeapon: (id: string) => void;
  /** 装备 / 卸下武器 */
  equipWeapon: (id: string | null) => void;
  /** 写入 / 清空玩家自带的 AI 接入配置 */
  setAI: (cfg: PlayerAIConfig | null) => void;
  bootstrap: () => Promise<void>;
  /** 切换 tab / 重新输入时清掉上一次的失败提示 */
  clearAuthError: () => void;
  login: (username: string, key: string) => Promise<void>;
  register: (username: string, key: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  confirmCharacter: () => Promise<void>;
  chooseDifficulty: (d: DifficultyId) => void;
  chooseScenario: (s: Scenario) => void;
  submitAction: (input: string) => Promise<void>;
  markDone: (id: string) => void;
  destroyField: (field: string) => void;
  purgeField: (field: string) => Promise<void>;
  finalizePurge: () => Promise<void>;
  triggerEnding: (type: EndingType, title?: string) => void;
  reset: () => Promise<void>;
}

const EMPTY_PLAYER: PlayerState = {
  name: '',
  role: '未登记',
  hp: 100,
  sp: 100,
  st: 100,
  str: 0,
  int: 0,
  agi: 0,
  rank: 'F',
  clues: 0,
  clueTotal: 5,
  turn: 0,
  growthPoints: 0,
  credits: 0,
  potions: { sp: 0, st: 0 },
  weapons: [],
  equippedWeaponId: null,
  kills: 0,
  ability: null,
};

/**
 * 通关奖励的成长点（角色层，死亡随档案清零）
 * 基础值按结局，难度提供倍率，向上取整且至少 1 点。
 */
export function growthReward(ending: EndingType, difficulty: DifficultyId): number {
  const base = ending === 'HE' ? 3 : ending === 'NE' ? 2 : 0;
  if (base === 0) return 0;
  const mult = difficulty === 'purgatory' ? 2 : difficulty === 'hard' ? 1.5 : 1;
  return Math.max(1, Math.round(base * mult));
}

/** 追加一条日志（自动走解析器） */
function pushLog(list: LogEntry[], role: LogEntry['role'], raw: string): LogEntry[] {
  const tokens: Token[] =
    role === 'system' || role === 'player' ? [{ kind: 'text', text: raw }] : parseNarrative(raw);
  return [...list, { id: uid(), role, raw, tokens }];
}

/** 数据库记录 → 前端 PlayerState */
function hydrate(a: DbArchive): PlayerState {
  return {
    name: a.identity || a.username,
    role: a.identityCategory || a.currentRole || '未登记',
    hp: a.hp,
    sp: a.sp,
    st: a.st,
    str: a.str,
    int: a.int,
    agi: a.agi,
    rank: (a.rating as PlayerState['rank']) ?? 'F',
    clues: Array.isArray(a.currentClues) ? a.currentClues.length : 0,
    clueTotal: 5,
    turn: a.turn ?? 0,
    growthPoints: Number(a.growthPoints) || 0,
    credits: Number(a.credits) || 0,
    potions: sanitizePotions(a.potions),
    weapons: sanitizeWeapons(a.weapons),
    equippedWeaponId: typeof a.equippedWeaponId === 'string' ? a.equippedWeaponId : null,
    kills: Number(a.kills) || 0,
    ability: a.abilityName && a.abilityName !== '—'
      ? {
          name: a.abilityName,
          desc: a.abilityDesc,
          rarity: (a.abilityRarity as AbilitySnapshot['rarity']) ?? 'common',
          bonus: `【${a.abilityName}】${a.abilityDesc ?? ''}`,
          category: a.identityCategory ?? undefined,
        }
      : null,
  };
}

/**
 * 读 session。网络不通时 fetch 会无限挂起（移动端尤其常见），
 * 所以这里 8 秒超时后自动重试一次，仍失败则向上抛，由 bootstrap 展示重试卡片。
 */
async function readSessionAccount(): Promise<Account | null> {
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await timeoutFetch('/api/auth/session', { cache: 'no-store' }, 8000);
      const data = (await res.json()) as {
        user?: { id?: string; name?: string | null; email?: string | null };
      };
      const u = data?.user;
      if (!u?.id) return null;
      return { id: u.id, username: String(u.name ?? ''), playerNo: 0 };
    } catch (e) {
      lastErr = e;
      // 第一次超时后稍等一下再试，冷启动 / 弱网抖动有概率恢复
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  throw new Error('NETWORK_UNREACHABLE');
}

/**
 * 掷一套新属性 + 分发一个未被占用的身份（建档 / 死亡重建时调用）。
 * 身份与异能一一绑定：选中身份即确定异能，不再独立抽取。
 */
function freshRoll(taken: string[] = []): {
  stats: { str: number; int: number; agi: number };
  role: string;
  identity: string;
  entry: IdentityEntry;
} {
  // 初始值 0~100（闭区间）
  const roll = () => Math.floor(Math.random() * (STAT_BASE_MAX + 1));
  const stats = { str: roll(), int: roll(), agi: roll() };
  const entry = rollIdentity(taken);
  return {
    stats,
    role: entry.category,
    identity: entry.identity,
    entry,
  };
}

export const useGame = create<GameStore>((set, get) => ({
  phase: 'AUTH',
  player: { ...EMPTY_PLAYER },
  scenario: null,
  difficulty: 'hard',
  logs: [],
  options: ['A. 等待', 'B. 观察', 'C. 后退'],
  busy: false,
  ending: 'NE',
  endingTitle: '',
  lastReward: 0,
  lastPayout: 0,
  takenIdentities: [],
  identityRemaining: 0,
  destroyed: [],
  ai: null,

  account: null,
  authReady: false,
  hasArchive: false,
  authError: null,
  authErrorKind: 'none',
  submitting: false,
  netError: null,

  go: (p) => set({ phase: p }),

  retryBootstrap: () => {
    set({ netError: null, authReady: false });
    void get().bootstrap();
  },

  setName: (name) => set((s) => ({ player: { ...s.player, name } })),

  /** 拉取已被占用的身份列表 */
  loadTaken: async () => {
    try {
      const res = await fetch('/api/identity', { cache: 'no-store' });
      const data = (await res.json()) as { taken?: string[]; remaining?: number };
      set({ takenIdentities: data.taken ?? [], identityRemaining: data.remaining ?? 0 });
    } catch {
      /* 拉取失败时按空占用处理，服务端仍会兜底 */
    }
  },

  /** 随机生成三维属性 + 分发身份（含绑定异能），并同步评级 */
  rollStats: () =>
    set((s) => {
      const { stats, role, identity, entry } = freshRoll(s.takenIdentities);
      return {
        player: {
          ...s.player,
          ...stats,
          name: identity,
          role,
          ability: {
            name: entry.ability,
            desc: entry.desc,
            rarity: entry.rarity,
            bonus: `【${entry.ability}】${entry.desc}`,
            category: entry.category,
          },
          rank: rankOf(stats),
        },
      };
    }),

  /**
   * 消耗 1 点成长点 → 指定属性 +1。
   * 这是档案确认后唯一的属性提升途径：不受 100 上限约束。
   */
  spendPoint: (key) => {
    const s = get();
    if (s.player.growthPoints <= 0) return;

    const player: PlayerState = { ...s.player, growthPoints: s.player.growthPoints - 1 };
    player[key] = s.player[key] + 1;
    player.rank = rankOf(player);

    set({ player });
    void patchArchive({
      str: player.str,
      int: player.int,
      agi: player.agi,
      growthPoints: player.growthPoints,
      rating: player.rank,
    });
  },

  /* =======================================================
   * 商城 / 战利品
   * ===================================================== */

  buyPotion: (kind) => {
    const s = get();
    if ((s.player.credits ?? 0) < POTION_PRICE) return false;
    const player: PlayerState = {
      ...s.player,
      credits: s.player.credits - POTION_PRICE,
      potions: { ...s.player.potions, [kind]: (s.player.potions[kind] ?? 0) + 1 },
    };
    set({ player });
    void patchArchive({ credits: player.credits, potions: player.potions });
    return true;
  },

  usePotion: (kind) => {
    const s = get();
    const used = consumePotion(s.player.potions, kind);
    if (!used) return false;

    const player: PlayerState = { ...s.player, potions: used.potions };
    // 恢复剂只作用于对应资源条，永远不回血
    if (kind === 'sp') player.sp = Math.min(100, player.sp + used.healed);
    else player.st = Math.min(100, player.st + used.healed);
    set({ player });
    void patchArchive({
      potions: player.potions,
      sp: player.sp,
      st: player.st,
    });
    return true;
  },

  sellWeapon: (id) => {
    const s = get();
    const w = s.player.weapons.find((x) => x.id === id);
    if (!w) return;
    const player: PlayerState = {
      ...s.player,
      credits: (s.player.credits ?? 0) + w.value,
      weapons: s.player.weapons.filter((x) => x.id !== id),
      equippedWeaponId: s.player.equippedWeaponId === id ? null : s.player.equippedWeaponId,
    };
    set({ player });
    void patchArchive({
      credits: player.credits,
      weapons: player.weapons,
      equippedWeaponId: player.equippedWeaponId,
    });
  },

  equipWeapon: (id) => {
    const s = get();
    const ok = id === null || s.player.weapons.some((w) => w.id === id);
    if (!ok) return;
    const player: PlayerState = { ...s.player, equippedWeaponId: id };
    set({ player });
    void patchArchive({ equippedWeaponId: id });
  },

  setAI: (cfg) => {
    saveAIConfig(cfg);
    set({ ai: cfg });
  },

  /* =======================================================
   * 启动：读 session → 查档案 → 决定落到哪个视图
   * ===================================================== */
  bootstrap: async () => {
    // AI 接入配置只存本地，启动时读回内存
    set({ ai: loadAIConfig(), netError: null });

    let acc: Account | null = null;
    try {
      acc = await readSessionAccount();
    } catch {
      // 连不上服务端：别再转圈，直接给出重试卡片
      set({ authReady: true, netError: 'NETWORK_UNREACHABLE' });
      return;
    }

    if (!acc) {
      set({ account: null, authReady: true, phase: 'AUTH', hasArchive: false });
      return;
    }

    try {
      const { archive, user } = await fetchArchive();
      const account: Account = {
        id: acc.id,
        username: user?.username || acc.username,
        playerNo: user?.playerNo ?? 0,
      };

      if (archive && archive.status === 'alive') {
        set({ account, player: hydrate(archive), hasArchive: true, authReady: true, phase: 'LOBBY' });
      } else {
        // 无档案 / 档案已销毁 → 重新建档：先拉占用列表，再分发身份
        set({ account, player: { ...EMPTY_PLAYER }, hasArchive: false, authReady: true, phase: 'CHARACTER' });
        await get().loadTaken();
        get().rollStats();
      }
    } catch {
      set({ account: acc, hasArchive: false, authReady: true, phase: 'CHARACTER' });
      await get().loadTaken();
      get().rollStats();
    }
  },

  /** 登录后刷新账号信息（编号可能已变化） */
  refreshAccount: async () => {
    try {
      const { user } = await fetchArchive();
      if (user) {
        set((s) => ({
          account: s.account
            ? { ...s.account, username: user.username, playerNo: user.playerNo }
            : { id: user.id, username: user.username, playerNo: user.playerNo },
        }));
      }
    } catch {
      /* ignore */
    }
  },

  clearAuthError: () => set({ authError: null, authErrorKind: 'none' }),

  login: async (username, key) => {
    set({ submitting: true, authError: null, authErrorKind: 'none' });

    // 提交前先探一次代号是否存在，好把「账号错」和「密钥错」分开提示
    let exists: boolean | null = null;
    try {
      const r = await timeoutFetch(
        `/api/auth/check?username=${encodeURIComponent(username)}`,
        {},
        8000,
      );
      const data = (await r.json()) as { ok?: boolean; reason?: string };
      if (data.reason === TAKEN_REASON) exists = true;
      else if (data.ok === true) exists = false;
    } catch {
      exists = null; // 查不到就走兜底提示
    }

    let res: Awaited<ReturnType<typeof signIn>> | undefined;
    try {
      res = await signIn('credentials', { username, key, redirect: false });
    } catch {
      set({ submitting: false, authError: '网络异常，请稍后重试', authErrorKind: 'credentials' });
      return;
    }

    if (res?.error) {
      if (exists === false) {
        set({
          submitting: false,
          authErrorKind: 'no-user',
          authError: `代号「${username}」尚未注册`,
        });
      } else if (exists === true) {
        set({
          submitting: false,
          authErrorKind: 'bad-key',
          authError: '接入密钥错误，请重新输入',
        });
      } else {
        set({
          submitting: false,
          authErrorKind: 'credentials',
          authError: '档案代号或接入密钥错误',
        });
      }
      return;
    }

    await get().bootstrap();
    set({ submitting: false });
  },

  register: async (username, key) => {
    set({ submitting: true, authError: null, authErrorKind: 'none' });
    try {
      const r = await timeoutFetch(
        '/api/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, key }),
        },
        15000,
      );
      const data = (await r.json()) as { error?: string };
      if (!r.ok) {
        set({ submitting: false, authErrorKind: 'other', authError: data.error ?? '接入失败' });
        return;
      }
      await get().login(username, key);
    } catch {
      set({ submitting: false, authErrorKind: 'other', authError: '网络异常，请稍后重试' });
    }
  },

  logout: async () => {
    await signOut({ redirect: false });
    set({ account: null, hasArchive: false, player: { ...EMPTY_PLAYER }, phase: 'AUTH' });
  },

  /** 确认建档 → POST /api/archive 写入数据库（身份与异能终身锁定） */
  confirmCharacter: async () => {
    const st = get();
    if (!st.player.name.trim()) return;
    set({ submitting: true });
    try {
      const { playerNo, archive, reassigned } = await apiCreateArchive({
        username: st.player.name.trim(),
        identity: st.player.name.trim(),
        str: st.player.str,
        int: st.player.int,
        agi: st.player.agi,
        rating: rankOf(st.player),
        currentRole: st.player.role,
        ability: st.player.ability,
      });

      // 服务端可能因占用而改派身份，一律以返回为准
      const finalName = archive?.identity || st.player.name.trim();
      const finalAbility = archive
        ? {
            ...st.player.ability,
            name: archive.abilityName || st.player.ability?.name || '',
            desc: archive.abilityDesc || st.player.ability?.desc || '',
            rarity: (archive.abilityRarity as AbilitySnapshot['rarity']) ?? 'common',
          }
        : st.player.ability;

      set({
        submitting: false,
        hasArchive: true,
        player: {
          ...st.player,
          name: finalName,
          role: archive?.identityCategory || st.player.role,
          ability: finalAbility,
          rank: rankOf(st.player),
        },
        takenIdentities: [...new Set([...st.takenIdentities, finalName])],
        identityRemaining: Math.max(0, st.identityRemaining - 1),
        authError: null,
        authErrorKind: 'none',
        account: st.account ? { ...st.account, playerNo: playerNo || st.account.playerNo } : null,
        phase: 'DIFFICULTY',
      });
    } catch (e) {
      set({
        submitting: false,
        authError: e instanceof Error ? e.message : '建档失败，请重试',
        authErrorKind: 'other',
      });
    }
  },

  chooseDifficulty: (d) => set({ difficulty: d }),

  chooseScenario: (s) =>
    set((st) => {
      const player = { ...st.player, clueTotal: s.clueTotal, turn: 0, clues: 0 };
      const raw = `>> 实例已挂载：${s.title}　难度：${st.difficulty.toUpperCase()}`;
      const logs: LogEntry[] = [
        { id: uid(), role: 'system', raw, tokens: [{ kind: 'text', text: raw }] },
      ];
      // 进入副本：把难度 / 剧本 / 身份写回数据库，刷新可恢复
      void patchArchive({
        difficulty: st.difficulty,
        scenarioId: s.id,
        scenarioName: s.title,
        currentRole: st.player.role,
        turn: 0,
      });
      return {
        scenario: s,
        player,
        logs,
        options: ['A. 向前', 'B. 观察四周', 'C. 保持沉默'],
        phase: 'GAMEPLAY',
      };
    }),

  /* =======================================================
   * 一个回合：发行动 → 拿结果 → 渲染 → 落库
   * ===================================================== */
  submitAction: async (input) => {
    const st = get();
    if (st.busy || !st.scenario) return;
    set({ busy: true });

    set({ logs: pushLog(st.logs, 'player', input) });

    const history = st.logs.slice(-6).map((l) => ({
      role: (l.role === 'player' ? 'player' : 'system') as 'player' | 'system',
      content: l.raw,
    }));

    let result;
    try {
      result = await sendAction({
        playerState: st.player,
        userInput: input,
        scenarioId: st.scenario.id,
        difficulty: st.difficulty,
        history,
        // 玩家自带密钥随请求走后端代理，服务端不落库
        ai: get().ai,
        scenarioTitle: st.scenario.title,
        scenarioBlurb: st.scenario.blurb,
      });
    } catch {
      const after0 = get();
      set({
        logs: pushLog(after0.logs, 'system', '>> 后端无响应。本回合作废，请重试。'),
        busy: false,
      });
      return;
    }

    const after = get();
    let logs = pushLog(after.logs, 'narration', result.narrative);

    /**
     * 应用状态补丁：patch 里的 hp/sp/st 是增量，落库存绝对值。
     * 生存规则：副本内 HP 不可恢复（异能具备治疗语义时例外）。
     */
    const patch = result.patch ?? {};
    const v0 = (n: number) => Math.max(0, Math.min(100, n));
    const hpDelta = patch.hp ?? 0;
    const hpApplied = hpDelta > 0 && !abilityHealsHp(after.player.ability) ? 0 : hpDelta;

    const player: PlayerState = {
      ...after.player,
      ...patch,
      hp: v0(after.player.hp + hpApplied),
      sp: v0(after.player.sp + (patch.sp ?? 0)),
      st: v0(after.player.st + (patch.st ?? 0)),
      clues: Math.max(0, patch.clues ?? after.player.clues),
      turn: patch.turn ?? after.player.turn + 1,
      // 击杀与积分是增量累计（掉落由解析器标签给出）
      credits: Math.max(0, after.player.credits + (patch.credits ?? 0)),
      kills: Math.max(0, after.player.kills + (patch.kills ?? 0)),
      weapons: sanitizeWeapons(patch.weapons ?? after.player.weapons),
      potions: sanitizePotions(patch.potions ?? after.player.potions),
    };
    if (hpApplied !== hpDelta) {
      logs = pushLog(
        logs,
        'system',
        '>> 生命值在副本内无法回复。只有离开副本才会恢复。',
      );
    }

    /* ---- 击杀结算：发积分 + 概率掉落宿主身上的武器 ---- */
    const killNames = extractKills(result.narrative);
    if (killNames.length > 0) {
      player.kills = player.kills + killNames.length;
      player.credits = player.credits + killNames.length * KILL_CREDITS;
      for (const host of killNames) {
        if (Math.random() < DROP_RATE) {
          player.weapons = [...player.weapons, rollWeaponDrop(host)];
        }
      }
    }
    // 显式掉落标签：LLM 点名的武器直接入库（属性档位仍随机）
    for (const name of extractLootNames(result.narrative)) {
      const w = rollWeaponDrop(name);
      player.weapons = [...player.weapons, { ...w, name: name.slice(0, 24) }];
    }
    if (player.weapons.length > 40) player.weapons = player.weapons.slice(-40);

    /* ---- 死亡判定：HP 或 SP 归零即强制 BadEnding ---- */
    let ending = result.ending;
    let endingTitle = result.endingTitle ?? '';
    const dead = player.hp <= 0 || player.sp <= 0;
    if (dead) {
      ending = 'BE';
      endingTitle =
        player.hp <= 0 ? 'BAD END · 生命体征归零' : 'BAD END · 精神彻底崩解';
      player.hp = Math.min(player.hp, 0);
      player.sp = Math.min(player.sp, 0);
    } else if (ending && ending !== 'BE') {
      // 离开副本：生命 / 精神 / 体力全部恢复满
      player.hp = 100;
      player.sp = 100;
      player.st = 100;
    }

    if (ending) {
      logs = [
        ...logs,
        {
          id: uid(),
          role: 'result',
          raw: endingTitle || '结局',
          tokens: [{ kind: 'text', text: endingTitle || '结局' }],
        },
      ];
    }

    // 通关结算：发放成长点与积分（BE 死亡不发，档案随后被销毁）
    const reward = ending ? growthReward(ending, st.difficulty) : 0;
    if (reward > 0) player.growthPoints = player.growthPoints + reward;
    const payout = ending ? clearCredits(ending, st.difficulty) : 0;
    if (payout > 0) player.credits = player.credits + payout;

    set({
      logs,
      player,
      options: result.options,
      busy: false,
      lastReward: reward,
      lastPayout: payout,
    });

    // 同步到数据库（HP / SP / ST / 线索 / 回合 / 成长点 / 战利品 / 当前剧本）
    void patchArchive({
      hp: player.hp,
      sp: player.sp,
      st: player.st,
      turn: player.turn,
      growthPoints: player.growthPoints,
      credits: player.credits,
      potions: player.potions,
      weapons: player.weapons,
      equippedWeaponId: player.equippedWeaponId,
      kills: player.kills,
      currentClues: Array.from({ length: player.clues }, (_, i) => `clue-${i + 1}`),
      scenarioId: after.scenario?.id ?? null,
      scenarioName: after.scenario?.title ?? null,
      currentRole: player.role,
      difficulty: get().difficulty,
      status: ending === 'BE' ? 'dead' : 'alive',
    });

    if (ending) {
      set({ ending, endingTitle, phase: 'ENDING' });
    }
  },

  markDone: (id) =>
    set((s) => ({ logs: s.logs.map((l) => (l.id === id ? { ...l, done: true } : l)) })),

  destroyField: (field) => set((s) => ({ destroyed: [...s.destroyed, field] })),

  /** BE：每打印一行，把数据库里对应字段清掉 */
  purgeField: async (field) => {
    set((s) => ({ destroyed: [...s.destroyed, field] }));
    const dbField = PURGE_MAP[field];
    if (dbField) {
      try {
        await wipeArchiveField(dbField);
      } catch {
        /* 清库失败不阻塞动画 */
      }
    }
  },

  /** BE 收尾：物理删除整条档案（账号保留） */
  finalizePurge: async () => {
    try {
      await apiDeleteArchive();
    } catch {
      /* ignore */
    }
    set({ hasArchive: false });
  },

  triggerEnding: (type, title) => set({ ending: type, endingTitle: title ?? '', phase: 'ENDING' }),

  reset: async () => {
    const s = get();
    // 档案已销毁 → 回建档（刷新占用列表后重新分发身份）；仍存活 → 回主页
    if (s.hasArchive) {
      set({
        phase: 'LOBBY',
        scenario: null,
        logs: [],
        destroyed: [],
        busy: false,
        options: ['A. 等待', 'B. 观察', 'C. 后退'],
      });
      return;
    }

    await get().loadTaken();
    const { stats, role, identity, entry } = freshRoll(get().takenIdentities);
    set({
      phase: 'CHARACTER',
      player: {
        ...EMPTY_PLAYER,
        ...stats,
        name: identity,
        role,
        ability: {
          name: entry.ability,
          desc: entry.desc,
          rarity: entry.rarity,
          bonus: `【${entry.ability}】${entry.desc}`,
          category: entry.category,
        },
        rank: rankOf(stats),
      },
      scenario: null,
      logs: [],
      destroyed: [],
      busy: false,
      options: ['A. 等待', 'B. 观察', 'C. 后退'],
    });
  },
}));

/** 便捷选择器 */
export const selectTotal = (p: PlayerState) => totalScore(p);
