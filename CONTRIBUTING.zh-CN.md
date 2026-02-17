# BRIEF 贡献指南

[English Version](CONTRIBUTING.md)

感谢你参与 BRIEF 的开源共建。本仓库以「可复现、可部署、可协作」为基本原则。

## 基本规则

- PR 尽量小而清晰，一次只解决一类问题。
- 禁止提交私钥、Cookie、真实 API Key 等敏感信息。
- `env.example` 必须保持占位符形式，不能出现真实值。
- 涉及前端交互改动，请附截图或短视频。
- 涉及后端逻辑改动，请附可复现请求示例。

## 本地开发

```bash
npm --prefix backend install
npm --prefix frontend install
```

启动开发：

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

提交前建议构建校验：

```bash
npm --prefix backend run build
npm --prefix frontend run build
```

## 分支与 PR 约定

- 分支命名：`feat/*`、`fix/*`、`chore/*`、`docs/*`
- PR 标题示例：
- `feat(frontend): add gsap reveal for result sections`
- `fix(backend): improve token contract detection`
- `docs: update vibing-on-bnb submission checklist`

PR 自查清单：

- [ ] 无敏感信息泄露
- [ ] 本地构建通过
- [ ] 行为变化已同步文档
- [ ] API 字段兼容性已评估

## 代码风格建议

- 以 TypeScript 为主，命名清晰，减少隐式副作用。
- 前后端职责明确，不把后端逻辑塞进前端。
- 优先做渐进式重构，避免大爆炸改动。
- GSAP 动效要服务信息层级，不做噪音动画。

## Bug 反馈

建议包含：

- 环境信息（系统、Node 版本）
- 复现步骤
- 预期结果与实际结果
- 日志/截图

若为安全问题，请不要先公开提 issue，请按 `SECURITY.zh-CN.md` 流程反馈。
