# 按需检查查询与写入状态

`npm run verify:state` 用 TLA+ 和 TLC 检查两个有限状态模型，再运行真实实现回归。普通 `check` 不启动 Java，不增加浏览器或生产服务器依赖；本地命令不联网。

## 什么时候运行

修改任务状态、动作执行、请求收尾或 HTTP 错误分类，涉及查询乱序、部分写入、并发收尾与结果未知时运行。映射在 `tests/formal/manifest.json`，对应函数源码变化会要求先核对模型与真实测试，再更新摘要。相关路径的 PR 可以在独立 CI 中运行该命令。

## 工具准备

需要 Java 11 以上及固定 `tla2tools.jar` 1.7.4（TLC 2.19）。JAR 放项目外，不提交。首次安装手动下载官方文件并核对 SHA-256：

```sh
curl --fail --location --proto '=https' --tlsv1.2 \
  https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar \
  --output /绝对路径/tla2tools-1.7.4.jar
shasum -a 256 /绝对路径/tla2tools-1.7.4.jar
npm run verify:state -- --jar /绝对路径/tla2tools-1.7.4.jar
```

固定摘要：`936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`。工具缺失、摘要不符、Java 不可用或某项 TLC 超过 60 秒都会失败，不自动安装或更换版本。

## 查询乱序模型

`LatestQuery.tla` 枚举同一 `latest` 实例最多三次查询的发起与成功或错误完成顺序。过时的完成不能改写当前页面结果或状态。模型把取消与执行器、页面两层保护合并为“只接受当前版本”。旧数据显示在新查询的 loading 阶段是允许的，禁止的是旧完成再次写入。

`LatestQuery.cfg` 要求规则通过；`LatestQueryBroken.cfg` 故意取消写回限制，应触发 `NoStaleCompletion`：开始查询 1，开始查询 2，查询 1 完成并错误地写回页面。

## 写入提交模型

`SubmitWrite.tla` 检查同一 `submit` 实例、同一账号，最多两次尝试、每次最多两个写请求。请求可以并发，也可以在前一个成功后继续发送；结果抽象为成功、明确拒绝或未知。步骤本身可在请求之前或之后失败。

| 规则 | 对应实现 |
| --- | --- |
| loading 不接受第二次提交 | `createTask.run` 的进行中检查；模型 `NoReentry` |
| 已发请求未结束时保持 loading | `createRequests.finish` 等待已发请求；`runStep` 捕获失败后仍等待收尾；模型 `PendingStaysLoading` |
| 发送前失败可以修正重试 | `sendRequest` 准备失败记为 failed；模型以没有发请求的本地失败表示 |
| 网络中断、写入响应无法解析仍可能已经保存 | `sendRequest`、`parseReply` 分类为 unknown；模型 `Resolve` |
| 写入的 5xx、408、499 结果未知，普通明确拒绝按失败处理 | `httpFailure` 分类；模型分别使用 unknown、rejected |
| 已写成功，后续计算失败或第二写请求拒绝并传播异常，整体仍为 unknown | `execute` 经 `writeFailure` 检查写入记录；模型 `PartialFailureIsUnknown` |
| unknown 后不再发请求 | `createTask.run` 的未知结果检查；模型 `NoUnknownResend` |

模型把请求结果与步骤结束分开：Resolve 只记录请求结果，Close 才表示步骤正常结束或向外传播失败。普通 4xx 可以被步骤捕获后继续发送请求，未传播的明确拒绝不自动算整个动作失败；未知请求即使被捕获，收尾仍判为 unknown。模型的 closed 表示步骤已结束，不等同于每个请求一失败就关闭 createRequests。步骤停止发送后仍等待全部已发请求结束，再判断整体状态。禁止重发指实例最终进入 unknown 后禁止新的尝试，不把仍在 loading 的同一次步骤内继续请求说成已被框架禁止。接口与 JSON 具体格式由源码映射和真实测试验证。

`SubmitWrite.cfg` 检查安全规则。`SubmitWriteBroken.cfg` 只放开 unknown 后重试，应触发 `NoUnknownResend`：第一次写入结果未知，第二次尝试又发送写请求。

`SubmitWritePartial.cfg` 使用正确的重试限制，额外要求找到“第一个请求先成功，第二个随后明确拒绝，最终 unknown”的可达样例。该配置违反 `PartialFailureWitnessAbsent` 是预期结果，表明场景确实到达，避免部分成功规则因路径没有出现而空通过。

只有指定的反例或可达样例才作为状态逻辑验证依据；语法错误、Java 启动失败或其他不变量失败属于执行异常。

## 真实实现与维护

随后执行 `concurrency.test.ts`、`execution-lifecycle.test.ts`、`http-limits.test.ts`、`field-errors.test.ts` 四份框架测试，核对旧响应、字段错误、重复提交、已写后续失败、并发收尾和 HTTP 不确定结果。测试直接调用真实 TypeScript 实现，传输使用合成响应，不调用生产后台。

每轮结果保存在 `var/formal/时间/result.json`，模型、错误配置、可达样例与真实测试日志分别留在该目录。运行前后核对项目输入指纹，包括源码、模型、配置、清单与测试，并复验工具摘要；中途改码或换配置不能仍报告通过。

对应函数变化后，先阅读差异，核对模型动作与实现是否一致，更新相称的真实测试和模型，运行全部配置，最后更新映射摘要。不能只接受新摘要或放宽规则。模型通过与真实测试通过分别报告。

本检查不证明 TypeScript 与模型等价，不覆盖无限请求、换账号、新建 task 实例后的重试、页面释放、网络协议、后台幂等性或真实数据库写入，也不保证请求最终完成。后台仍需业务唯一键、事务和真实验收。其他业务修改不用运行本命令。

上游说明：[TLA+ Tools](https://github.com/tlaplus/tlaplus)、[固定版本](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4)。
