/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 纯客户端状态机应用，不需要 SSR 相关优化
  productionBrowserSourceMaps: false,
  // 某些受限文件系统（如沙箱）下 .next 写入会失败，可用环境变量改输出目录
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
