import { NextResponse } from 'next/server';
import { toggleLike } from '@/lib/db';
import { requireUserId } from '@/lib/session';

/** POST /api/community/like  body: { postId } —— 点赞 / 取消点赞 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { postId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const postId = String(body.postId ?? '');
  if (!postId) return NextResponse.json({ error: '缺少 postId' }, { status: 400 });

  const liked = await toggleLike(userId, postId);
  return NextResponse.json({ ok: true, liked });
}
