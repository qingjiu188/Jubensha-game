import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { findUserByUsername } from '@/lib/db';

/* =========================================================
 * Auth.js v5（NextAuth）—— 档案代号 + 接入密钥
 * ---------------------------------------------------------
 * · 不用邮箱：username（英文数字，全局唯一）+ key（接入密钥）
 * · session 走 JWT（不查库，数据库不可用时也能登录）
 * · session.user 上带 id / username / playerNo
 *
 * ★ 死亡清零的是 Archive（角色档案），不是 User（账号）：
 *   账号保留 → 论坛帖子、评论、好友关系全部保留；
 *   重建档案时 playerNo 递增 → 获得新的 No.X 编号。
 * ========================================================= */

export const USERNAME_RE = /^[a-zA-Z0-9]+$/;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: '/' },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: '档案代号', type: 'text' },
        key: { label: '接入密钥', type: 'password' },
      },
      authorize: async (creds) => {
        const username = String(creds?.username ?? '').trim();
        const key = String(creds?.key ?? '');
        if (!username || !key) return null;

        const user = await findUserByUsername(username);
        if (!user) return null;

        const ok = await bcrypt.compare(key, user.keyHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.username,
          email: null,
          // Auth.js 的 User 类型是预设字段集，额外字段挂到下面再塞进 token
        } as unknown as { id: string; name: string; email: string | null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        (token as Record<string, unknown>).uid = user.id;
        (token as Record<string, unknown>).uname = user.name ?? '';
      }
      return token;
    },
    async session({ session, token }) {
      const rec = token as Record<string, unknown>;
      const su = session.user as unknown as Record<string, unknown>;
      if (typeof rec.uid === 'string') su.id = rec.uid;
      if (typeof rec.uname === 'string') su.name = rec.uname;
      return session;
    },
  },
});
