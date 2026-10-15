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
 *
 * ★ 账号层 vs 角色层
 *   User     —— 死亡不清零（论坛、好友、编号都挂在这里）
 *   Archive  —— 死亡即物理删除
 * ========================================================= */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import type { Weapon } from '@/types';

/* ---------------- 类型 ---------------- */

export interface DbUser {
  id: string;
  username: string;
  keyHash: string;
  playerNo: number;
  currentArchiveId: string | null;
  /** 第几代档案：0=未建档，1=首次，2+=死亡后重建 */
  archiveGen: number;
  createdAt: string;
}

export interface DbArchive {
  id: string;
  userId: string;
  username: string;
  /** 系统分发的身份（全局唯一，死亡随档案释放） */
  identity: string | null;
  /** 身份所属类别 */
  identityCategory: string | null;
  /** 玩家自定义的角色名字 */
  displayName: string | null;
  /** 性别：male / female / other / hidden */
  gender: string | null;
  /** 样貌自述 */
  appearance: string | null;
  str: number;
  int: number;
  agi: number;
  hp: number;
  sp: number;
  st: number;
  rating: string;
  growthPoints: number;
  /** 积分（商城货币） */
  credits: number;
  /** 恢复剂存量 { sp, st } */
  potions: { sp: number; st: number };
  /** 武器库 */
  weapons: Weapon[];
  /** 装备中的武器 id */
  equippedWeaponId: string | null;
  /** 累计击杀 */
  kills: number;
  abilityName: string;
  abilityDesc: string;
  abilityRarity: string;
  status: 'alive' | 'dead';
  currentClues: string[];
  difficulty: string | null;
  scenarioId: string | null;
  scenarioName: string | null;
  currentRole: string | null;
  turn: number;
  updatedAt: string;
}

export type ArchiveCreateInput = Omit<DbArchive, 'id' | 'updatedAt'>;
export type ArchivePatch = Partial<Omit<DbArchive, 'id' | 'userId' | 'updatedAt'>>;

export interface DbPost {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  repostOfId: string | null;
  createdAt: string;
}

export interface DbComment {
  id: string;
  userId: string;
  postId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
}

export interface DbFriendship {
  id: string;
  user1Id: string;
  user2Id: string;
  status: 'pending' | 'accepted';
  createdAt: string;
}

/** 列表项：帖子 + 作者信息 + 计数 + 当前用户态 */
export interface PostListItem extends DbPost {
  author: { id: string; username: string; playerNo: number };
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  liked: boolean;
  favorited: boolean;
  repostOf: { id: string; title: string; author: string } | null;
}

/** 评论树节点（楼中楼） */
export interface CommentNode extends DbComment {
  author: { id: string; username: string; playerNo: number };
  children: CommentNode[];
}

/** 好友列表项 */
export interface FriendItem {
  friendshipId: string;
  user: { id: string; username: string; playerNo: number };
  status: 'pending' | 'accepted';
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  /** 对方当前角色状态 */
  archiveStatus: 'alive' | 'dead' | 'none';
  archiveName: string | null;
  rating: string | null;
}

/* ---------------- JSON 文件存储 ---------------- */

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

interface JsonStore {
  users: DbUser[];
  archives: DbArchive[];
  posts: DbPost[];
  comments: DbComment[];
  likes: { id: string; userId: string; postId: string }[];
  favorites: { id: string; userId: string; postId: string }[];
  friendships: DbFriendship[];
}

const EMPTY: JsonStore = {
  users: [],
  archives: [],
  posts: [],
  comments: [],
  likes: [],
  favorites: [],
  friendships: [],
};

