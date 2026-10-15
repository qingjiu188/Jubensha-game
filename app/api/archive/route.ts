import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createArchive,
  deleteArchive,
  findUserById,
  getArchive,
  storageMode,
  updateArchive,
  wipeField,
  type ArchivePatch,
  type DbArchive,
} from '@/lib/db';
import { ABILITIES, rollAbility } from '@/lib/abilities';

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
    ability?: { name?: string; desc?: string; rarity?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const username = String(body.username ?? '').trim();
  if (!username) return NextResponse.json({ error: '角色代号不能为空' }, { status: 400 });

  // 异能：优先用前端 roll 出来的；不合法或缺失时后端自己 roll，保证一定有
  let ability = body.ability;
  const valid =
    ability?.name && ABILITIES.some((a) => a.name === ability!.name && a.desc === ability!.desc);
  if (!valid) {
    const rolled = rollAbility();
    ability = { name: rolled.name, desc: rolled.desc, rarity: rolled.rarity };
  }

  const archive = await createArchive({
    userId,
    username,
    str: clamp(Number(body.str ?? 15), 1, 99),
    int: clamp(Number(body.int ?? 15), 1, 99),
    agi: clamp(Number(body.agi ?? 15), 1, 99),
    hp: clamp(Number(body.hp ?? 100)),
    sp: clamp(Number(body.sp ?? 100)),
    st: clamp(Number(body.st ?? 100)),
    rating: String(body.rating ?? 'F'),
    growthPoints: Number(body.growthPoints ?? 0),
    abilityName: String(ability!.name),
    abilityDesc: String(ability!.desc),
    abilityRarity: String(ability!.rarity ?? 'common'),
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
