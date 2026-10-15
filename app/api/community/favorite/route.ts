import { NextResponse } from 'next/server';
import { toggleFavorite } from '@/lib/db';
import { requireUserId } from '@/lib/session';

/** POST /api/community/favorite  body: { postId } —— 收藏 / 取消收藏 */
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

  const favorited = await toggleFavorite(userId, postId);
  return NextResponse.json({ ok: true, favorited });
}
