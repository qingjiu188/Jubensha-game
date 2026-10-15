/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 容器化部署（腾讯云 CloudBase 云托管）需要 standalone 产物：
  // 只拷贝运行必需文件，镜像体积从 1G+ 降到 100M 级
  output: process.env.NEXT_OUTPUT_STANDALONE === 'false' ? undefined : 'standalone',
  // 纯客户端状态机应用，不需要 SSR 相关优化
  productionBrowserSourceMaps: false,
  // 某些受限文件系统（如沙箱）下 .next 写入会失败，可用环境变量改输出目录
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
