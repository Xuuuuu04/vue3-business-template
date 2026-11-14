---
name: vue-check
description: 运行前端检查、编写测试、更新框架保护记录或核对构建产物预算时使用。改需求文档或纯查项目结构时不读。
---

# 检查

按改动范围选择最低层检查，确保每份结论对应当前源码指纹并如实写清范围。

## 选择检查命令

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 调试单个业务包 | `npm run check -- --quick --module 包名` | 跑结构、单包静态规则与单包测试，跳过全仓类型 |
| 单包提交前 | `npm run check -- --module 包名` | 包含全仓类型检查与完整单包校验 |
| 改公共代码或交付前 | `npm run check` | 运行全部静态检查、框架测试与模块测试 |
| 统一代码格式 | `npm run format`、`npm run format:check` | 由 Prettier 自动格式与校验 |
| 新增包、页或改函数位置 | `npm run docs` | 同步 `src/generated` 与结构/计算图，CI 用 `--check` 复核 |
| 页面、样式或交互改动 | `npm run test:browser` | 执行全部 Playwright 浏览器与主题对比度用例 |
| 生产打包与体积检查 | `VITE_API_MODE=real npm run build` | 检查 `build-budget.json` 启动 JS/CSS 预算（默认 200 KiB / 单文件 100 KiB） |

1. **区分检查范围与有效期**：
   - 检查结果保存在 `var/checks/` 下的 `full.json`、`module-包名.json`、`quick-module-包名.json` 并带源码指纹，源码改动后自动过期，可用 `npm run project -- --json` 查看。
   - 快速单包检查用于开发自测，提交前运行对应完整检查；全新产品未改动框架代码时，整仓检查跳过生成器工具测试并打印"沿用模板验证"。
2. **逐条满足四层验证和代码规则**。纯计算放模块测试；生命周期、并发和组件行为放框架或浏览器测试；真实接口鉴权和写库另做前后端隔离或真实环境验收。代码规则检查拒绝普通注释与文档字符串（保留编译指令和第三方许可）、显式 `any`、空 `catch`，以及超过 500 行的 TS/Vue 文件或超过 80 行的函数；超限时按职责拆清，不放宽配置。
3. **写可追溯且可重复的测试**。断言依据 `doc/包名/rules.md` 确认的样例编写，测试名标注 `R-XX` 编号，优先用元素角色与可见文字定位。针对真实缺陷、权限、并发顺序与 `unknown` 恢复保留回归用例；使用可控时钟或受控延迟请求验证时序。
4. **审慎更新框架保护与状态检查**：
   - `framework.lock` 保护 `src/shared`、`src/app`、`tools` 与框架测试；确需修改公共能力时写明用途与影响，看清差异后运行 `npm run framework -- --accept` 并重跑检查。
   - 修改 `src/shared/state/task.ts` 并发与采纳逻辑后，按 [形式化检查](../../../doc/formal-verification.md) 运行 `npm run verify:state -- --jar 工具路径`。
5. **不放宽断言或包预算**。遇到超限的体积或失败用例先查原因并修正代码；调整 `build-budget.json` 时写明业务理由与实测字节数，不直接把失败产物设为新基线。

## 验收

交付时运行 `npm run docs -- --check`、`npm run check`、`npm run test:browser` 与 `VITE_API_MODE=real npm run build` 全部通过；结合 [画面比较](../vue-ui/SKILL.md) 查看渲染画面，PR 中分别注明各项实跑命令、通过跳过计数、浏览器结果与环境限制。
