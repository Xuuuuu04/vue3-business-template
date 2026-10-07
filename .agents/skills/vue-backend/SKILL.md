---
name: vue-backend
description: 前端要对接 FastAPI 后端、核对接口路径与字段、或需要在真实后台验证时使用。
---

# 对接后端

公共登录声明在 `src/shared/session/login.ts`，提交时按需加载。POST `/api/v1/access/login` 输入组织、账号、密码和验证码，响应至少有非空 `access_token`、Bearer `token_type`、正整数 `expires_in` 和非空 `org_id`。前端不保存或自动使用刷新令牌，不要求未使用的响应字段。实际后台必须验证身份与权限。

接口路径和响应类型写在包的 `api.ts` 与 `data.ts`，现在是手写的，要和后端保持一致。后端导出的 `doc/api/openapi.json`（FastAPI 模板里由 `fastapi-docs` 生成）是对照来源。

## 对照与生成

```bash
# 检查所有业务包登记的接口：路径是否存在，返回字段的名称、必填、可空、类型是否一致
npm run api -- check --openapi ../后端/doc/api/openapi.json [--module 包名]
# 按路径前缀生成接口登记和 Zod 类型代码（输出到屏幕），作为写 api.ts、data.ts 的起点
npm run api -- gen --openapi ../后端/doc/api/openapi.json --prefix /api/v1/orders --module orders
```

`check` 有问题时退出码为 1，可以放进交付前检查。它只比较文档声明，不能证明后端真的这样返回；真实返回仍以运行时的响应检查和 `test:backend` 为准。

## 新接一个接口

1. 在后端 `doc/api/openapi.json` 找到这个接口：路径、方法、请求字段、响应字段、错误响应。
2. 在 `api.ts` 登记：`id`、`method`、`path`、响应的 Zod 类型。路径与后端一字不差；响应类型按 openapi 写，字段含义写进 `data.ts`。
3. 后端字段改了（名称、可空、枚举），前端响应检查会在运行时报错，不会悄悄显示空值。改完 openapi 要重新对照 `api.ts`，不要放宽 Zod 类型去"让它通过"。
4. 同源请求：开发时 `VITE_API_MODE=real npm run dev:real` 会把 `/api` 代理到 `API_PROXY_TARGET`（默认 `http://127.0.0.1:8000`）。

## 真实后台验证

只在用户明确提供的隔离测试账号和数据上运行，脚本会上传再删除一个文件：

```bash
TEMPLATE_TEST_PASSWORD=*** npm run test:backend -- --frontend http://127.0.0.1:5182 --org 组织代码 --username 账号 [--readonly-user 只读账号]
```

演示服务和模拟测试不是真实后台验收。验收结果要写明：后台版本、使用的账号角色、数据来源、通过了哪些操作，没验证的保持"未验证"。

## 当前缺口

生成的代码要人工核对后再放进 `api.ts`、`data.ts`（字段中文含义、敏感字段、业务上更严格的约束由人补）。后端的字段级错误（`fields`）还没有接到表单字段上。
