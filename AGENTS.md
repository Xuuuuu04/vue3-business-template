# Vue3 企业后台模板

这是供 AI 开发和迁移企业后台的 Vue3 模板。业务按固定开发包组织，界面系统在 `src/shared/ui`，页面只拼装公共组件。模板带一个文件管理样板（`src/modules/file_library`），用 `npm run start:project` 建出的新产品不带它。

## 怎么运行

使用 Node.js 22.12 以上的 22.x、24.x 或 26.x，在本目录执行：

```bash
npm ci
npm run dev                        # http://127.0.0.1:5180
npm run project                    # 包、页面、动作和检查情况；完整结构加 -- --json
npm run check                      # 完整检查；单包 npm run check -- --module 包名
npm run test:browser               # 浏览器检查
VITE_API_MODE=real npm run build   # 生产打包
```

命令参数写在 `--` 后面，写错会直接报错；`npm run 命令 -- --help` 看用法。

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

文件登记、导入范围、页面结构、样式和框架保护都有检查，按报错改，不删检查、不放宽规则。下面几条检查管不到：

- 先写业务规则、编号、异常情况和确认样例；没定的标“待确认”，不自己补业务含义。测试预期来自确认样例，不来自代码现在的输出。
- 查询以最新一次为准，写入不自动重发。写入中断或响应不能确认时是“结果未知”，先查询再决定；不吞错误，不用空数组替换失败。
- 页面登记的 `task` 写清这页唯一的用户任务。标题下不放说明小字，状态行只写实际状态。
- 测试通过不能代替看画面：页面改动按 vue-ui 的画面比较实际截图。
- 单包检查不能写成全仓通过；演示服务和模拟测试不是真实后台验收。
- 共用框架（`src/shared`、`src/app`、`tools`、框架测试、`.agents/skills`）确需修改时，先写明用途、影响和验证，再运行 `npm run framework -- --accept`。
- 访问令牌只存页面内存；前端权限只决定按钮显示，后台仍要检查身份和组织范围。
- 不提交密钥、真实数据、`node_modules`、`var` 和本机 `.agents`（项目 Skill 除外）。
