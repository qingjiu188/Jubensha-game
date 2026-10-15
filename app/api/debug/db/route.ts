/* 临时诊断接口：逐环检查线上数据库连通性（不带任何敏感值）
 * TODO: 问题定位后删除本文件 */
import { NextResponse } from 'next/server';
import net from 'node:net';

export const dynamic = 'force-dynamic';

function tcpProbe(url: string, timeout = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const socket = net.connect({ host: u.hostname, port: Number(u.port || 3306) });
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);
      socket.once('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

export async function GET() {
  const url = process.env.DATABASE_URL;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const info: Record<string, any> = {
    vercel: !!process.env.VERCEL,
    node: process.version,
    hasUrl: !!url,
  };

  if (url) {
    try {
      const u = new URL(url);
      info.host = u.hostname;
      info.port = u.port || '(default)';
      info.db = u.pathname;
      info.user = u.username;
      info.hasSslParam = url.includes('sslaccept=strict');
      info.tcpProbe = await tcpProbe(url);
    } catch (e) {
      info.urlParseError = String(e).slice(0, 200);
      return NextResponse.json(info);
    }

    try {
      const mod = (await import(/* webpackIgnore: true */ '@prisma/client')) as Record<
        string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        any
      >;
      const Ctor = mod.PrismaClient ?? mod.default?.PrismaClient;
      info.prismaImport = 'ok';
      info.prismaCtor = !!Ctor;
      if (Ctor) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = new Ctor();
        try {
          await client.$queryRawUnsafe('SELECT 1');
          info.query = 'ok';
        } catch (e) {
          info.queryError = String(e instanceof Error ? e.message : e).slice(0, 400);
        }
        try {
          await client.$disconnect();
        } catch {}
      }
    } catch (e) {
      info.prismaImportError = String(e instanceof Error ? e.message : e).slice(0, 400);
    }
  }

  return NextResponse.json(info);
}
