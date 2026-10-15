import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, findUserByUsername } from '@/lib/db';

/* =========================================================
 * POST /api/auth/register —— 档案接入
 * body: { username, key }
 *   username：档案代号，仅英文数字，全局唯一
 *   key     ：接入密钥，无字符限制（>= 4 位）
 * ========================================================= */

export async function POST(req: Request) {
  let body: { username?: string; key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const username = String(body.username ?? '').trim();
  const key = String(body.key ?? '');

  if (!/^[a-zA-Z0-9]+$/.test(username)) {
    return NextResponse.json({ error: '档案代号只允许英文与数字' }, { status: 400 });
  }
  if (username.length < 2 || username.length > 20) {
    return NextResponse.json({ error: '档案代号长度需为 2–20 位' }, { status: 400 });
  }
  if (key.length < 4) {
    return NextResponse.json({ error: '接入密钥至少 4 位' }, { status: 400 });
  }

  // 后端唯一性校验（前端还有一层实时正则/查重）
  const exists = await findUserByUsername(username);
  if (exists) {
    return NextResponse.json({ error: '该档案代号已被占用' }, { status: 409 });
  }

  const hash = await bcrypt.hash(key, 10);
  const user = await createUser(username, hash);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, username: user.username, playerNo: user.playerNo },
  });
}
