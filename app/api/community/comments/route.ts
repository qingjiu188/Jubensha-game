import { NextResponse } from 'next/server';
import { createComment, getPost, listComments } from '@/lib/db';
import { requireUserId } from '@/lib/session';

/* =========================================================
 * POST /api/community/comments
 * body: { postId, content, parentId? }  —— parentId 支持楼中楼
 * ========================================================= */

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { postId?: string; content?: string; parentId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const postId = String(body.postId ?? '');
  const content = String(body.content ?? '').trim();
  if (!postId) return NextResponse.json({ error: '缺少 postId' }, { status: 400 });
  if (!content) return NextResponse.json({ error: '评论不能为空' }, { status: 400 });

  const post = await getPost(postId);
  if (!post) return NextResponse.json({ error: '帖子不存在' }, { status: 404 });

  const comment = await createComment({
    userId,
    postId,
    content,
    parentId: body.parentId ?? null,
  });

  const tree = await listComments(postId);
  return NextResponse.json({ ok: true, comment, comments: tree });
}
