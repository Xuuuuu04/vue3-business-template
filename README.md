# Vue3 通用前端模板

供开发者与 Agent 开发、迁移企业后台使用。业务规则、代码、测试和运行记录有固定入口，方便按包理解业务、验证改动与接续工作。当前展示团队文件管理，创建新产品时自动移除这项样板业务。

自带可逐级展开的多级侧栏，业务菜单按页面权限显示。默认正文 16px，使用石墨浅色、浅侧栏、点阵背景质感、完整工作表面和宽松间距。业务页默认一个主要任务、一个工作区、一个主要操作；生成器与结构检查禁止卡片堆叠和标题下说明段落。

自带界面系统：七套配色、圆角与疏密可选，提供表格、筛选条、侧栏、图表和登录页，业务页面只组合公共组件。组件说明见 [界面系统](src/shared/ui/README.md)，开发时在“开发者工具 → 设计预览”查看实际效果。

## 看样板

需要 Node.js 22.12 以上的 22.x，或 Vitest 支持的 24.x / 26.x。

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:5180。文件管理可以上传、查看、下载和删除。演示模式按各包 `demo.ts` 回包，数据只在开发服务内存中保存。左下角的“开发者工具”提供功能地图、操作记录、页面速度和设计预览，可查看动作步骤、接口与代码位置。

在开发者工具 → 功能示例查看经营总览、客户管理、活动编辑、采购审批、客服会话五个可操作页面。也可以直接打开 `/dev/examples`。示例数据只保留在当前页面，刷新还原；[页面说明](doc/ui-examples.md)介绍各自操作与布局复用方式。

## 开始产品

```sh
npm run start:project -- /绝对路径/新产品
cd /绝对路径/新产品
npm ci
npm run docs
npm run new:module -- orders --title 订单管理
npm run docs
npm run check
```

产品副本没有样板业务和 Git 历史。先在 `doc/包名/rules.md` 写清业务规则、异常和确认样例，再实现生成的步骤与页面；规则编号对应步骤和测试，便于检查同一项业务。代码不写普通注释，用名字、类型、字段说明和测试表达意图。开发包文件通过生成器登记。

## AI 从哪里开始

```sh
npm run project -- --json
npm run project -- --module file_library --json
npm run impact -- --base main
npm run runs -- --file frontend-runs.json --run 运行编号
npm run new:page -- file_library history --title 文件历史
npm run new:step -- file_library summarize --action file_library.list --title 整理结果
```

新增步骤在业务实现之前会明确失败。新增页面与步骤使用脚本登记，字段与执行顺序仍由开发者按业务决定。模块测试写在模块的 `tests/` 固定位置。

- [设计说明](design/frontend-template.md)：设计目的、运行记录范围和实际限制。
- [开发约定](doc/development.md)：步骤、状态、请求、页面与检查。
- [生成的总图](doc/structure.md)：已登记业务包与页面。
- [文件规则](doc/file_library/rules.md)和[计算图](doc/file_library/flows.md)。
- [真实后台接入与部署](doc/deployment.md)。
- [产品交付](doc/delivery.md)：任务版式、状态接入、视觉检查、安全与资源限制。
- [隔离业务验收](doc/acceptance.md)：临时前后端、真实操作、后台结果核对与清理。
- [形式化检查](doc/formal-verification.md)：按需验证关键状态，不加入日常检查。
- [检查结果说明](doc/verification.md)：本地测试、浏览器、真实后台与远程 CI 分别确认。

## 检查与发布

```sh
npm run docs
npm run check
npm run test:browser
VITE_API_MODE=real npm run build
```

调试一个包先用 `npm run check -- --quick --module 包名`，提交前去掉 `--quick`，改公共代码或整批交付再跑完整检查。`check` 包含代码规则和格式核对，格式由 `npm run format` 统一。验证分为静态检查、动作与框架测试、浏览器检查、真实后台验证，按问题选择最低成本的层次，方法见 [vue-check](.agents/skills/vue-check/SKILL.md)。

普通生产打包拒绝默认演示模式。离线检查样板打包可用 `npm run build:demo`，演示产物不能作为真实产品发布。CI 重跑静态、业务与浏览器检查，真实后台和部署结果另行验证。

`framework.lock` 保护共用代码、主题、工具和检查；`scaffold.json` 记录生成器认可的文件。确需改变共用部分时单独说明原因、检查差异，再更新保护记录。该机制限制误写，不能替代系统权限隔离。

模板更新先预览：`npm run update:framework -- --source /新版模板目录`。产品和模板改过同一文件时，冲突会停止整次更新，清理注释与格式变化也按相同规则处理；核对产品行为后再人工合并。业务包与登记表不会被新版模板覆盖。
