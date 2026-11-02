# 隔离的前后端业务验收

`npm run test:acceptance -- --backend ../fastapi-business-template` 启动本轮真实 FastAPI HTTP 服务和 real 前端，执行 `tests/acceptance/*.spec.ts`，结束后关闭服务并清理临时 SQLite 与文件目录。不复用已有服务，不验证生产库、迁移、后台 worker 或外部服务。

后端先执行 `uv sync --locked`，前端需要 Chromium（`npx playwright install chromium`）。默认端口 5196、8159，用 `--frontend-port`、`--backend-port` 指定两个空闲端口。没有业务场景时失败；`--infrastructure` 只检查连接、页面加载和退出，不算业务验收。

## 产品场景

沿用 Playwright，从 `@playwright/test` 导入 `test`、`expect`。

1. 准备：需要初始数据时，后端提供 `server/tests/acceptance/seed.py` 的 `async prepare(services, folder)`，运行时显式加 `--seed`。只使用本轮服务、目录和合成数据，不读取生产凭据或访问外部系统。
2. 操作：通过真实页面执行登录、查询和写入，不用 `page.route` 或测试专用写入端点伪造结果。模拟响应仍放普通 browser 测试。
3. 核对：预期来自确认过的业务样例。写入后重新查询，核对后台结果、页面状态和权限。直接查询用 `process.env.ACCEPTANCE_BACKEND_URL`，编号为 `process.env.ACCEPTANCE_RUN_ID`，身份走实际认证流程。
4. 清理：框架停止自己的进程并清理临时数据，场景额外资源用 fixture 的 `try/finally` 清理。

`test.only`、零测试、跳过场景都不能通过。后台响应头 `X-Acceptance-Run` 必须属于本轮。

## 结果

摘要在 `var/acceptance/<编号>/result.json`，场景在 `cases.json`；最新业务结果是 `var/checks/acceptance.json`，设施结果是 `acceptance-infrastructure.json`。前后端指纹、场景和退出状态分别记录，运行期间源码变化也使本轮失败。

默认不记录 trace、视频、HTML网络报告、错误正文或自动截图。需要画面验证时在登录后主动截图，只使用合成数据。结果保留在 `var/`，不复制到新产品或提交。SQLite结果不能替代PostgreSQL或真实部署验收。
