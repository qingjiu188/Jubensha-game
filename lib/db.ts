/* =========================================================
 * 数据访问层（双模）
 * ---------------------------------------------------------
 * 模式 A：Prisma + MySQL
 *   - DATABASE_URL 已配置，且 TCP 探测数据库端口可达时才启用
 *   - 端口不通 / 未配置 → 绝不 import @prisma/client，
 *     避免「Prisma Client 未生成」导致整站构建或运行失败
 *
 * 模式 B：本地 JSON 文件（.data/db.json）
 *   - 与 MySQL 行为完全一致的 CRUD，用于无数据库环境跑通全流程
 *
 * 上层（API Route）只调用本文件导出的函数，不感知底层是哪种模式。
 * ========================================================= */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomUUID } from 'node:crypto';

/* ---------------- 类型 ---------------- */

export interface DbUser {
  id: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface DbArchive {
  id: string;
  userId: string;
  username: string;
  str: number;
  int: number;
  agi: number;
  hp: number;
  sp: number;
  st: number;
  rating: string;
  growthPoints: number;
  status: 'alive' | 'dead';
  currentClues: string[];
  difficulty: string | null;
  scenarioId: string | null;
  scenarioName: string | null;
  currentRole: string | null;
  turn: number;
  createdAt: string;
  updatedAt: string;
}

export type ArchiveCreateInput = Omit<DbArchive, 'id' | 'createdAt' | 'updatedAt'>;
export type ArchivePatch = Partial<Omit<DbArchive, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

/* ---------------- JSON 文件存储 ---------------- */

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

interface JsonStore {
  users: DbUser[];
  archives: DbArchive[];
}

let cache: JsonStore | null = null;

async function readStore(): Promise<JsonStore> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    cache = JSON.parse(raw) as JsonStore;
  } catch {
    cache = { users: [], archives: [] };
  }
  return cache;
}

async function writeStore(next: JsonStore): Promise<void> {
  cache = next;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), 'utf8');
}

const now = () => new Date().toISOString();

/* ---------------- Prisma 探测 ---------------- */

type PrismaState = 'unknown' | 'ready' | 'off';
let prismaState: PrismaState = 'unknown';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prismaClient: any = null;

/** 解析 DATABASE_URL 得到 host/port，做一次 250ms 的 TCP 探测 */
function tcpProbe(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const host = u.hostname || '127.0.0.1';
      const port = Number(u.port || (u.protocol === 'mysql:' ? 3306 : 5432));
      const socket = net.connect({ host, port });
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 250);
      socket.once('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/** 返回可用的 PrismaClient，不可用返回 null（结果会被缓存） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPrisma(): Promise<any> {
  if (prismaState === 'ready') return prismaClient;
  if (prismaState === 'off') return null;

  const url = process.env.DATABASE_URL;
  if (!url) {
    prismaState = 'off';
    return null;
  }
  if (!(await tcpProbe(url))) {
    prismaState = 'off';
    return null;
  }

  try {
    // webpackIgnore：让打包器不要静态解析 Prisma 内部路径，
    // 这样即使 Prisma Client 未生成，也不会导致构建失败。
    const mod = (await import(/* webpackIgnore: true */ '@prisma/client')) as unknown as {
      PrismaClient?: new () => {
        $queryRawUnsafe: (q: string) => Promise<unknown>;
      };
      default?: { PrismaClient?: new () => { $queryRawUnsafe: (q: string) => Promise<unknown> } };
    };
    const PrismaCtor = mod.PrismaClient ?? mod.default?.PrismaClient;
    if (!PrismaCtor) {
      prismaState = 'off';
      return null;
    }
    const client = new PrismaCtor();
    await client.$queryRawUnsafe('SELECT 1');
    prismaClient = client;
    prismaState = 'ready';
    return client;
  } catch {
    prismaState = 'off';
    return null;
  }
}

/** 当前生效的存储模式（给 API 返回，便于调试） */
export async function storageMode(): Promise<'mysql' | 'json'> {
  return (await getPrisma()) ? 'mysql' : 'json';
}

/* ---------------- Prisma 行 → 统一结构 ---------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapArchive(a: any): DbArchive {
  return {
    id: a.id,
    userId: a.userId,
    username: a.username,
    str: a.str,
    int: a.int,
    agi: a.agi,
    hp: a.hp,
    sp: a.sp,
    st: a.st,
    rating: a.rating,
    growthPoints: a.growthPoints,
    status: a.status === 'dead' ? 'dead' : 'alive',
    currentClues: Array.isArray(a.currentClues) ? (a.currentClues as string[]) : [],
    difficulty: a.difficulty ?? null,
    scenarioId: a.scenarioId ?? null,
    scenarioName: a.scenarioName ?? null,
    currentRole: a.currentRole ?? null,
    turn: a.turn ?? 0,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
    updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : String(a.updatedAt),
  };
}

/* =========================================================
 * User
 * ========================================================= */

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const key = email.trim().toLowerCase();
  const p = await getPrisma();
  if (p) {
    const u = await p.user.findUnique({ where: { email: key } });
    return u ? { id: u.id, email: u.email, password: u.password, createdAt: u.createdAt.toISOString() } : null;
  }
  const store = await readStore();
  return store.users.find((u) => u.email === key) ?? null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const p = await getPrisma();
  if (p) {
    const u = await p.user.findUnique({ where: { id } });
    return u ? { id: u.id, email: u.email, password: u.password, createdAt: u.createdAt.toISOString() } : null;
  }
  const store = await readStore();
  return store.users.find((u) => u.id === id) ?? null;
}

