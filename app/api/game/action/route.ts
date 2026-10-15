import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateTurn } from '@/lib/llm';
import type { SendActionPayload } from '@/types';

/* =========================================================
 * POST /api/game/action
 * ---------------------------------------------------------
 * 唯一的剧情入口。前端把 playerState + userInput 发过来，
 * 后端（这里是 LLM 调度层）返回：
 *   { narrative, options, patch?, ending?, endingTitle? }
 *
 * 前端拿到后交给 parser 渲染，并把新的绝对数值
 * 用 PATCH /api/archive 落库。
 * ========================================================= */

export async function POST(req: Request) {
  const session = await auth();
  const uid = (session?.user as unknown as Record<string, unknown> | undefined)?.id;
  if (typeof uid !== 'string') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let payload: SendActionPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  try {
    const result = await generateTurn(payload);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'LLM_FAILED', detail: msg }, { status: 502 });
  }
}
