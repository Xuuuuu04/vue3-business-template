---
name: vue-backend
description: 前端要对接 FastAPI 后端、核对接口路径与字段、或需要在真实后台验证时使用。
---

# 对接后端

接口路径和响应类型写在包的 `api.ts` 与 `data.ts`，现在是手写的，要和后端保持一致。后端导出的 `doc/api/openapi.json`（FastAPI 模板里由 `fastapi-docs` 生成）是对照来源。

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

接口登记还没有从 openapi 自动生成。后端字段变化只能靠人工对照与运行时报错发现。建议下一步做生成工具，从 `openapi.json` 产出 `api.ts` 与响应类型并在检查里比较差异。
