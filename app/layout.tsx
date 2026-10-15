import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '副本 / INSTANCE',
  description: '状态机驱动 · LLM 对话流 · 暗黑悬疑文字剧本杀',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0c',
};

/**
 * 字体在运行期通过 <link> 加载（不在构建期拉取），
 * 这样离线 / 内网环境也能构建成功，加载失败时自动回落到系统等宽 / 衬线字体。
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void text-chalk font-mono antialiased">{children}</body>
    </html>
  );
}