/** 兼容旧版 JSON 数据（缺字段的记录会被补默认值或直接丢弃） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeStore(raw: Partial<JsonStore>): JsonStore {
  const users = (raw.users ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((u: any) => typeof u?.username === 'string' && u.username.length > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((u: any) => ({
      ...u,
      playerNo: Number(u.playerNo) || 0,
      archiveGen: Number(u.archiveGen) || 0,
      currentArchiveId: u.currentArchiveId ?? null,
    })) as DbUser[];

  const userIds = new Set(users.map((u) => u.id));

  return {
    users,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    archives: ((raw.archives ?? []) as any[]).filter((a) => userIds.has(a.userId)).map((a) => ({
      ...a,
      identity: a.identity ?? null,
      identityCategory: a.identityCategory ?? null,
      displayName: a.displayName ?? null,
      gender: a.gender ?? null,
      appearance: a.appearance ?? null,
      abilityName: a.abilityName ?? '—',
      abilityDesc: a.abilityDesc ?? '',
      abilityRarity: a.abilityRarity ?? 'common',
      credits: Number(a.credits) || 0,
      potions: normalizePotions(a.potions),
      weapons: normalizeWeapons(a.weapons),
      equippedWeaponId: typeof a.equippedWeaponId === 'string' ? a.equippedWeaponId : null,
      kills: Number(a.kills) || 0,
      currentClues: Array.isArray(a.currentClues) ? a.currentClues : [],
    })) as DbArchive[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    posts: ((raw.posts ?? []) as any[]).map((p) => ({
      ...p,
      tags: Array.isArray(p.tags) ? p.tags : [],
      repostOfId: p.repostOfId ?? null,
    })) as DbPost[],
    comments: (raw.comments ?? []) as DbComment[],
    likes: (raw.likes ?? []) as JsonStore['likes'],
    favorites: (raw.favorites ?? []) as JsonStore['favorites'],
    friendships: (raw.friendships ?? []) as DbFriendship[],
  };
}

/**
 * 每次都读文件，不做内存缓存。
 * 原因：Next 的服务端 bundle 可能让 lib/db 出现多个模块实例，
 * 进程内缓存会导致「A 实例写入、B 实例读不到」的脏读（注册后立刻登录失败）。
 * JSON 文件很小，每次读的开销可以忽略。
 */
async function readStore(): Promise<JsonStore> {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return normalizeStore(JSON.parse(raw) as Partial<JsonStore>);
  } catch {
    return { ...EMPTY };
  }
}

/**
 * Vercel 等 serverless 环境没有可写磁盘，JSON 降级在那里不可用。
 * 线上部署必须配 DATABASE_URL，否则写入时直接给出明确报错，
 * 而不是静默失败（否则会表现为「注册成功但登录不上」）。
 */
function assertWritable(): void {
  if (process.env.VERCEL && !process.env.DATABASE_URL) {
    throw new Error('SERVERLESS_NO_DATABASE：线上环境必须配置 DATABASE_URL');
  }
}

async function writeStore(next: JsonStore): Promise<void> {
  assertWritable();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), 'utf8');
}

const now = () => new Date().toISOString();

/** JSON 字段归零化：兼容缺失 / 脏数据 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePotions(raw: any): { sp: number; st: number } {
  const sp = Number(raw?.sp);
  const st = Number(raw?.st);
  return { sp: Number.isFinite(sp) && sp > 0 ? Math.floor(sp) : 0, st: Number.isFinite(st) && st > 0 ? Math.floor(st) : 0 };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeWeapons(raw: any): Weapon[] {
  if (!Array.isArray(raw)) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return raw.filter((w: any) => w && typeof w.name === 'string').map((w: any) => ({
    id: String(w.id ?? randomUUID()),
    name: String(w.name),
    from: String(w.from ?? '未知'),
    stat: w.stat === 'str' || w.stat === 'int' || w.stat === 'agi' ? w.stat : null,
    bonus: Number(w.bonus) || 0,
    value: Number(w.value) || 150,
  }));
}

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
      PrismaClient?: new () => { $queryRawUnsafe: (q: string) => Promise<unknown> };
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

/** 当前生效的存储模式 */
export async function storageMode(): Promise<'mysql' | 'json'> {
  return (await getPrisma()) ? 'mysql' : 'json';
}

