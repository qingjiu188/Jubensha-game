import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { STAT_BASE_MAX } from '@/types';
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

  const archive = await createArchive({
    userId,
    username,
    identity: picked.identity,
    identityCategory: picked.category,
    // 初始三维：0~100（闭区间）。超过 100 的部分只允许通过成长点累积，不能在建档时写入
    str: clamp(Number(body.str ?? 50), 0, STAT_BASE_MAX),
    int: clamp(Number(body.int ?? 50), 0, STAT_BASE_MAX),
    agi: clamp(Number(body.agi ?? 50), 0, STAT_BASE_MAX),
    hp: clamp(Number(body.hp ?? 100)),
    sp: clamp(Number(body.sp ?? 100)),
    st: clamp(Number(body.st ?? 100)),
    rating: String(body.rating ?? 'F'),
    growthPoints: Number(body.growthPoints ?? 0),
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
