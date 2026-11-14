---
name: vue-backend
description: 前端对接 FastAPI 后端、核对 OpenAPI 接口与响应字段、处理字段级校验错误或运行隔离联调验收时使用。纯静态演示页面时不读。
---

# 对接后端

让接口路径、响应类型、登录会话和字段报错严格对齐后端契约，对齐先对齐再动手与状态看得见。

## 接口与登录配置

```bash
npm run api -- check --openapi ../后端/doc/api/openapi.json [--module 包名]
npm run api -- gen --openapi ../后端/doc/api/openapi.json --prefix /api/v1/orders --module orders
```

1. **在 `login.config.ts` 适配登录接口**：
   - `src/app/login.config.ts` 不受框架锁定，可调整路径、组织代码开关、请求字段及响应映射。
   - 默认对齐后端 `POST /api/v1/access/login`：入参含 `org_code`、`username`、`password`、`otp_code`，回包提供非空 `access_token`、`Bearer` `token_type`、正整数 `expires_in` 与非空 `org_id`。
   - 未使用的用户信息和刷新令牌不要求后台返回；令牌仅保存在页面内存，不写入本地存储，刷新后需重新登录。
2. **用 OpenAPI 对照并登记接口**：
   - 先在后端运行 `uv run dev docs` 生成 `doc/api/openapi.json`，再运行 `npm run api -- gen` 产出接口与 Zod 类型草稿（字段说明存于 `.describe()`）。
   - 补齐中文业务含义、敏感标记 `secret` 与严格校验后放入 `api.ts` 和 `data.ts`；路径与方法需与 OpenAPI 一字不差，改完运行 `npm run api -- check` 核对。
   - 本地联调运行 `npm run dev:real`，把 `/api` 代理到 `API_PROXY_TARGET`（默认 `http://127.0.0.1:8000`）。
3. **在动作和后端双侧守住权限与会话**。非公开动作在前端声明自身 `permission`，后台同时校验身份、组织隔离与对象归属；金额等敏感数据在后端做最终校对。退出、重登或会话过期后，旧动作停止后续步骤并引导重新认证再查；此前已发出的写请求仍先查询实际后台状态。

## 表单字段错误链路

1. **统一绑定请求路径错误**：
   - 本地 Zod 校验与后端错误 `fields: [{field, problem}]` 均经安全过滤写入只读 `task.state.fieldErrors`，页面按路径绑定（如 `lines.0.quantity`）。
   - 无法落到具体控件的整单或通用错误继续由整页 `StatusMessage` 展示。
2. **区分敏感字段的错误展示**。包含 `secret` 字段的动作触发本地校验时，过滤所有路径且不回显输入值：保留不泄露原值的自定义中文业务提示，其余收敛到已声明顶层键与安全提示；非敏感动作完整保留嵌套路径与中文业务提示，后端字段错误按原始请求路径显式对应。提交中锁定输入与列表重排，失败保留草稿，下次提交清空旧错误，结果 `unknown` 仍引导先查询结果。

## 隔离验收与核对

1. **编写并运行隔离业务场景**：
   - 运行 `npm run test:acceptance -- --backend ../后端目录` 启动本轮专用 FastAPI 与 Vite real 环境执行 `tests/acceptance/*.spec.ts`，说明见 [隔离验收](../../../doc/acceptance.md)。
   - 测试通过页面完成登录、查询与写入并重查核对真实结果，禁用 `page.route` 伪造响应；空场景会报错，`--infrastructure` 只核对连通与退出，用于基础设施检查。
2. **分别记录真实环境局限**。隔离验收基于本地 SQLite 运行，PostgreSQL 事务隔离、异步 worker、迁移与外部服务需在独立真实测试环境使用测试账号另行核对；演示服务与模拟响应只验证前端流程，真实后台结果需独立验证。
