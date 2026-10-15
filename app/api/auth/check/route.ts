import { NextResponse } from 'next/server';
import { findUserByUsername } from '@/lib/db';

/* =========================================================
 * GET /api/auth/check?username=xxx
 * 前端实时查重用：返回该档案代号是否可用
 * ========================================================= */

export async function GET(req: Request) {
  const username = new URL(req.url).searchParams.get('username')?.trim() ?? '';

  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return NextResponse.json({ ok: false, reason: '只允许英文与数字' });
  }
  if (username.length < 2 || username.length > 20) {
    return NextResponse.json({ ok: false, reason: '长度需为 2–20 位' });
  }

  const exists = await findUserByUsername(username);
  return NextResponse.json(
    exists ? { ok: false, reason: '该档案代号已被占用' } : { ok: true },
  );
}
