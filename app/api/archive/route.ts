import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createArchive,
  deleteArchive,
  getArchive,
  storageMode,
  updateArchive,
  wipeField,
  type ArchivePatch,
  type DbArchive,
} from '@/lib/db';

/* =========================================================
 * /api/archive
 *   GET    查询当前用户档案（不存在返回 archive: null）
 *   POST   建档（写入数据库）
 *   PATCH  同步状态 / BE 逐行清空字段
 *   DELETE 物理删除档案（死亡销毁）
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

  const archive = await getArchive(userId);
  return NextResponse.json({ archive, storage: await storageMode() });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: Partial<DbArchive> & { username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const username = String(body.username ?? '').trim();
  if (!username) return NextResponse.json({ error: '档案代号不能为空' }, { status: 400 });

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
    status: 'alive',
    currentClues: Array.isArray(body.currentClues) ? (body.currentClues as string[]) : [],
    difficulty: body.difficulty ?? null,
    scenarioId: body.scenarioId ?? null,
    scenarioName: body.scenarioName ?? null,
    currentRole: body.currentRole ?? null,
    turn: Number(body.turn ?? 0),
  });

  return NextResponse.json({ ok: true, archive, storage: await storageMode() });
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
  return NextResponse.json({ ok: done, deleted: done });
}
