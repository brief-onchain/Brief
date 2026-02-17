# BRIEF

[English Version](README.md)

BRIEF 是一个面向 BNB Chain 的 AI 链上地址研究入口。用户只需输入一次地址/CA/问题，即可获得「人话简报 + 证据链接」。

## 产品定位

- 产品类型：`Agent 化的链上研究浏览器`
- 体验目标：`一次输入，直接得到结论`
- 目标用户：研究员、交易用户、社区用户、链上新手
- 产品叙事：用 AI 降低门槛，避免复杂专业面板

## 为什么符合 Vibing on BNB 方向

BRIEF 按照 **Good Vibes Only: OpenClaw Edition (Vibing on BNB)** 的核心要求设计：

- AI-first 的开发与产品体验
- 输出可在链上验证（BSC/opBNB 的地址与交易证据）
- 仓库开源，可复现、可部署
- 用户体验尽量简单，面向大规模采用（mass adoption）

OpenClaw 在这里是产品启发，不是必须绑定的依赖。活动本身鼓励 AI 产品与链上执行能力，而不是要求必须使用某个固定框架。

## Vibing on BNB 合规说明

BRIEF 在仓库层面按 Vibing on BNB 要求组织为可核验提交：

- 赛道匹配：`Agent`
- 链上证明：支持提交 BSC/opBNB 合约地址或交易哈希
- 可复现性：公开仓库、可访问演示、可执行启动步骤
- AI 使用：在开发流程与产品能力中均有体现
- 活动约束：在限制期内不进行发币/募资/开池行为

官方要求参考：
- `https://www.bnbchain.org/en/blog/win-a-share-of-100k-with-good-vibes-only-openclaw-edition`
- `https://dorahacks.io/hackathon/goodvibes/detail`

## 核心能力

- 单输入框支持地址/CA/自然语言问题
- AI 可读风险输出（`TL;DR + 人话解释 + 关键结论`）
- 证据优先，所有结论尽量给可点击来源（BscScan、DexScreener、可选数据源 API）
- 可选增强数据源（Frontrun / MemeRadar / Arkham / GMGN / BscScan v2）由后端环境变量控制
- 前端使用 GSAP 增强交互动效
- 前端显式展示 `enhanced / fallback` 运行状态，方便评委核验

## 架构概览

- `frontend/`：Next.js App Router 前端壳
- `backend/`：Fastify API（`POST /api/brief`）
- `contracts/`：应用合约 `BriefAgentNFA`（兼容 BAP578 协议，Hardhat）
- 前端通过内置代理路由请求后端：`frontend/app/api/brief/route.ts`

合约接入说明：
- 用户端不需要手动输入合约地址
- 后端可通过 `BRIEF_NFA_CONTRACT` 自动绑定助手记录
- `/agents` 已支持链上 `创建 / 充值 / 提取` 与公开 Agent 按次付费调用（含交易校验）

## 本地开发

```bash
# backend
npm --prefix backend install
npm --prefix backend run dev

# frontend
npm --prefix frontend install
npm --prefix frontend run dev
```

构建检查：

```bash
npm --prefix backend run build
npm --prefix frontend run build
npm --prefix contracts run build
```

`contracts/` 建议使用 Node.js 22 LTS，Hardhat 在 Node 23 下兼容性较差。

## 环境变量规范

- `env.example`、`backend/env.example`、`frontend/env.example` 只保留占位符（`KEY=`）
- 真实密钥只放本地 `.env` / `frontend/.env.local`
- 密钥文件默认被 `.gitignore` 忽略
- 可选链上绑定变量：`BRIEF_NFA_CONTRACT`
- 可选链上网络变量：`BRIEF_NFA_CHAIN_ID`、`BRIEF_NFA_RPC_URL`
- 可选增强 key 包括：`ARKM_API_KEY`、`MORALIS_API_KEY`、`GMGN_*`、`FR_*`、`MR_*`、`BSCSCAN_API_KEY`（或 `ETHERSCAN_API_KEY` / `ETHERSCAN_V2_API_KEY`）

## 仓库文档

- 英文 README：`README.md`
- 中文 README：`README.zh-CN.md`
- 贡献指南：`CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md`
- 安全策略：`SECURITY.md` / `SECURITY.zh-CN.md`

## 免责声明

本项目是独立开源项目，不代表 BNB Chain 官方立场。
涉及第三方 API 与 AI 服务，请自行评估风险并对关键结论进行人工复核。
