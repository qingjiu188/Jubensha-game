import type { DbArchive } from '@/lib/db';
import type { AbilitySnapshot } from '@/types';

/* =========================================================
 * 档案接口（客户端封装）
 *   GET    /api/archive   查询（含账号信息）
 *   POST   /api/archive   建档（含异能，终身锁定）
 *   PATCH  /api/archive   同步 / 逐行清空
 *   DELETE /api/archive   物理删除（只删角色层）
 * ========================================================= */

export interface ArchiveResponse {
  archive: DbArchive | null;
  user: { id: string; username: string; playerNo: number } | null;
  storage?: 'mysql' | 'json';
}

export async function fetchArchive(): Promise<ArchiveResponse> {
  const res = await fetch('/api/archive', { cache: 'no-store' });
  if (!res.ok) throw new Error(`ARCHIVE_GET ${res.status}`);
  return (await res.json()) as ArchiveResponse;
}

export async function createArchive(input: {
  username: string;
  str: number;
  int: number;
  agi: number;
  rating: string;
  currentRole?: string | null;
  ability?: AbilitySnapshot | null;
}): Promise<{ archive: DbArchive; playerNo: number }> {
  const res = await fetch('/api/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      hp: 100,
      sp: 100,
      st: 100,
      status: 'alive',
      currentClues: [],
      turn: 0,
    }),
  });
  if (!res.ok) throw new Error(`ARCHIVE_POST ${res.status}`);
  const data = (await res.json()) as { archive: DbArchive; playerNo: number };
  return { archive: data.archive, playerNo: data.playerNo ?? 0 };
}

export async function patchArchive(patch: Partial<DbArchive>): Promise<void> {
  await fetch('/api/archive', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patch }),
  });
}

/** BE 销毁：每打印一行，清掉数据库里对应的一个字段 */
export async function wipeArchiveField(field: keyof DbArchive): Promise<void> {
  await fetch('/api/archive', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wipe: field }),
  });
}

/** BE 收尾：物理删除整条档案记录（账号保留） */
export async function deleteArchive(): Promise<void> {
  await fetch('/api/archive', { method: 'DELETE' });
}

/* =========================================================
 * 社区论坛
 * ========================================================= */

export interface PostItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  repostOfId: string | null;
  createdAt: string;
  author: { id: string; username: string; playerNo: number };
  likeCount: number;
  commentCount: number;
  favoriteCount: number;
  liked: boolean;
  favorited: boolean;
  repostOf: { id: string; title: string; author: string } | null;
}

export interface CommentItem {
  id: string;
  userId: string;
  postId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  author: { id: string; username: string; playerNo: number };
  children: CommentItem[];
}

export async function fetchPosts(opts: { tag?: string; q?: string } = {}): Promise<PostItem[]> {
  const params = new URLSearchParams();
  if (opts.tag) params.set('tag', opts.tag);
  if (opts.q) params.set('q', opts.q);
  const res = await fetch(`/api/community/posts?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = (await res.json()) as { posts: PostItem[] };
  return data.posts ?? [];
}

export async function createPost(input: {
  title: string;
  content: string;
  tags: string[];
  repostOfId?: string | null;
}): Promise<PostItem | null> {
  const res = await fetch('/api/community/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { post: PostItem };
  return data.post ?? null;
}

export async function deletePost(id: string): Promise<boolean> {
  const res = await fetch(`/api/community/posts/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function postComment(input: {
  postId: string;
  content: string;
  parentId?: string | null;
}): Promise<CommentItem[] | null> {
  const res = await fetch('/api/community/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { comments: CommentItem[] };
  return data.comments ?? null;
}

export async function toggleLike(postId: string): Promise<boolean> {
  const res = await fetch('/api/community/like', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { liked: boolean };
  return !!data.liked;
}

export async function toggleFavorite(postId: string): Promise<boolean> {
  const res = await fetch('/api/community/favorite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId }),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { favorited: boolean };
  return !!data.favorited;
}

/* =========================================================
 * 好友 / 幸存者频道
 * ========================================================= */

export interface FriendEntry {
  friendshipId: string;
  user: { id: string; username: string; playerNo: number };
  status: 'pending' | 'accepted';
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  archiveStatus: 'alive' | 'dead' | 'none';
  archiveName: string | null;
  rating: string | null;
}

export async function fetchFriends(): Promise<FriendEntry[]> {
  const res = await fetch('/api/social/friends', { cache: 'no-store' });
  if (!res.ok) return [];
  const data = (await res.json()) as { friends: FriendEntry[] };
  return data.friends ?? [];
}

export async function addFriend(handle: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/social/friends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handle }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) return { ok: false, error: data.error ?? '发送失败' };
  return { ok: true };
}

export async function respondFriend(
  friendshipId: string,
  accept: boolean,
): Promise<boolean> {
  const res = await fetch('/api/social/friends', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendshipId, accept }),
  });
  return res.ok;
}

export async function removeFriend(friendshipId: string): Promise<boolean> {
  const res = await fetch(`/api/social/friends?id=${encodeURIComponent(friendshipId)}`, {
    method: 'DELETE',
  });
  return res.ok;
}
