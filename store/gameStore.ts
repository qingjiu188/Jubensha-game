'use client';

import { create } from 'zustand';
import { signIn, signOut } from 'next-auth/react';
import type {
  DifficultyId,
  EndingType,
  LogEntry,
  Phase,
  PlayerState,
  Scenario,
  Token,
} from '@/types';
import { parseNarrative } from '@/lib/parser';
import { rankOf, totalScore } from '@/lib/rank';
import { ROLE_POOL } from '@/lib/mock';
import { sendAction } from '@/lib/api';
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

/** BE 销毁清单的 target → 数据库字段 */
const PURGE_MAP: Record<string, keyof DbArchive> = {
  role: 'currentRole',
  str: 'str',
  int: 'int',
  agi: 'agi',
  clues: 'currentClues',
  rank: 'rating',
  name: 'username',
  instance: 'turn',
};

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
  /** BE 销毁动画已经抹除的字段 */
  destroyed: string[];

  /* ---------- 登录态 ---------- */
  userEmail: string | null;
  authReady: boolean;
  /** 数据库里是否已存在存活档案 */
  hasArchive: boolean;
  authError: string | null;
  submitting: boolean;

  /* ---------- 动作 ---------- */
  go: (p: Phase) => void;
  setName: (name: string) => void;
  rollStats: () => void;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  confirmCharacter: () => Promise<void>;
  chooseDifficulty: (d: DifficultyId) => void;
  chooseScenario: (s: Scenario) => void;
  submitAction: (input: string) => Promise<void>;
  markDone: (id: string) => void;
  destroyField: (field: string) => void;
  purgeField: (field: string) => Promise<void>;
  finalizePurge: () => Promise<void>;
  triggerEnding: (type: EndingType, title?: string) => void;
  reset: () => void;
}

const EMPTY_PLAYER: PlayerState = {
  name: '',
  role: '未登记',
  hp: 100,
  sp: 100,
  st: 100,
  str: 10,
  int: 10,
  agi: 10,
  rank: 'F',
  clues: 0,
  clueTotal: 5,
  turn: 0,
};

/** 追加一条日志（自动走解析器） */
function pushLog(list: LogEntry[], role: LogEntry['role'], raw: string): LogEntry[] {
  const tokens: Token[] =
    role === 'system' || role === 'player' ? [{ kind: 'text', text: raw }] : parseNarrative(raw);
  return [...list, { id: uid(), role, raw, tokens }];
}

/** 数据库记录 → 前端 PlayerState */
function hydrate(a: DbArchive): PlayerState {
  return {
    name: a.username,
    role: a.currentRole ?? '未登记',
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
  };
}

