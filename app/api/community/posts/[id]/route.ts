import { NextResponse } from 'next/server';
import { deletePost, getPost, listComments } from '@/lib/db';
import { requireUserId } from '@/lib/session';

/* =========================================================
 * GET    /api/community/posts/:id   帖子详情 + 评论树
 * DELETE /api/community/posts/:id   删帖（仅作者）
 * ========================================================= */

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const comments = await listComments(id);
  return NextResponse.json({ post, comments });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const { id } = await ctx.params;
  const ok = await deletePost(id, userId);
  if (!ok) return NextResponse.json({ error: 'FORBIDDEN_OR_NOT_FOUND' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
