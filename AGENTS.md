# Vue3 企业后台模板

这是供 AI 开发和迁移企业后台的 Vue3 模板。业务按固定开发包组织，界面系统在 `src/shared/ui`，页面只拼装公共组件。模板带一个文件管理样板（`src/modules/file_library`），用 `npm run start:project` 建出的新产品不带它。

## 怎么运行

使用 Node.js 22.12 以上的 22.x、24.x 或 26.x，在本目录执行：

```bash
npm ci
npm run dev
npm run project -- --json
npm run check
npm run test:browser
VITE_API_MODE=real npm run build
```

开发地址为 `http://127.0.0.1:5180`。调试单包用 `npm run check -- --quick --module 包名`，提交前去掉 `--quick`；改公共代码时跑完整检查。格式用 `npm run format` 统一。命令参数写在 `--` 后面，`npm run check -- --help` 查看检查参数。

## 按任务找入口

| 任务 | Skill |
| --- | --- |
| 第一次接触、目录、数据流、开发顺序 | [vue-guide](.agents/skills/vue-guide/SKILL.md) |
| 新建开发包、页面、步骤 | [vue-module](.agents/skills/vue-module/SKILL.md) |
| 页面结构、组件、画面检查 | [vue-ui](.agents/skills/vue-ui/SKILL.md) |
| 检查、写测试、框架保护记录 | [vue-check](.agents/skills/vue-check/SKILL.md) |
| 计划、总览、影响范围、运行记录 | [vue-project](.agents/skills/vue-project/SKILL.md) |
| 把旧前端逐项迁进来 | [vue-migration](.agents/skills/vue-migration/SKILL.md) |
| 对接后端接口、真实后台验证 | [vue-backend](.agents/skills/vue-backend/SKILL.md) |
| 创建新产品、更新框架 | [vue-template](.agents/skills/vue-template/SKILL.md) |

页面怎么搭只看[页面配方](doc/ui-recipes.md)。业务需求和规则在 `doc/包名/`，生成的总图在 `doc/structure.md`。

## 长期约定

文件登记、导入范围、页面结构、样式和框架保护都有检查，按报错改，不删检查、不放宽规则。业务是否正确仍要按以下约定验证：

- 业务规则只写在 `doc/包名/rules.md`，带固定编号、异常、确认样例和测试路径；步骤的 `rule` 对应规则编号。用户确认的规则与代码冲突时先核对样例，不把规则改成错误实现。
- 查询以最新一次为准，写入不自动重发。写入中断或响应不能确认时是“结果未知”，先查询再决定；不吞错误，不用空数组替换失败。
- 代码不写普通注释或文档字符串，意图用名字、类型、字段说明和测试表达；只保留编译器必需指令与第三方许可。中文说明写清对象、动作、结果和单位；程序按错误码、状态值判断，不匹配中文文案。
- 页面登记的 `task` 写清这页唯一的用户任务。标题下不放说明小字，状态行只写实际状态。
- 测试通过不能代替看画面：页面改动按 vue-ui 的画面比较实际截图。
- 快速检查不跑全仓类型，不能替代提交前检查；单包检查不能写成全仓通过，演示服务和模拟测试不是真实后台验收。
- 共用框架（`src/shared`、`src/app`、`tools`、框架测试、`.agents/skills`）确需修改时，先写明用途、影响和验证，再运行 `npm run framework -- --accept`。
- 每个非公开动作在自身声明权限，由执行器检查，不能只依赖入口按钮；访问令牌只存页面内存，后台仍检查身份、组织和对象范围。
- 找代码、生成、检查和排错优先走项目 Skill 的标准命令；产品差异放配置，复用工具按 `vue-project` 扩展，不另写一套脚本绕过框架。
- 不提交密钥、真实数据、`node_modules`、`var` 和本机 `.agents`（项目 Skill 除外）。

- 隔离业务验收走 `npm run test:acceptance -- --backend 后端目录`，产品场景在 `tests/acceptance`；空场景与设施检查不能算业务验收，见 `doc/acceptance.md`。
- 改查询并发与结果采纳逻辑时按 `vue-check` 运行可选 TLA+ 检查；普通开发不运行 Java，见 `doc/formal-verification.md`。

- AI 完成开发后提交任务分支并创建 PR，按 `.github/pull_request_template.md` 连接规则、步骤、测试和实际结果；独立审查通过后按仓库约定合并，发布框架不等于部署产品。