async function readSessionEmail(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/session', { cache: 'no-store' });
    const data = (await res.json()) as { user?: { email?: string } };
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
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
  destroyed: [],

  userEmail: null,
  authReady: false,
  hasArchive: false,
  authError: null,
  submitting: false,

  go: (p) => set({ phase: p }),

  setName: (name) => set((s) => ({ player: { ...s.player, name } })),

  /** 随机生成三维属性，并同步评级 */
  rollStats: () =>
    set((s) => {
      const roll = () => 3 + Math.floor(Math.random() * 18); // 3~20
      const stats = { str: roll(), int: roll(), agi: roll() };
      const role = ROLE_POOL[Math.floor(Math.random() * ROLE_POOL.length)];
      return {
        player: { ...s.player, ...stats, role, rank: rankOf(stats) },
      };
    }),

  /* =======================================================
   * 启动：读 session → 查档案 → 决定落到哪个视图
   * ===================================================== */
  bootstrap: async () => {
    const email = await readSessionEmail();
    if (!email) {
      set({ userEmail: null, authReady: true, phase: 'AUTH', hasArchive: false });
      return;
    }
    set({ userEmail: email });

    try {
      const { archive } = await fetchArchive();
      if (archive && archive.status === 'alive') {
        set({
          player: hydrate(archive),
          hasArchive: true,
          authReady: true,
          phase: 'LOBBY',
        });
      } else {
        // 无档案 / 档案已销毁 → 重新建档
        set({ player: { ...EMPTY_PLAYER }, hasArchive: false, authReady: true, phase: 'CHARACTER' });
        get().rollStats();
      }
    } catch {
      set({ hasArchive: false, authReady: true, phase: 'CHARACTER' });
      get().rollStats();
    }
  },

  login: async (email, password) => {
    set({ submitting: true, authError: null });
    const res = await signIn('credentials', { email, password, redirect: false });
    if (res?.error) {
      set({ submitting: false, authError: '邮箱或密码错误' });
      return;
    }
    await get().bootstrap();
    set({ submitting: false });
  },

  register: async (email, password) => {
    set({ submitting: true, authError: null });
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) {
        set({ submitting: false, authError: data.error ?? '注册失败' });
        return;
      }
      await get().login(email, password);
    } catch {
      set({ submitting: false, authError: '网络异常' });
    }
  },

  logout: async () => {
    await signOut({ redirect: false });
    set({ userEmail: null, hasArchive: false, player: { ...EMPTY_PLAYER }, phase: 'AUTH' });
  },

  /** 确认建档 → POST /api/archive 写入数据库 */
  confirmCharacter: async () => {
    const st = get();
    if (!st.player.name.trim()) return;
    set({ submitting: true });
    try {
      await apiCreateArchive({
        username: st.player.name.trim(),
        str: st.player.str,
        int: st.player.int,
        agi: st.player.agi,
        rating: rankOf(st.player),
        currentRole: st.player.role,
      });
      set({
        submitting: false,
        hasArchive: true,
        player: { ...st.player, rank: rankOf(st.player) },
        phase: 'DIFFICULTY',
      });
    } catch {
      set({ submitting: false, authError: '建档失败，请重试' });
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

    // 应用状态补丁：patch 里的 hp/sp/st 是增量，落库存绝对值
    const patch = result.patch ?? {};
    const player: PlayerState = {
      ...after.player,
      ...patch,
      hp: Math.max(0, Math.min(100, after.player.hp + (patch.hp ?? 0))),
      sp: Math.max(0, Math.min(100, after.player.sp + (patch.sp ?? 0))),
      st: Math.max(0, Math.min(100, after.player.st + (patch.st ?? 0))),
      clues: Math.max(0, patch.clues ?? after.player.clues),
      turn: patch.turn ?? after.player.turn + 1,
    };

    if (result.ending) {
      logs = [
        ...logs,
        {
          id: uid(),
          role: 'result',
          raw: result.endingTitle ?? '结局',
          tokens: [{ kind: 'text', text: result.endingTitle ?? '结局' }],
        },
      ];
    }

    set({ logs, player, options: result.options, busy: false });

    // 同步到数据库（HP / SP / ST / 线索 / 回合 / 当前剧本）
    void patchArchive({
      hp: player.hp,
      sp: player.sp,
      st: player.st,
      turn: player.turn,
      currentClues: Array.from({ length: player.clues }, (_, i) => `clue-${i + 1}`),
      scenarioId: after.scenario?.id ?? null,
      scenarioName: after.scenario?.title ?? null,
      currentRole: player.role,
      difficulty: get().difficulty,
      status: result.ending === 'BE' ? 'dead' : 'alive',
    });

    if (result.ending) {
      set({ ending: result.ending, endingTitle: result.endingTitle ?? '', phase: 'ENDING' });
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

  /** BE 收尾：物理删除整条档案 */
  finalizePurge: async () => {
    try {
      await apiDeleteArchive();
    } catch {
      /* ignore */
    }
    set({ hasArchive: false });
  },

  triggerEnding: (type, title) => set({ ending: type, endingTitle: title ?? '', phase: 'ENDING' }),

  reset: () => {
    const s = get();
    // 档案已销毁 → 回建档（掷新属性）；仍存活 → 回主页
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

    const roll = () => 3 + Math.floor(Math.random() * 18);
    const stats = { str: roll(), int: roll(), agi: roll() };
    const role = ROLE_POOL[Math.floor(Math.random() * ROLE_POOL.length)];
    set({
      phase: 'CHARACTER',
      player: { ...EMPTY_PLAYER, ...stats, role, rank: rankOf(stats) },
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
