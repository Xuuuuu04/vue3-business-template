# Vue3 通用前端模板

供 AI 开发和迁移企业后台使用。页面、业务动作、计算步骤和接口有固定入口；主代理通过总图安排开发包，局部代理在生成的文件中完成业务。当前样板是团队文件管理。

自带可逐级展开的多级侧栏，业务菜单按页面权限显示。默认正文 16px，使用墨黑浅色、轻侧栏、完整工作表面和宽松间距。业务页默认一个主要任务、一个工作区、一个主要操作；生成器与结构检查禁止卡片堆叠和标题下说明段落。

自带界面系统：七套配色、圆角与疏密可选，成品的表格、筛选条、侧栏外壳、图表和登录页，页面只拼装不写样式。组件说明见 src/shared/ui/README.md，开发时在「开发者工具 → 设计预览」查看实际效果。

## 看样板

需要 Node.js 22.12 以上的 22.x，或 Vitest 支持的 24.x / 26.x。

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:5180。文件管理可以上传、查看、下载和删除。当前是独立的 HTTP 演示服务，数据只在开发服务内存中保存。左下角的「开发者工具」（仅开发时可见）有功能地图（每个操作依次做了什么、调用哪个接口、代码在哪）、操作记录、页面速度和设计预览。

在开发者工具 → 功能示例查看客户管理、活动编辑、采购审批、客服会话四个可操作页面。也可以直接打开 `/dev/examples`。示例数据只保留在当前页面，刷新还原；[页面说明](doc/ui-examples.md)介绍各自操作与布局复用方式。

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

产品副本没有样板业务和 Git 历史。先写 `doc/包名/rules.md`，再填写生成的步骤与页面。不要手工复制开发包或创建任意文件；登记表与共用框架受到文件保护检查。

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
- [检查证据说明](doc/verification.md)：本机测试、浏览器和真实后台分别说明。

## 检查与发布

```sh
npm run docs
npm run check
npm run test:browser
VITE_API_MODE=real npm run build
```

普通生产打包拒绝默认演示模式。需要离线检查样板打包时运行 `npm run build:demo`，演示打包产物不得当作真实产品发布。CI 重跑结构、类型、业务和浏览器检查。

`framework.lock` 保护共用代码、主题、工具和检查；`scaffold.json` 记录生成器认可的文件。确需改变共用部分时单独说明原因、检查差异，再更新保护记录。该机制限制误写，不能替代系统权限隔离。

模板更新先预览：`npm run update:framework -- --source /新版模板目录`。产品和模板同时改动的文件会阻止整个更新。业务包与登记表不会被新版模板覆盖。