export async function createUser(email: string, passwordHash: string): Promise<DbUser> {
  const key = email.trim().toLowerCase();
  const p = await getPrisma();
  if (p) {
    const u = await p.user.create({ data: { email: key, password: passwordHash } });
    return { id: u.id, email: u.email, password: u.password, createdAt: u.createdAt.toISOString() };
  }
  const store = await readStore();
  const user: DbUser = { id: randomUUID(), email: key, password: passwordHash, createdAt: now() };
  await writeStore({ ...store, users: [...store.users, user] });
  return user;
}

/* =========================================================
 * Archive
 * ========================================================= */

export async function getArchive(userId: string): Promise<DbArchive | null> {
  const p = await getPrisma();
  if (p) {
    const a = await p.archive.findUnique({ where: { userId } });
    return a ? mapArchive(a) : null;
  }
  const store = await readStore();
  return store.archives.find((a) => a.userId === userId) ?? null;
}

export async function createArchive(input: ArchiveCreateInput): Promise<DbArchive> {
  const p = await getPrisma();
  if (p) {
    const a = await p.archive.create({
      data: {
        userId: input.userId,
        username: input.username,
        str: input.str,
        int: input.int,
        agi: input.agi,
        hp: input.hp,
        sp: input.sp,
        st: input.st,
        rating: input.rating,
        growthPoints: input.growthPoints,
        status: input.status ?? 'alive',
        currentClues: input.currentClues ?? [],
        difficulty: input.difficulty,
        scenarioId: input.scenarioId,
        scenarioName: input.scenarioName,
        currentRole: input.currentRole,
        turn: input.turn ?? 0,
      },
    });
    return mapArchive(a);
  }
  const store = await readStore();
  const ts = now();
  const archive: DbArchive = {
    id: randomUUID(),
    createdAt: ts,
    updatedAt: ts,
    status: 'alive',
    growthPoints: 0,
    currentClues: [],
    difficulty: null,
    scenarioId: null,
    scenarioName: null,
    currentRole: null,
    turn: 0,
    ...input,
  };
  await writeStore({
    ...store,
    archives: [...store.archives.filter((a) => a.userId !== input.userId), archive],
  });
  return archive;
}

export async function updateArchive(userId: string, patch: ArchivePatch): Promise<DbArchive | null> {
  const p = await getPrisma();
  if (p) {
    const exists = await p.archive.findUnique({ where: { userId } });
    if (!exists) return null;
    const a = await p.archive.update({
      where: { userId },
      data: {
        ...patch,
        ...(patch.currentClues ? { currentClues: patch.currentClues } : {}),
      },
    });
    return mapArchive(a);
  }
  const store = await readStore();
  const idx = store.archives.findIndex((a) => a.userId === userId);
  if (idx < 0) return null;
  const next: DbArchive = { ...store.archives[idx], ...patch, updatedAt: now() };
  const archives = [...store.archives];
  archives[idx] = next;
  await writeStore({ ...store, archives });
  return next;
}

/** 物理删除档案（死亡即销毁） */
export async function deleteArchive(userId: string): Promise<boolean> {
  const p = await getPrisma();
  if (p) {
    try {
      await p.archive.delete({ where: { userId } });
      return true;
    } catch {
      return false;
    }
  }
  const store = await readStore();
  const before = store.archives.length;
  const archives = store.archives.filter((a) => a.userId !== userId);
  await writeStore({ ...store, archives });
  return archives.length < before;
}

/**
 * BE 销毁动画的逐行清库：把某个字段置空。
 * 与界面上「每打印一行，对应 UI 元素消失」一一对应。
 */
export async function wipeField(userId: string, field: keyof DbArchive): Promise<void> {
  const table: Partial<Record<keyof DbArchive, ArchivePatch>> = {
    username: { username: '' },
    str: { str: 0 },
    int: { int: 0 },
    agi: { agi: 0 },
    hp: { hp: 0 },
    sp: { sp: 0 },
    st: { st: 0 },
    rating: { rating: '—' },
    growthPoints: { growthPoints: 0 },
    currentClues: { currentClues: [] },
    currentRole: { currentRole: null },
    difficulty: { difficulty: null },
    scenarioId: { scenarioId: null },
    scenarioName: { scenarioName: null },
    turn: { turn: 0 },
    status: { status: 'dead' },
  };
  const patch = table[field];
  if (!patch) return;
  await updateArchive(userId, patch);
}
