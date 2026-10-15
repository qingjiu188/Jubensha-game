import type { DbArchive } from '@/lib/db';

/* =========================================================
 * 档案接口（客户端封装）
 *   GET    /api/archive   查询
 *   POST   /api/archive   建档
 *   PATCH  /api/archive   同步 / 逐行清空
 *   DELETE /api/archive   物理删除
 * ========================================================= */

export interface ArchiveResponse {
  archive: DbArchive | null;
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
}): Promise<DbArchive> {
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
  const data = (await res.json()) as { archive: DbArchive };
  return data.archive;
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

/** BE 收尾：物理删除整条档案记录 */
export async function deleteArchive(): Promise<void> {
  await fetch('/api/archive', { method: 'DELETE' });
}
