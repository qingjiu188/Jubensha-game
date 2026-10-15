import { NextResponse } from 'next/server';
import {
  findUserByHandle,
  listFriends,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  storageMode,
} from '@/lib/db';
import { requireUserId } from '@/lib/session';

/* =========================================================
 * GET    /api/social/friends            好友列表 + 待处理请求
 * POST   /api/social/friends  { handle } 按 No.X 或档案代号发送好友请求
 * PATCH  /api/social/friends  { friendshipId, accept }
 * DELETE /api/social/friends?id=xxx      删除好友 / 撤回请求
 * ========================================================= */

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const friends = await listFriends(userId);
  return NextResponse.json({ friends, storage: await storageMode() });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { handle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const handle = String(body.handle ?? '').trim();
  if (!handle) return NextResponse.json({ error: '请输入编号或档案代号' }, { status: 400 });

  const target = await findUserByHandle(handle);
  if (!target) return NextResponse.json({ error: '未找到该幸存者' }, { status: 404 });

  const result = await sendFriendRequest(userId, target.id);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });

  const friends = await listFriends(userId);
  return NextResponse.json({
    ok: true,
    target: { username: target.username, playerNo: target.playerNo },
    friends,
  });
}

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { friendshipId?: string; accept?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const ok = await respondFriendRequest(userId, String(body.friendshipId ?? ''), !!body.accept);
  if (!ok) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const friends = await listFriends(userId);
  return NextResponse.json({ ok: true, friends });
}

export async function DELETE(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id') ?? '';
  const ok = await removeFriend(userId, id);
  if (!ok) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const friends = await listFriends(userId);
  return NextResponse.json({ ok: true, friends });
}
