# 参与贡献指南

这份指南面向希望改进 `vue3-business-template` 的开发者与 AI 协作者，说明仓库的贡献边界、代码与界面规范、框架保护机制，以及提交 Pull Request 前必须完成的验证。

## 贡献范围

本仓库是面向企业后台开发与旧系统迁移的 Vue 3 通用前端模板：

- **适合贡献到本仓库的内容**：`src/shared/`（动作执行器、状态并发控制、HTTP 封装、运行记录、ReKa UI + Tailwind 界面组件与七套主题系统）、`src/app/`（应用壳层、路由守卫、登录与偏好设置、开发者工具与五类任务示例）、`tools/`（脚手架生成器、AST 结构与样式检查、OpenAPI 对照、产品初始化与三方合并升级）、`deploy/` 部署模板及 `.agents/skills/` 项目技能。
- **样板模块定位**：`src/modules/file_library` 只作为演示完整开发包结构的最小样板（下游执行 `npm run start:project` 时会自动清理），不往里面堆叠与框架示范无关的复杂业务。

较大的组件新增或执行器调整，建议先创建 Feature Request Issue 讨论使用场景和升级影响。

## 代码、界面与文档规范

`npm run check` 会在本地开发、打包和 CI 中统一执行以下规则：

1. **零普通注释与严格类型**：`.ts`、`.vue`（含 `<template>` 与 `<style>`）和 `.css` 中不写普通注释（仅保留编译器引用指令与第三方许可证声明），不用 `any` 和空 `catch`，字段说明写在 Zod schema 或动作字段定义中。
2. **文件与函数体积**：非测试源码单文件不超过 500 行，单函数不超过 80 行；超出时按职责拆分。
3. **单一任务页面规范**：每个业务页面只服务一个明确的用户任务（在 `module.ts` 写明 `task`）、只放一个主工作区、最多一个主操作按钮；禁止用多个卡片拼凑整页，标题下方不放冗余说明小字，业务页面只组合 `@/shared/ui/public` 公共组件，不私写颜色和局部样式。
4. **框架保护锁（`framework.lock`）**：修改 `src/shared`、`src/app`、`tools`、`deploy`、框架测试或 `.agents/skills` 后，必须先核对差异与下游升级影响，再运行 `npm run framework -- --accept` 更新保护摘要。
5. **中文表达**：文档、脚手架提示与报错信息使用清晰完整的中文句子，写明对象、动作、结果和单位，不用中文破折号、直角引号和生造黑话。

## 本地开发与验证步骤

需要 Node.js `22.12+`（或兼容的 `24.x` / `26.x`）：

```sh
npm ci
npm run format
npm run docs
npm run check
npm run test:browser
VITE_API_MODE=real npm run build
```

按改动内容补充专项检查：

| 改动内容 | 需要额外执行的验证 |
| --- | --- |
| 查询并发取消、写入单次提交或未知结果状态机 | 运行 `npm run verify:state` 执行 TLA+ 状态模型检查与真实回归（需本机安装 Java） |
| 公共组件、配色令牌、字号行高或页面配方 | 启动 `npm run dev`，在浏览器实际检查浅色、深色、三种侧栏与窄屏表现，对比度测试需在 `npm run test:browser` 全绿 |
| `start:project` 或 `update:framework` 工具 | 确认 `tests/architecture/generators.test.ts` 的隔离副本初始化与三方冲突中止测试全部通过 |
| 前后端隔离验收工具（`tools/acceptance.ts`） | 配合后端模板目录运行 `npm run test:acceptance -- --backend ../fastapi-business-template --infrastructure` |

## 提交 Pull Request

1. 从 `main` 切出功能或修复分支，运行 `npm run format` 统一代码格式，若改动了受保护框架文件则执行 `npm run framework -- --accept` 并把更新后的 `framework.lock` 一并提交。
2. 按 [.github/pull_request_template.md](.github/pull_request_template.md) 填写变更说明、代码与测试位置、实际运行过的检查命令及通过数量；没跑过的环境（例如真实后台联调或容器 Nginx 检查）如实注明“未验证”。
3. 说明该改动对已有下游产品执行 `npm run update:framework` 时的兼容影响与回退方式。
