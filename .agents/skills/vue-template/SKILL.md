---
name: vue-template
description: 从本模板创建新产品，或把模板的框架更新合并进已有产品时使用。更新脚本不会处理业务包和产品自己的依赖。
---

# 模板管理

```bash
npm run start:project -- /绝对路径/新产品                 # 创建新产品
npm run update:framework -- --source /新版模板目录          # 更新已有产品：只预览
npm run update:framework -- --source /新版模板目录 --apply  # 确认后执行
```

## 创建新产品

- 目标必须是本项目之外的空目录。
- 干净产品去掉样板业务和历史，保留模板来源记录和框架内容，复制项目 Skill，不复制本机记录、检查结果和 Git 历史。
- 样例业务的本地及浏览器用例分别放在 `tests/demo`、`tests/browser/demo`，创建产品时整体删除；公共组件、登录与安全用例及 `tests/framework/fixtures` 中的已知输入继续保留。模板运行全部检查，新产品仍执行 `npm run check`、`npm run test:browser` 和现有 CI，并为真实业务补充自己的用例。不要用逐个文件黑名单或跳过公共检查处理样例依赖。
- 创建后在新目录运行 `npm install`、`npm run docs`、`npm run framework -- --accept`，再生成业务包。
- 改 `src/app/app.config.ts`：产品名称、logo、标语与亮点、公司名、备案号、联系方式、默认配色，已有视觉要求直接沿用，先做出可检查的实际页面，不把默认配置当作成品质感。用户协议和隐私政策（`src/app/legal.ts`）是文本骨架，必须由法务改写后再把 `legal.reviewed` 改为 true。

## 更新已有产品

先运行预览，看清会改哪些文件。比较三份内容：旧模板、产品当前、新模板；只要有一处冲突，就不写入任何文件。业务包和 `catalog.ts` 不被覆盖；产品对共用主题文件的修改也参与冲突判断。预览没问题并在授权范围内，再加 `--apply`，之后运行检查。更新涉及 UI 时，按 vue-ui 比较产品当前、模板新版与更新后页面，保留产品已经确认的视觉要求。

## 恢复

还没部署的更新用 Git 撤回。已经部署的需要产品自己的备份和恢复办法，脚本不提供。
