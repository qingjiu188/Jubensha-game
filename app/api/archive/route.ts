import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { STAT_BASE_MAX } from '@/types';
import { sanitizePotions, sanitizeWeapons } from '@/lib/loot';
import {
  createArchive,
  deleteArchive,
  findUserById,
  getArchive,
  listTakenIdentities,
  storageMode,
  updateArchive,
  wipeField,
  type ArchivePatch,
  type DbArchive,
} from '@/lib/db';
import {
  IDENTITY_TOTAL,
  IDENTITY_BY_NAME,
  isIdentityAbilityMatch,
  isValidIdentity,
  rollIdentity,
} from '@/lib/abilities';

/* =========================================================
 * /api/archive
 *   GET    查询当前账号与其档案（不存在返回 archive: null）
 *   POST   建档（写入数据库；异能终身锁定；死亡重建时 playerNo 递增）
 *   PATCH  同步状态 / BE 逐行清空字段
 *   DELETE 物理删除档案（死亡销毁 —— 只删角色层，账号保留）
 * ========================================================= */

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  const uid = (session?.user as unknown as Record<string, unknown> | undefined)?.id;
  return typeof uid === 'string' ? uid : null;
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const [archive, user] = await Promise.all([getArchive(userId), findUserById(userId)]);
  return NextResponse.json({
    archive,
    user: user ? { id: user.id, username: user.username, playerNo: user.playerNo } : null,
    storage: await storageMode(),
  });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: Partial<DbArchive> & {
    username?: string;
    identity?: string;
    ability?: { name?: string; desc?: string; rarity?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  /**
   * 身份分发（唯一性在服务端兜底）：
   *   1. 前端未指定 / 指定非法 / 指定不匹配 → 从未占用池随机
   *   2. 指定合法但已被占用 → 自动改派另一个未占用的
   *   3. 身份池耗尽 → 409
   */
  const taken = await listTakenIdentities();
  let reassignReason: string | null = null;

  let picked: ReturnType<typeof rollIdentity> | null = null;
  const wanted = String(body.identity ?? '').trim();
  const ability = body.ability;

  if (
    isValidIdentity(wanted) &&
    isIdentityAbilityMatch(wanted, ability?.name ?? '') &&
    !taken.includes(wanted)
  ) {
    picked = IDENTITY_BY_NAME[wanted];
  } else {
    if (wanted) reassignReason = taken.includes(wanted) ? '该身份已被占用，系统已改派' : '身份无效，系统已改派';
    else reassignReason = '系统已分发身份';
    try {
      picked = rollIdentity(taken);
    } catch {
      return NextResponse.json(
        { error: `全部 ${IDENTITY_TOTAL} 个身份均已被占用，请稍后再试` },
        { status: 409 },
      );
    }
  }

  const username = picked.identity;
  const bound = {
    name: picked.ability,
    desc: picked.desc,
    rarity: picked.rarity,
  };

  /* ---------- 玩家自定义的角色信息（建档时写入，可后改） ---------- */
  const genderRaw = String(body.gender ?? '').trim();
  const gender = ['male', 'female', 'other', 'hidden'].includes(genderRaw) ? genderRaw : null;
  const displayName =
    String(body.displayName ?? '')
      .trim()
      .slice(0, 20) || null;
  const appearance =
    String(body.appearance ?? '')
      .trim()
      .slice(0, 300) || null;

  let archive: DbArchive;
  try {
    archive = await createArchive({
      userId,
      username,
      identity: picked.identity,
      identityCategory: picked.category,
      displayName,
      gender,
      appearance,
      // 初始三维：0~100（闭区间）。超过 100 的部分只允许通过成长点累积，不能在建档时写入
      str: clamp(Number(body.str ?? 50), 0, STAT_BASE_MAX),
      int: clamp(Number(body.int ?? 50), 0, STAT_BASE_MAX),
      agi: clamp(Number(body.agi ?? 50), 0, STAT_BASE_MAX),
      hp: clamp(Number(body.hp ?? 100)),
      sp: clamp(Number(body.sp ?? 100)),
      st: clamp(Number(body.st ?? 100)),
      rating: String(body.rating ?? 'F'),
      growthPoints: Number(body.growthPoints ?? 0),
      // 新档案的货币与战利品一律从零起算，防止前端伪造初始资源
      credits: 0,
      potions: { sp: 0, st: 0 },
      weapons: [],
      equippedWeaponId: null,
      kills: 0,
      abilityName: bound.name,
      abilityDesc: bound.desc,
      abilityRarity: bound.rarity,
      status: 'alive',
      currentClues: Array.isArray(body.currentClues) ? (body.currentClues as string[]) : [],
      difficulty: body.difficulty ?? null,
      scenarioId: body.scenarioId ?? null,
      scenarioName: body.scenarioName ?? null,
      currentRole: body.currentRole ?? null,
      turn: Number(body.turn ?? 0),
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'ARCHIVE_CREATE_FAILED', detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  const user = await findUserById(userId);

  return NextResponse.json({
    ok: true,
    archive,
    playerNo: user?.playerNo ?? 0,
    /** 若前端指定的身份不可用，这里给出改派原因 */
    reassigned: reassignReason,
    storage: await storageMode(),
  });
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { patch?: ArchivePatch; wipe?: keyof DbArchive };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  // BE 销毁动画：每打印一行，清掉一个字段
  if (body.wipe) {
    await wipeField(userId, body.wipe);
    const archive = await getArchive(userId);
    return NextResponse.json({ ok: true, wiped: body.wipe, archive });
  }

  const patch: ArchivePatch = { ...(body.patch ?? {}) };
  if (typeof patch.hp === 'number') patch.hp = clamp(patch.hp);
  if (typeof patch.sp === 'number') patch.sp = clamp(patch.sp);
  if (typeof patch.st === 'number') patch.st = clamp(patch.st);
  // 三维无上限（成长点可无限追加），只挡负数与非整数
  if (typeof patch.str === 'number') patch.str = Math.max(0, Math.floor(patch.str));
  if (typeof patch.int === 'number') patch.int = Math.max(0, Math.floor(patch.int));
  if (typeof patch.agi === 'number') patch.agi = Math.max(0, Math.floor(patch.agi));
  if (typeof patch.growthPoints === 'number')
    patch.growthPoints = Math.max(0, Math.floor(patch.growthPoints));
  // 货币 / 战利品：积分与击杀只挡负数，药剂与武器做结构消毒，防止伪造
  if (typeof patch.credits === 'number') patch.credits = Math.max(0, Math.floor(patch.credits));
  if (typeof patch.kills === 'number') patch.kills = Math.max(0, Math.floor(patch.kills));
  if (patch.potions) patch.potions = sanitizePotions(patch.potions);
  if (Array.isArray(patch.weapons)) patch.weapons = sanitizeWeapons(patch.weapons);
  if (typeof patch.equippedWeaponId === 'string' && Array.isArray(patch.weapons)) {
    // 只允许装备自己库里真实存在的武器
    patch.equippedWeaponId = patch.weapons.some((w) => w.id === patch.equippedWeaponId)
      ? patch.equippedWeaponId
      : null;
  } else if ('equippedWeaponId' in patch && patch.equippedWeaponId !== null) {
    patch.equippedWeaponId = null;
  }

  // 玩家自定义的角色信息：长度消毒 + 性别白名单
  if ('displayName' in patch) {
    patch.displayName = String(patch.displayName ?? '').trim().slice(0, 20) || null;
  }
  if ('gender' in patch) {
    const g = String(patch.gender ?? '').trim();
    patch.gender = ['male', 'female', 'other', 'hidden'].includes(g) ? g : null;
  }
  if ('appearance' in patch) {
    patch.appearance = String(patch.appearance ?? '').trim().slice(0, 300) || null;
  }

  const archive = await updateArchive(userId, patch);
  if (!archive) return NextResponse.json({ error: 'ARCHIVE_NOT_FOUND' }, { status: 404 });

  return NextResponse.json({ ok: true, archive });
}

export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const done = await deleteArchive(userId);
  const user = await findUserById(userId);
  // 账号保留：论坛帖子 / 好友关系不受影响，仅角色层被销毁
  return NextResponse.json({
    ok: done,
    deleted: done,
    account: user ? { username: user.username, playerNo: user.playerNo } : null,
  });
}
