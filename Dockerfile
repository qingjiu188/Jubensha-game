# =========================================================
# 《副本 / INSTANCE》—— 腾讯云 CloudBase 云托管专用镜像
# ---------------------------------------------------------
# 三阶段构建：装依赖 → 构建 → 只搬运行必需文件
# 监听端口 3000（云托管控制台「监听端口」填 3000）
# =========================================================

# ---------- 1. 依赖 ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# Prisma 查询引擎依赖 openssl
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci --ignore-scripts
# 手动生成 Prisma Client（npm 的 postinstall 在部分环境不触发）
RUN ./node_modules/.bin/prisma generate

# ---------- 2. 构建 ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------- 3. 运行 ----------
FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# standalone 产物：server.js + 裁剪后的 node_modules
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma

# Prisma 引擎二进制不在 Next 的依赖追踪里，必须手动带上
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma

EXPOSE 3000

CMD ["node", "server.js"]
