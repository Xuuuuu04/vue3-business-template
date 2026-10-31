---
name: vue-guide
description: 第一次接触本 Vue3 模板、要启动项目或规划开发顺序时使用。新建开发包、写页面、检查、迁移、对接后端分别读下面列出的对应 Skill。
---

# 模板入门

这是一个 Vue3 企业后台模板。业务按开发包组织，界面由自带的界面系统提供，页面只拼装组件。

- `src/modules/包名/`：业务开发包，文件固定，由生成器创建。
- `src/shared/`：所有业务共用的能力：动作执行、请求、状态、导航、记录。
- `src/shared/ui/`：界面系统：主题、组件、版式。说明见 `src/shared/ui/README.md`。
- `src/app/`：入口、外壳、路由、开发工具页，`catalog.ts` 是业务登记入口。

数据怎么走：页面输入 → `state.ts` 的动作 → 权限与输入检查 → 业务步骤 → 声明接口 → 响应类型检查 → 只读状态 → 页面更新。步骤声明读写哪些字段，不 return 结果；普通格式化不必拆成步骤。

## 开始之前

1. 读项目根目录 `AGENTS.md`，运行 `npm run project -- --json` 看总体，再用 `--module 包名 --json` 展开当前包；业务含义看 `doc/包名/rules.md`，计划看 `project-plan.json`。
2. 先做出一项用户能操作、能检查的业务，按这项业务的依赖安排顺序，不要先把整个项目的底层做完。
3. 确认规则与样例后，只读这项业务需要的文件。业务做完后更新规则和测试路径，计算图由 `npm run docs` 生成，不手工抄代码。

## 启动

使用 Node.js 22.12 以上的 22.x、24.x 或 26.x：

```bash
npm ci
npm run dev
```

- 开发地址为 `http://127.0.0.1:5180`。演示服务按各包 `demo.ts` 回包，没有样例的接口返回 404 JSON。它每次重启恢复样例数据；真实后台按 `vue-backend` 另行验证。生产打包必须设置 `VITE_API_MODE=real`，`demo.ts` 不会打进生产包。
- 部署、写入真实后台、删除真实数据，只在用户明确授权的范围内做。

## 按任务选 Skill

根目录 [AGENTS.md](../../../AGENTS.md) 有全部 Skill 的路径表：开发包看 `vue-module`，页面看 `vue-ui`，检查看 `vue-check`，总览和影响范围看 `vue-project`，迁移、对接后端、建产品分别看 `vue-migration`、`vue-backend`、`vue-template`。

## 复制项目时

只复制 `.agents/skills/`。本机的任务记录、检查结果（`var/`）和临时目录不要带走。
