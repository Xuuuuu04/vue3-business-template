---
name: vue-backend
description: 前端要对接 FastAPI 后端、核对接口路径与字段、或需要在真实后台验证时使用。
---

# 对接后端

登录接口约定写在产品自己的 `src/app/login.config.ts`（不受框架保护，改了不用 `--accept`）：接口路径、是否填写组织代码、请求字段、回包怎么整理成 `access_token`、`expires_in`、`org_id`。默认值与后端模板的账号包一致：POST `/api/v1/access/login`，请求 `org_code`、`username`、`password`、`otp_code`，回包至少有非空 `access_token`、Bearer `token_type`、正整数 `expires_in` 和非空 `org_id`。后台不分组织时把 `orgCode` 改成 `false`。框架只负责调用、校验回包和把令牌存在页面内存里，不保存或自动使用刷新令牌。实际后台必须验证身份与权限。

接口路径和响应类型写在包的 `api.ts` 与 `data.ts`，要和后端保持一致。FastAPI 模板在 `server/` 执行 `uv run dev docs` 导出 `doc/api/openapi.json`，作为对照来源。

## 对照与生成

```bash
npm run api -- check --openapi ../后端/doc/api/openapi.json [--module 包名]
npm run api -- gen --openapi ../后端/doc/api/openapi.json --prefix /api/v1/orders --module orders
```

`check` 比较接口路径、方法和响应字段的名称、必填、可空与类型，有问题时退出码为 1。`gen` 把接口登记和 Zod 类型输出到屏幕，字段含义保存在 schema 的 `.describe()`，不生成说明注释，也不直接改业务文件。真实回包还要经过运行时响应检查，并按下面的方法连接真实后台验证。

## 新接一个接口

1. 在后端 `doc/api/openapi.json` 找到这个接口：路径、方法、请求字段、响应字段、错误响应。
2. 在 `api.ts` 登记：`id`、`method`、`path`、响应的 Zod 类型。路径与后端一字不差；响应类型按 openapi 写，字段含义写进 `data.ts`。
3. 后端字段改了（名称、可空、枚举），前端响应检查会在运行时报错，不会悄悄显示空值。改完 openapi 要重新对照 `api.ts`，不要放宽 Zod 类型去"让它通过"。
4. 同源请求：开发时 `npm run dev:real` 把 `/api` 代理到 `API_PROXY_TARGET`（默认 `http://127.0.0.1:8000`）。
5. 每个非公开动作声明自身权限，后台每个操作再检查权限；前端不能代替后台做组织、对象归属和金额校验。金额按接口约定保留精度，数据库金额查询在后端的 PostgreSQL 测试中验证。

登录、退出或会话变化后，旧动作不能用新身份继续发请求；会话过期时离开受限页面，重新登录后重新查询。变化之前已经发出的写请求仍可能生效，不能因为前端停止操作就重新提交。

## 真实后台验证

使用 `npm run test:acceptance -- --backend 后端目录` 启动本轮专用后端与 real 前端，执行产品的 `tests/acceptance/*.spec.ts`。初始合成数据由后端 `tests/acceptance/seed.py` 准备，需要时显式加 `--seed`。准备、页面操作、重新查询核对、清理和报告见[隔离验收](../../../doc/acceptance.md)。没有场景不能算通过；`--infrastructure` 只检查设施。

已有运行环境仍需独立验收：用业务测试账号和隔离数据核对真实权限、接口和保存结果。本地验收使用 SQLite，不验证 PostgreSQL、迁移、后台 worker 和外部系统。演示服务与模拟响应测试不是真实后台验收。

## 表单字段错误

后台错误正文的 `fields: [{field, problem}]` 会经过数量、路径和敏感信息检查，传到 `task.state.fieldErrors`。页面按准确的请求字段路径绑定，例如 `<Field :error="state.fieldErrors?.['lines.0.quantity']">`。动作输入的 Zod 校验也进入这条链路；中文业务约束写进 schema 的错误说明。

字段路径不会自动改名、不会写入草稿，也不作为 HTML 显示。提交期间停用字段与明细重排；再次提交会清除旧字段错误。明确失败后保留草稿；`unknown` 仍先查询结果，不能因修改字段而重复提交。

本地校验遇到声明了 `secret` 的动作时，使用固定中文错误，并将嵌套问题归到已声明的顶层输入，避免默认值、转换结果或自定义校验泄漏敏感数据。没有敏感字段的动作保留业务自定义说明与准确嵌套路径；后台字段错误仍按请求路径显式对应。

## 接入边界

生成的代码要人工核对后再放进 `api.ts`、`data.ts`（字段中文含义、敏感字段、业务上更严格的约束由人补）。字段名与后台路径不一致时由页面显式对应；没有对应控件的错误继续查看整页提示。
