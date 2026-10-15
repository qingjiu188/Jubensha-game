import { auth } from '@/lib/auth';

/** 取当前登录账号 ID；未登录返回 null */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  const uid = (session?.user as unknown as Record<string, unknown> | undefined)?.id;
  return typeof uid === 'string' ? uid : null;
}

export const UNAUTHORIZED = { error: 'UNAUTHORIZED' };