/* ---------------- 行映射 ---------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iso = (v: any) => (v instanceof Date ? v.toISOString() : String(v ?? ''));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUser(u: any): DbUser {
  return {
    id: u.id,
    username: u.username,
    keyHash: u.keyHash,
    playerNo: Number(u.playerNo) || 0,
    currentArchiveId: u.currentArchiveId ?? null,
    archiveGen: Number(u.archiveGen) || 0,
    createdAt: iso(u.createdAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapArchive(a: any): DbArchive {
  return {
    id: a.id,
    userId: a.userId,
    username: a.username,
    identity: a.identity ?? null,
    identityCategory: a.identityCategory ?? null,
    displayName: a.displayName ?? null,
    gender: a.gender ?? null,
    appearance: a.appearance ?? null,
    str: a.str,
    int: a.int,
    agi: a.agi,
    hp: a.hp,
    sp: a.sp,
    st: a.st,
    rating: a.rating,
    growthPoints: Number(a.growthPoints) || 0,
    credits: Number(a.credits) || 0,
    potions: normalizePotions(a.potions),
    weapons: normalizeWeapons(a.weapons),
    equippedWeaponId: typeof a.equippedWeaponId === 'string' ? a.equippedWeaponId : null,
    kills: Number(a.kills) || 0,
    abilityName: a.abilityName ?? '—',
    abilityDesc: a.abilityDesc ?? '',
    abilityRarity: a.abilityRarity ?? 'common',
    status: a.status === 'dead' ? 'dead' : 'alive',
    currentClues: Array.isArray(a.currentClues) ? (a.currentClues as string[]) : [],
    difficulty: a.difficulty ?? null,
    scenarioId: a.scenarioId ?? null,
    scenarioName: a.scenarioName ?? null,
    currentRole: a.currentRole ?? null,
    turn: a.turn ?? 0,
    updatedAt: iso(a.updatedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPost(p: any): DbPost {
  return {
    id: p.id,
    userId: p.userId,
    title: p.title,
    content: p.content,
    tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
    repostOfId: p.repostOfId ?? null,
    createdAt: iso(p.createdAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComment(c: any): DbComment {
  return {
    id: c.id,
    userId: c.userId,
    postId: c.postId,
    content: c.content,
    parentId: c.parentId ?? null,
    createdAt: iso(c.createdAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFriendship(f: any): DbFriendship {
  return {
    id: f.id,
    user1Id: f.user1Id,
    user2Id: f.user2Id,
    status: f.status === 'accepted' ? 'accepted' : 'pending',
    createdAt: iso(f.createdAt),
  };
}

/* =========================================================
 * User —— 账号层
 * ========================================================= */

export async function findUserByUsername(username: string): Promise<DbUser | null> {
  const key = username.trim();
  const p = await getPrisma();
  if (p) {
    const u = await p.user.findUnique({ where: { username: key } });
    return u ? mapUser(u) : null;
  }
  const store = await readStore();
  return store.users.find((u) => u.username === key) ?? null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const p = await getPrisma();
  if (p) {
    const u = await p.user.findUnique({ where: { id } });
    return u ? mapUser(u) : null;
  }
  const store = await readStore();
  return store.users.find((u) => u.id === id) ?? null;
}

/** 按「档案代号」或「No.X」查找账号 */
export async function findUserByHandle(handle: string): Promise<DbUser | null> {
  const raw = handle.trim();
  const noMatch = /^(?:no\.?)?(\d+)$/i.exec(raw);
  if (noMatch) {
    const no = Number(noMatch[1]);
    const p = await getPrisma();
    if (p) {
      const u = await p.user.findUnique({ where: { playerNo: no } });
      return u ? mapUser(u) : null;
    }
    const store = await readStore();
    return store.users.find((u) => u.playerNo === no) ?? null;
  }
  return findUserByUsername(raw);
}

/** 新建账号：playerNo 取当前全局最大值 + 1 */
export async function createUser(username: string, keyHash: string): Promise<DbUser> {
  const key = username.trim();
  const p = await getPrisma();
  if (p) {
    const top = await p.user.findFirst({ orderBy: { playerNo: 'desc' }, select: { playerNo: true } });
    const u = await p.user.create({
      data: { username: key, keyHash, playerNo: (top?.playerNo ?? 0) + 1 },
    });
    return mapUser(u);
  }
  const store = await readStore();
  const playerNo = store.users.reduce((m, u) => Math.max(m, Number(u.playerNo) || 0), 0) + 1;
  const user: DbUser = {
    id: randomUUID(),
    username: key,
    keyHash,
    playerNo,
    currentArchiveId: null,
    archiveGen: 0,
    createdAt: now(),
  };
  await writeStore({ ...store, users: [...store.users, user] });
  return user;
}

