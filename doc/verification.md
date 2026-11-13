# 检查结果怎么看

`npm run check` 执行静态检查、框架错误场景、生成器和业务样例。结果写入本机 `var/checks`：整仓存 `full.json`，单包存 `module-包名.json`，快速单包存 `quick-module-包名.json`，互不覆盖，都包含源码指纹和各阶段耗时；`project` 只在指纹一致时显示为当前结果。快速检查省略全仓类型，提交前仍跑完整检查。层次与范围选择见 [vue-check](../.agents/skills/vue-check/SKILL.md)。

`npm run test:browser` 检查公共组件、登录、主题对比度、窄屏与键盘操作；模板仓库还通过独立 HTTP 演示服务检查样板业务的直接进入、刷新、返回、失败和未知结果。真实 FastAPI 对接另用隔离数据验证账号权限、实际保存和查询结果，方法见 [vue-backend](../.agents/skills/vue-backend/SKILL.md)。

本地检查、远程 CI、真实后台和部署分别报告命令、版本和结果。源码变化后按影响范围重跑，旧报告不能作为当前通过结论；没有运行、失败或跳过的部分保持原状态。
