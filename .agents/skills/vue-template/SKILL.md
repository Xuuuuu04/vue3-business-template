---
name: vue-template
description: 从本模板创建独立新产品，或将新版模板框架更新合并进已有产品时使用。日常开发产品业务包时不读。
---

# 模板管理

把干净模板复制成新产品或安全合并框架更新，同时保留产品业务包与本地配置，对齐一处只装一件事。

```bash
npm run start:project -- /绝对路径/新产品 [--name 产品名称]
npm run update:framework -- --source /新版模板目录
npm run update:framework -- --source /新版模板目录 --apply
```

## 创建新产品

1. **确认目标路径安全**。目标目录需在模板目录之外且为空，按真实路径校验并拒绝目录内或符号链接来源，环境变量样例与素材同理检查。支持 `--name 产品名称`（缺省取目录名）。
2. **自动裁剪样板并保留保护基线**：
   - 脚本移除 `src/modules/file_library`、样板测试 `tests/demo` 与 `tests/browser/demo`、`design/`、`var/` 及 Git 历史。
   - 同步把产品名写入 HTML 标题、`package.json`、`CHANGELOG.md`（从 `0.1.0` 起步）与 `app.config.ts`，并清空样板宣传、公司和联系方式。
   - 把 `.env.example` 切为 `real` 模式，保留 `.agents/skills/`、公共组件、安全用例与 `tests/framework/fixtures/`，并生成 `framework.lock` 与 `.template/` 来源记录。
3. **在新目录初始化配置**：
   - 按提示进入新目录依次运行 `npm ci && npm run docs`，使用 `npm run new:module` 新建业务包；新产品的保护记录已写入，无需执行 `--accept`。
   - 接着补充 `src/app/app.config.ts` 的品牌信息、`src/app/login.config.ts` 的登录约定，交由法务改写 `src/app/legal.ts` 后将 `legal.reviewed` 设为 `true`。

## 更新已有产品与回退

1. **先核对产品差异与权限字段**：
   - 更新脚本不改动 `src/modules/`、`catalog.ts`、`login.config.ts`、`app.config.ts` 和已有 `build-budget.json`，只补齐新配置与 `package.json` 脚本。
   - 更新前先核对产品各业务动作是否已声明独立 `permission`（公开动作标 `public`），并将规则验证位置表整理为每行一条完整测试路径。
2. **先预览再应用三方合并**：
   - 不带 `--apply` 只输出预览；脚本比对旧模板、产品当前与新版模板三份内容，遇到冲突或越界路径、链接与业务文件会拒绝写入。
   - 清理冲突后在授权下运行 `--apply`；若界面有调整再对照 [界面系统](../vue-ui/SKILL.md) 核查画面，验证全部通过后运行 `npm run framework -- --accept`。
3. **利用 Git 撤回未上线更新**。尚未发布的框架更新直接通过 Git 回退；已发布环境依据产品自身的备份与发布流程恢复。

## 验收

创建新产品后在目标目录执行 `npm ci && npm run docs && npm run check && npm run test:browser && VITE_API_MODE=real npm run build` 全部通过；更新框架后冲突清零、`framework.lock` 一致且全量检查与浏览器检查通过。
