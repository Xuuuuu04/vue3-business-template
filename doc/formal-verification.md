# 按需检查查询状态

`npm run verify:state` 用 TLA+ 和 TLC 检查一个有限的状态模型，再跑真实实现回归。它不加入普通 `check`，不增加浏览器或生产服务器依赖，命令不联网。

## 什么时候运行

修改 `src/shared/state/task.ts` 的 `createTask`，或 `src/shared/actions/runtime.ts` 的 `execute`，涉及查询完成顺序、版本检查或取消行为时运行。模型映射在 `tests/formal/manifest.json`，函数源码变化会让命令失败，要求维护者先核对模型与测试再更新摘要。

## 工具准备

需要 Java 11 以上，以及固定的 `tla2tools.jar` 1.7.4（TLC 2.19）。JAR 放项目外，不提交。首次安装时手动下载官方文件，并核对 SHA-256：

```sh
curl --fail --location --proto '=https' --tlsv1.2 \
  https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar \
  --output /绝对路径/tla2tools-1.7.4.jar
shasum -a 256 /绝对路径/tla2tools-1.7.4.jar
```

固定摘要：`936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`。命令会再次验证摘要，文件缺失、版本不符、Java 不可用或 TLC 超过 60 秒都明确失败，不自动安装或改用其他版本。升级工具要单独核对并更新工具记录。

```sh
npm run verify:state -- --jar /绝对路径/tla2tools-1.7.4.jar
```

## 模型检查什么

`tests/formal/LatestQuery.tla` 枚举同一 `latest` 任务最多三次查询的发起与完成顺序，每次完成可为成功或错误。规则是：已经过时的查询完成后，不能改变当前页面的结果或状态。

| 模型动作 | 对应实现 |
| --- | --- |
| Start | `createTask.run` 在等待前增加 `version`，保存 `current` 并进入 loading |
| Finish | `createTask.run` 在成功或错误分支写回前检查版本和取消状态；`execute` 也在步骤前后检查取消 |

模型把取消、执行器和页面两层检查合并成“只接受当前版本”这一条件，允许网络完成顺序任意交错。它不要求新查询完成前清空旧数据显示，所以先前成功结果可以在 loading 时保留；规则针对过时的完成事件再次写入。

命令运行两个配置：`LatestQuery.cfg` 要求规则通过；`LatestQueryBroken.cfg` 故意取消写回限制，必须触发 `NoStaleCompletion` 反例。最短错误顺序是：开始查询 1，开始查询 2，查询 1 完成并错误地写回页面。语法错误、Java 启动失败、其他不变量失败都不算抓住这个反例。

随后执行真实的 `tests/framework/concurrency.test.ts` 和 `tests/framework/field-errors.test.ts`，覆盖旧查询晚成功、旧字段错误晚返回、重复提交与部分未知结果行为。模型与真实测试分别验证，前者不能替代后者。

## 维护与结果

每轮结果在 `var/formal/时间/result.json`，TLC 正常模型、错误模型和真实实现测试日志在同一目录，状态搜索文件也是该轮专有。失败结果保留，修复时先看哪个阶段失败。运行前后都会核对源码映射，避免测试期间改码仍报告通过。

函数变化后：先阅读实际差异，核对表中的动作是否仍符合实现，按行为变化更新真实测试和模型，运行两个配置确认正确模型通过且错误模型仍产生预期反例，最后才更新对应函数摘要。不要靠放宽规则或仅更新摘要处理失败。

本检查只覆盖上述有界抽象；不证明 TypeScript 与模型等价，不覆盖无限请求、会话切换、页面释放、网络协议、后台写入或整个系统正确性，也不检查所有请求最终都会完成。`submit` 的未知写入不得重发目前由真实测试验证，未在此模型中建模。修改其他业务不用运行此命令。

上游工具说明：[TLA+ Tools](https://github.com/tlaplus/tlaplus)、[固定版本](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4)。
