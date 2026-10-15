import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '@/lib/db';

/* =========================================================
 * Auth.js v5（NextAuth）—— 邮箱 + 密码 Credentials
 * session 走 JWT（不查库，数据库不可用时也能登录）
 * ========================================================= */

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: '/' },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      authorize: async (creds) => {
        const email = String(creds?.email ?? '').trim().toLowerCase();
        const password = String(creds?.password ?? '');
        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) (token as Record<string, unknown>).uid = user.id;
      return token;
    },
    async session({ session, token }) {
      const uid = (token as Record<string, unknown>)?.uid;
      if (typeof uid === 'string') {
        (session.user as unknown as Record<string, unknown>).id = uid;
      }
      return session;
    },
  },
});