/**
 * 推进档案世代：首次建档不换号，死亡后重建则 playerNo 递增。
 * 返回新的编号与世代。
 */
async function advanceGeneration(userId: string): Promise<{ playerNo: number; gen: number }> {
  const p = await getPrisma();
  if (p) {
    const u = await p.user.findUnique({ where: { id: userId } });
    if (!u) return { playerNo: 0, gen: 1 };
    const prevGen = Number(u.archiveGen ?? 0);
    const gen = prevGen + 1;
    let playerNo = Number(u.playerNo);
    if (prevGen > 0) {
      const top = await p.user.findFirst({ orderBy: { playerNo: 'desc' }, select: { playerNo: true } });
      playerNo = (top?.playerNo ?? 0) + 1;
    }
    await p.user.update({ where: { id: userId }, data: { archiveGen: gen, playerNo } });
    return { playerNo, gen };
  }
  const store = await readStore();
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx < 0) return { playerNo: 0, gen: 1 };
  const u = store.users[idx];
  const gen = (Number(u.archiveGen) || 0) + 1;
  let playerNo = Number(u.playerNo) || 0;
  if ((Number(u.archiveGen) || 0) > 0) {
    playerNo = store.users.reduce((m, x) => Math.max(m, Number(x.playerNo) || 0), 0) + 1;
  }
  const users = [...store.users];
  users[idx] = { ...u, archiveGen: gen, playerNo };
  await writeStore({ ...store, users });
  return { playerNo, gen };
}

/** 重建档案时递增编号（死亡不删号，只换编号） */
export async function bumpPlayerNo(userId: string): Promise<number> {
  const p = await getPrisma();
  if (p) {
    const top = await p.user.findFirst({ orderBy: { playerNo: 'desc' }, select: { playerNo: true } });
    const next = (top?.playerNo ?? 0) + 1;
    const u = await p.user.update({ where: { id: userId }, data: { playerNo: next } });
    return u.playerNo;
  }
  const store = await readStore();
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx < 0) return 0;
  const next = store.users.reduce((m, u) => Math.max(m, Number(u.playerNo) || 0), 0) + 1;
  const users = [...store.users];
  users[idx] = { ...users[idx], playerNo: next };
  await writeStore({ ...store, users });
  return next;
}

export async function setCurrentArchive(userId: string, archiveId: string | null): Promise<void> {
  const p = await getPrisma();
  if (p) {
    await p.user.update({ where: { id: userId }, data: { currentArchiveId: archiveId } });
    return;
  }
  const store = await readStore();
  const users = store.users.map((u) => (u.id === userId ? { ...u, currentArchiveId: archiveId } : u));
  await writeStore({ ...store, users });
}

/* =========================================================
 * Archive —— 角色层（死亡即物理删除）
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

/**
 * 已被占用的身份列表（全局唯一性校验用）。
 * 只统计有 identity 的档案：BE 销毁会先置 null 再物理删除，等于立即释放。
 */
