import { NextResponse } from 'next/server';
import { createPost, getPost, listPosts, storageMode } from '@/lib/db';
import { requireUserId } from '@/lib/session';

/* =========================================================
 * GET  /api/community/posts?tag=&q=   帖子列表
 * POST /api/community/posts           发帖 / 转发
 * ========================================================= */

export async function GET(req: Request) {
  const userId = await requireUserId();
  const url = new URL(req.url);
  const tag = url.searchParams.get('tag');
  const q = url.searchParams.get('q');

  const posts = await listPosts({ viewerId: userId, tag, query: q });
  return NextResponse.json({ posts, storage: await storageMode() });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body: { title?: string; content?: string; tags?: string[]; repostOfId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const repostOfId = body.repostOfId ?? null;

  // 转发：正文可留空，标题沿用原帖
  if (repostOfId) {
    const src = await getPost(repostOfId);
    if (!src) return NextResponse.json({ error: '原帖不存在' }, { status: 404 });
    const post = await createPost({
      userId,
      title: `⟲ ${src.title}`,
      content: String(body.content ?? '').trim() || '（转发）',
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 6) : [],
      repostOfId,
    });
    return NextResponse.json({ ok: true, post });
  }

  const title = String(body.title ?? '').trim();
  const content = String(body.content ?? '').trim();
  if (!title) return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
  if (!content) return NextResponse.json({ error: '正文不能为空' }, { status: 400 });

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 6)
    : [];

  const post = await createPost({ userId, title, content, tags });
  return NextResponse.json({ ok: true, post });
}
