# Zen Send

跨平台剪贴板、文本和文件传输工具（类 LocalSend）

<p align="center">
  <img src="https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android%20%7C%20iOS%20%7C%20Web-blue" alt="Platforms">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

## 功能特点

- **跨平台传输** - 支持 Windows、macOS、Linux、Android、iOS 和 Web 浏览器
- **文件传输** - 通过 S3 分块上传支持大文件传输
- **剪贴板同步** - 跨设备同步剪贴板内容
- **实时通信** - 基于 Socket.io 的即时设备发现和传输通知
- **端到端安全** - JWT 认证 + S3 预签名 URL 直传

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      客户端应用                          │
├──────────┬──────────┬──────────┬──────────┬────────────┤
│  Web     │   iOS    │ Android  │ Electron │   Mobile   │
│  (Vite)  │  (Expo)  │  (Expo)  │ Desktop │   (RN)     │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴─────┬──────┘
     │          │          │          │           │
     └──────────┴──────────┴──────────┴───────────┘
                            │
                     Socket.io + REST
                            │
     ┌──────────────────────┴───────────────────────┐
     │              apps/server                      │
     │   Express.js + routing-controllers + Socket.io │
     │              typedi (IOC)                     │
     └──────────────────────┬───────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
         Drizzle ORM                  AWS S3
           (MySQL)               (Presigned URLs)
```

### 技术栈

| 层级 | 技术 |
|------|------|
| Web 前端 | React 19 + Vite + Tailwind CSS v4 + @rabjs/react |
| 移动端 | React Native + Expo |
| 桌面端 | Electron 40 + Vite |
| 后端 | Express.js + routing-controllers + Socket.io + typedi |
| 数据库 | Drizzle ORM + MySQL |
| 文件存储 | AWS S3 (预签名 URL 直传) |
| 包管理 | pnpm + Turbo |

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+
- MySQL 8+
- AWS S3 或兼容存储

### 安装

```bash
# 克隆项目
git clone https://github.com/your-org/zen-send.git
cd zen-send

# 安装依赖
pnpm install

# 配置环境变量
cp apps/server/.env.example apps/server/.env
# 编辑 .env 填写必要的配置
```

### 启动开发服务

```bash
# 启动所有应用
pnpm dev

# 仅启动后端
pnpm dev:server

# 仅启动 Web 前端
pnpm dev:web

# 启动移动端
pnpm dev:mobile

# 启动 Electron 桌面端
cd apps/electron && pnpm dev
```

## 项目结构

```
zen-send/
├── apps/
│   ├── server/           # Express.js 后端服务
│   ├── web/              # React Web 应用
│   ├── mobile/           # React Native 移动端
│   └── electron/         # Electron 桌面端
├── packages/
│   ├── dto/              # 共享 TypeScript 接口
│   ├── shared/           # 共享类型和工具
│   └── logger/           # 日志工具
└── config/
    ├── eslint-config/    # ESLint 配置
    └── typescript-config/ # TypeScript 配置
```

## 命令参考

```bash
# 安装依赖
pnpm install

# 开发
pnpm dev              # 运行所有应用
pnpm dev:server       # 运行后端 (端口 3110)
pnpm dev:web          # 运行 Web (端口 5274)
pnpm dev:mobile       # 运行 Expo 移动端

# 构建
pnpm build            # 构建所有包
pnpm clean            # 清理构建输出

# 代码质量
pnpm lint             # ESLint 检查
pnpm lint:fix          # ESLint 自动修复
pnpm format           # Prettier 格式化
pnpm typecheck        # TypeScript 类型检查

# 数据库
pnpm --filter @zen-send/server migrate:generate  # 生成迁移
pnpm --filter @zen-send/server migrate:migrate  # 执行迁移

# Electron 构建
cd apps/electron && pnpm dist:mac    # 构建 macOS .app
cd apps/electron && pnpm dist:win    # 构建 Windows .exe
cd apps/electron && pnpm dist:linux  # 构建 Linux AppImage
```

## 环境变量

```bash
# 后端配置 (apps/server/.env)
PORT=3110
NODE_ENV=development

# JWT 认证
JWT_ACCESS_SECRET=<your-access-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>

# S3 存储
S3_REGION=us-east-1
S3_ENDPOINT=<s3-compatible-endpoint>  # 可选，支持 S3 兼容存储
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=zen-send-transfers
TRANSFER_TTL_DAYS=30
```

## 许可证

MIT