export async function listTakenIdentities(): Promise<string[]> {
  const p = await getPrisma();
  if (p) {
    const rows = await p.archive.findMany({
      where: { identity: { not: null } },
      select: { identity: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => r.identity)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((x: any): x is string => typeof x === 'string' && !!x);
  }
  const store = await readStore();
  return store.archives.map((a) => a.identity).filter((x): x is string => typeof x === 'string' && !!x);
}

export async function createArchive(input: ArchiveCreateInput): Promise<DbArchive> {
  // 先推进世代：首次建档沿用注册时的编号，死亡后重建才递增
  await advanceGeneration(input.userId);

  const p = await getPrisma();
  if (p) {
    // 同一账号只保留一份档案
    await p.archive.deleteMany({ where: { userId: input.userId } });
    const a = await p.archive.create({
      data: {
        userId: input.userId,
        username: input.username,
        identity: input.identity ?? null,
        identityCategory: input.identityCategory ?? null,
        displayName: input.displayName ?? null,
        gender: input.gender ?? null,
        appearance: input.appearance ?? null,
        str: input.str,
        int: input.int,
        agi: input.agi,
        hp: input.hp,
        sp: input.sp,
        st: input.st,
        rating: input.rating,
        growthPoints: input.growthPoints,
        credits: input.credits ?? 0,
        potions: input.potions ?? { sp: 0, st: 0 },
        weapons: input.weapons ?? [],
        equippedWeaponId: input.equippedWeaponId ?? null,
        kills: input.kills ?? 0,
        abilityName: input.abilityName,
        abilityDesc: input.abilityDesc,
        abilityRarity: input.abilityRarity,
        status: input.status ?? 'alive',
        currentClues: input.currentClues ?? [],
        difficulty: input.difficulty,
        scenarioId: input.scenarioId,
        scenarioName: input.scenarioName,
        currentRole: input.currentRole,
        turn: input.turn ?? 0,
      },
    });
    await setCurrentArchive(input.userId, a.id);
    return mapArchive(a);
  }
  const store = await readStore();
  const archive: DbArchive = {
    ...input,
    id: randomUUID(),
    status: input.status ?? 'alive',
    updatedAt: now(),
  };
  await writeStore({
    ...store,
    archives: [...store.archives.filter((a) => a.userId !== input.userId), archive],
  });
  await setCurrentArchive(input.userId, archive.id);
  return archive;
}

export async function updateArchive(userId: string, patch: ArchivePatch): Promise<DbArchive | null> {
  const p = await getPrisma();
  if (p) {
    const exists = await p.archive.findUnique({ where: { userId } });
    if (!exists) return null;
    const a = await p.archive.update({ where: { userId }, data: { ...patch } });
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

/** 物理删除档案（死亡即销毁，账号保留） */
export async function deleteArchive(userId: string): Promise<boolean> {
  const p = await getPrisma();
  if (p) {
    try {
      await p.archive.delete({ where: { userId } });
      await setCurrentArchive(userId, null);
      return true;
    } catch {
      return false;
    }
  }
  const store = await readStore();
  const before = store.archives.length;
  const archives = store.archives.filter((a) => a.userId !== userId);
  await writeStore({ ...store, archives });
  await setCurrentArchive(userId, null);
  return archives.length < before;
}

/** BE 销毁动画的逐行清库：把某个字段置空 */
export async function wipeField(userId: string, field: keyof DbArchive): Promise<void> {
  const table: Partial<Record<keyof DbArchive, ArchivePatch>> = {
    username: { username: '' },
    // 身份销毁：清掉代号 + 释放占用（NULL 不占唯一索引）
    identity: { username: '', identity: null, identityCategory: null },
    str: { str: 0 },
    int: { int: 0 },
    agi: { agi: 0 },
    hp: { hp: 0 },
    sp: { sp: 0 },
    st: { st: 0 },
    rating: { rating: '—' },
    growthPoints: { growthPoints: 0 },
    credits: { credits: 0 },
    potions: { potions: { sp: 0, st: 0 } },
    weapons: { weapons: [], equippedWeaponId: null },
    kills: { kills: 0 },
    currentClues: { currentClues: [] },
    currentRole: { currentRole: null },
    difficulty: { difficulty: null },
    scenarioId: { scenarioId: null },
    scenarioName: { scenarioName: null },
    turn: { turn: 0 },
    abilityName: { abilityName: '—' },
    abilityDesc: { abilityDesc: '' },
    abilityRarity: { abilityRarity: 'common' },
    status: { status: 'dead' },
  };
  const patch = table[field];
  if (!patch) return;
  await updateArchive(userId, patch);
}

/* =========================================================
 * 社区论坛
 * ========================================================= */

export async function createPost(input: {
  userId: string;
  title: string;
  content: string;
  tags: string[];
  repostOfId?: string | null;
}): Promise<DbPost> {
  const p = await getPrisma();
  if (p) {
    const post = await p.post.create({
      data: {
        userId: input.userId,
        title: input.title,
        content: input.content,
        tags: input.tags,
        repostOfId: input.repostOfId ?? null,
      },
    });
    return mapPost(post);
  }
  const store = await readStore();
  const post: DbPost = {
    id: randomUUID(),
    userId: input.userId,
    title: input.title,
    content: input.content,
    tags: input.tags,
    repostOfId: input.repostOfId ?? null,
    createdAt: now(),
  };
  await writeStore({ ...store, posts: [post, ...store.posts] });
  return post;
}

export async function listPosts(opts: {
  viewerId?: string | null;
  tag?: string | null;
  query?: string | null;
}): Promise<PostListItem[]> {
  const p = await getPrisma();
  const viewerId = opts.viewerId ?? null;
  const tag = opts.tag?.trim() || null;
  const q = opts.query?.trim().toLowerCase() || null;

  let rawPosts: DbPost[];
  let rawLikes: { userId: string; postId: string }[] = [];
  let rawFavs: { userId: string; postId: string }[] = [];
  let rawComments: { postId: string }[] = [];
  let users: DbUser[];

  if (p) {
    const rows = await p.post.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    rawPosts = rows.map(mapPost);
    rawLikes = (await p.like.findMany({ select: { userId: true, postId: true } })) as typeof rawLikes;
    rawFavs = (await p.favorite.findMany({ select: { userId: true, postId: true } })) as typeof rawFavs;
    rawComments = (await p.comment.findMany({ select: { postId: true } })) as typeof rawComments;
    const ids = [...new Set(rawPosts.map((x) => x.userId))];
    const urows = await p.user.findMany({ where: { id: { in: ids } } });
    users = urows.map(mapUser);
  } else {
    const store = await readStore();
    rawPosts = [...store.posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    rawLikes = store.likes;
    rawFavs = store.favorites;
    rawComments = store.comments;
    users = store.users;
  }

  const userMap = new Map(users.map((u) => [u.id, u]));
  const likeCount = new Map<string, number>();
  const favCount = new Map<string, number>();
  const cmtCount = new Map<string, number>();
  const likedSet = new Set<string>();
  const favSet = new Set<string>();

  for (const l of rawLikes) {
    likeCount.set(l.postId, (likeCount.get(l.postId) ?? 0) + 1);
    if (viewerId && l.userId === viewerId) likedSet.add(l.postId);
  }
  for (const f of rawFavs) {
    favCount.set(f.postId, (favCount.get(f.postId) ?? 0) + 1);
    if (viewerId && f.userId === viewerId) favSet.add(f.postId);
  }
  for (const c of rawComments) cmtCount.set(c.postId, (cmtCount.get(c.postId) ?? 0) + 1);

  let items: PostListItem[] = rawPosts.map((post) => {
    const author = userMap.get(post.userId);
    return {
      ...post,
      author: {
        id: post.userId,
        username: author?.username ?? '已注销',
        playerNo: author?.playerNo ?? 0,
      },
      likeCount: likeCount.get(post.id) ?? 0,
      favoriteCount: favCount.get(post.id) ?? 0,
      commentCount: cmtCount.get(post.id) ?? 0,
      liked: likedSet.has(post.id),
      favorited: favSet.has(post.id),
      repostOf: null,
    };
  });

  if (tag) items = items.filter((x) => x.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));
  if (q) {
    items = items.filter(
      (x) => x.title.toLowerCase().includes(q) || x.content.toLowerCase().includes(q),
    );
  }

  // 补转发来源
  const byId = new Map(rawPosts.map((x) => [x.id, x]));
  for (const item of items) {
    if (!item.repostOfId) continue;
    const src = byId.get(item.repostOfId);
    if (!src) continue;
    const srcAuthor = userMap.get(src.userId);
    item.repostOf = {
      id: src.id,
      title: src.title,
      author: srcAuthor ? `${srcAuthor.username}#${srcAuthor.playerNo}` : '已注销',
    };
  }

  return items;
}

export async function getPost(id: string): Promise<DbPost | null> {
  const p = await getPrisma();
  if (p) {
    const post = await p.post.findUnique({ where: { id } });
    return post ? mapPost(post) : null;
  }
  const store = await readStore();
  return store.posts.find((x) => x.id === id) ?? null;
}

export async function deletePost(id: string, userId: string): Promise<boolean> {
  const p = await getPrisma();
  if (p) {
    const post = await p.post.findUnique({ where: { id } });
    if (!post || post.userId !== userId) return false;
    await p.post.delete({ where: { id } });
    return true;
  }
  const store = await readStore();
  const post = store.posts.find((x) => x.id === id);
  if (!post || post.userId !== userId) return false;
  await writeStore({
    ...store,
    posts: store.posts.filter((x) => x.id !== id),
    comments: store.comments.filter((c) => c.postId !== id),
    likes: store.likes.filter((l) => l.postId !== id),
    favorites: store.favorites.filter((f) => f.postId !== id),
  });
  return true;
}

/* ---------- 评论（楼中楼） ---------- */

export async function createComment(input: {
  userId: string;
  postId: string;
  content: string;
  parentId?: string | null;
}): Promise<DbComment> {
  const p = await getPrisma();
  if (p) {
    const c = await p.comment.create({
      data: {
        userId: input.userId,
        postId: input.postId,
        content: input.content,
        parentId: input.parentId ?? null,
      },
    });
    return mapComment(c);
  }
  const store = await readStore();
  const c: DbComment = {
    id: randomUUID(),
    userId: input.userId,
    postId: input.postId,
    content: input.content,
    parentId: input.parentId ?? null,
    createdAt: now(),
  };
  await writeStore({ ...store, comments: [...store.comments, c] });
  return c;
}

export async function listComments(postId: string): Promise<CommentNode[]> {
  const p = await getPrisma();
  let raw: DbComment[];
  let users: DbUser[];

  if (p) {
    const rows = await p.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
    });
    raw = rows.map(mapComment);
    const ids = [...new Set(raw.map((c) => c.userId))];
    users = (await p.user.findMany({ where: { id: { in: ids } } })).map(mapUser);
  } else {
    const store = await readStore();
    raw = store.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    users = store.users;
  }

  const userMap = new Map(users.map((u) => [u.id, u]));
  const nodes: CommentNode[] = raw.map((c) => ({
    ...c,
    author: {
      id: c.userId,
      username: userMap.get(c.userId)?.username ?? '已注销',
      playerNo: userMap.get(c.userId)?.playerNo ?? 0,
    },
    children: [],
  }));

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: CommentNode[] = [];
  for (const n of nodes) {
    const parent = n.parentId ? byId.get(n.parentId) : null;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  return roots;
}

/* ---------- 点赞 / 收藏 ---------- */

export async function toggleLike(userId: string, postId: string): Promise<boolean> {
  const p = await getPrisma();
  if (p) {
    const exist = await p.like.findUnique({ where: { userId_postId: { userId, postId } } });
    if (exist) {
      await p.like.delete({ where: { userId_postId: { userId, postId } } });
      return false;
    }
    await p.like.create({ data: { userId, postId } });
    return true;
  }
  const store = await readStore();
  const exist = store.likes.find((l) => l.userId === userId && l.postId === postId);
  if (exist) {
    await writeStore({ ...store, likes: store.likes.filter((l) => l.id !== exist.id) });
    return false;
  }
  await writeStore({
    ...store,
    likes: [...store.likes, { id: randomUUID(), userId, postId }],
  });
  return true;
}

export async function toggleFavorite(userId: string, postId: string): Promise<boolean> {
  const p = await getPrisma();
  if (p) {
    const exist = await p.favorite.findUnique({ where: { userId_postId: { userId, postId } } });
    if (exist) {
      await p.favorite.delete({ where: { userId_postId: { userId, postId } } });
      return false;
    }
    await p.favorite.create({ data: { userId, postId } });
    return true;
  }
  const store = await readStore();
  const exist = store.favorites.find((f) => f.userId === userId && f.postId === postId);
  if (exist) {
    await writeStore({ ...store, favorites: store.favorites.filter((f) => f.id !== exist.id) });
    return false;
  }
  await writeStore({
    ...store,
    favorites: [...store.favorites, { id: randomUUID(), userId, postId }],
  });
  return true;
}

/* =========================================================
 * 好友关系
 * ========================================================= */

export async function listFriends(userId: string): Promise<FriendItem[]> {
  const p = await getPrisma();
  let raw: DbFriendship[];
  let users: DbUser[];
  let archives: DbArchive[];

  if (p) {
    const rows = await p.friendship.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      orderBy: { createdAt: 'desc' },
    });
    raw = rows.map(mapFriendship);
    const ids = [...new Set(raw.flatMap((f) => [f.user1Id, f.user2Id]))];
    users = (await p.user.findMany({ where: { id: { in: ids } } })).map(mapUser);
    archives = (
      await p.archive.findMany({ where: { userId: { in: ids } } })
    ).map(mapArchive);
  } else {
    const store = await readStore();
    raw = store.friendships.filter((f) => f.user1Id === userId || f.user2Id === userId);
    users = store.users;
    archives = store.archives;
  }

  const userMap = new Map(users.map((u) => [u.id, u]));
  const arcMap = new Map(archives.map((a) => [a.userId, a]));

  return raw.map((f) => {
    const outgoing = f.user1Id === userId;
    const otherId = outgoing ? f.user2Id : f.user1Id;
    const u = userMap.get(otherId);
    const arc = arcMap.get(otherId);
    return {
      friendshipId: f.id,
      user: {
        id: otherId,
        username: u?.username ?? '已注销',
        playerNo: u?.playerNo ?? 0,
      },
      status: f.status,
      direction: outgoing ? 'outgoing' : 'incoming',
      createdAt: f.createdAt,
      archiveStatus: arc ? (arc.status === 'dead' ? 'dead' : 'alive') : 'none',
      archiveName: arc?.username ?? null,
      rating: arc?.rating ?? null,
    };
  });
}

export async function sendFriendRequest(
  userId: string,
  targetUserId: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (userId === targetUserId) return { ok: false, reason: '不能添加自己' };

  const p = await getPrisma();
  if (p) {
    const dup = await p.friendship.findFirst({
      where: {
        OR: [
          { user1Id: userId, user2Id: targetUserId },
          { user1Id: targetUserId, user2Id: userId },
        ],
      },
    });
    if (dup) return { ok: false, reason: dup.status === 'accepted' ? '已是好友' : '请求已发出' };
    await p.friendship.create({ data: { user1Id: userId, user2Id: targetUserId } });
    return { ok: true };
  }

  const store = await readStore();
  const dup = store.friendships.find(
    (f) =>
      (f.user1Id === userId && f.user2Id === targetUserId) ||
      (f.user1Id === targetUserId && f.user2Id === userId),
  );
  if (dup) return { ok: false, reason: dup.status === 'accepted' ? '已是好友' : '请求已发出' };
  const f: DbFriendship = {
    id: randomUUID(),
    user1Id: userId,
    user2Id: targetUserId,
    status: 'pending',
    createdAt: now(),
  };
  await writeStore({ ...store, friendships: [...store.friendships, f] });
  return { ok: true };
}

export async function respondFriendRequest(
  userId: string,
  friendshipId: string,
  accept: boolean,
): Promise<boolean> {
  const p = await getPrisma();
  if (p) {
    const f = await p.friendship.findUnique({ where: { id: friendshipId } });
    if (!f || f.user2Id !== userId) return false;
    if (accept) {
      await p.friendship.update({ where: { id: friendshipId }, data: { status: 'accepted' } });
    } else {
      await p.friendship.delete({ where: { id: friendshipId } });
    }
    return true;
  }
  const store = await readStore();
  const f = store.friendships.find((x) => x.id === friendshipId);
  if (!f || f.user2Id !== userId) return false;
  const friendships = accept
    ? store.friendships.map((x) => (x.id === friendshipId ? { ...x, status: 'accepted' as const } : x))
    : store.friendships.filter((x) => x.id !== friendshipId);
  await writeStore({ ...store, friendships });
  return true;
}

export async function removeFriend(userId: string, friendshipId: string): Promise<boolean> {
  const p = await getPrisma();
  if (p) {
    const f = await p.friendship.findUnique({ where: { id: friendshipId } });
    if (!f || (f.user1Id !== userId && f.user2Id !== userId)) return false;
    await p.friendship.delete({ where: { id: friendshipId } });
    return true;
  }
  const store = await readStore();
  const f = store.friendships.find((x) => x.id === friendshipId);
  if (!f || (f.user1Id !== userId && f.user2Id !== userId)) return false;
  await writeStore({ ...store, friendships: store.friendships.filter((x) => x.id !== friendshipId) });
  return true;
}
