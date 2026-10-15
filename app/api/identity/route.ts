import { NextResponse } from 'next/server';
import { listTakenIdentities, storageMode } from '@/lib/db';
import { IDENTITIES, IDENTITY_TOTAL } from '@/lib/abilities';

/* =========================================================
 * GET /api/identity
 *   返回身份占用情况，供建档页实时排除已被占用的身份。
 *   taken 之外的身份即为「可分发」。
 * ========================================================= */

export async function GET() {
  const taken = await listTakenIdentities();
  const used = new Set(taken);
  const byCategory: Record<string, { total: number; taken: number }> = {};

  for (const e of IDENTITIES) {
    const c = (byCategory[e.category] ??= { total: 0, taken: 0 });
    c.total += 1;
    if (used.has(e.identity)) c.taken += 1;
  }

  return NextResponse.json({
    total: IDENTITY_TOTAL,
    taken,
    remaining: IDENTITY_TOTAL - taken.length,
    byCategory,
    storage: await storageMode(),
  });
}
