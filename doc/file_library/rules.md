# 文件管理规则

- R-01：按团队、offset 与 limit 读取。total 与文件信息来自后台；筛选只作用于当前页。确认样例：后台返回 1 条、total=16、offset=10，则页面显示这一条并保留总数 16。
- R-02：详情使用文件编号读取，支持直接进入与刷新。返回列表保留 URL 中的筛选与分页。SPA 切换编号时，旧文件不再显示或允许操作，旧删除确认关闭；新编号读取中或失败均不得借旧文件操作。确认样例：A 详情打开删除确认后切到 B，B 慢读取或返回 403，不显示 A 的确认或下载、删除入口；B 成功后才可确认 B。
- R-03：选择一个非空文件，样板最大 10 MB（10,000,000 字节）；multipart 字段为 upload。只有后台返回有效 FileView 才表示上传成功，随后进入真实返回编号的详情。确认样例：3 字节文件返回 id=one，进入 one 的详情；空文件不发送请求。
- R-04：删除之前说明对象与结果，确认后执行，请求使用已显示且已确认的文件编号。只有后台 204 表示完成，随后返回列表。删除不会由前端重试。
- R-05：下载采用后台实际返回的二进制内容，并回收临时地址。不把读取详情视为已经下载。请求编号和保存名称取自点击时同一个已显示文件，等待期间切换详情不得改用新文件名。
- R-06：提交中禁止重复；写入中断或响应格式错误表示结果未知。保留输入和可查询入口，不自动重发。若本次动作已有写请求成功，后续步骤抛错、产出类型错误或第二写接口明确拒绝，整个动作仍禁止重发，提示已有保存、后续失败并先查询；请求记录保留每个接口的真实结果。输入、纯计算或首次写请求发送前错误，没有成功或未知写入时可修正重试。确认样例：删除请求连接中断后再次点击，实际请求数量仍为 1；首次 POST 成功、后续步骤失败，再点击不重发 POST，成功请求仍记录为成功。
- R-07：最新一次查询覆盖旧条件，旧响应即使更晚返回也不能覆盖新结果。页面退出取消在途读取。
- R-08：业务页使用统一组件、14px 起的字号与公共布局，不包含局部样式或左侧高亮条卡片。
- R-09：非公开动作在自身声明 file_library.read / file_library.write 并由执行器检查；页面按权限显示操作，后台继续检查身份、团队和对象归属。演示环境没有真实登录，不能用于验证后台权限。

这些是模板样板规则。真实产品的业务、数据保留策略、最大上传限制和权限由产品负责人明确后填写，不由局部代理补全。

- R-10：批量删除先确认，确认框列出要删除的文件。按顺序逐个删除，每个文件使用自己的删除请求和结果。明确失败的文件记为失败，继续删除后面的；某个文件结果未知时立即停止，后面的记为“未执行”。任何文件都不自动重试。完成后刷新列表，已删除的文件从勾选中去掉。确认样例：勾选 A、B、C，B 返回 403、C 返回 204，则显示“已删除 2、失败 1”，列表刷新；勾选 A、B、C，B 连接中断，则 A 已删除、B 未确认、C 未执行，C 的删除请求没有发出。
- R-11：批量下载按顺序逐个下载，每个文件保存为它自己的文件名；某个失败不影响其他文件，结果未知时同样停止。翻页或改每页条数时清空勾选，不操作看不见的文件。

（R-10、R-11 是模板按 R-06 推出的默认规则，产品可按实际业务调整。）

## 验证位置

| 规则 | 测试路径 |
| --- | --- |
| R-01 | `src/modules/file_library/tests/files.test.ts`、`tests/browser/demo/files.spec.ts` |
| R-02 | `tests/browser/demo/files.spec.ts` |
| R-03 | `src/modules/file_library/tests/files.test.ts`、`tests/browser/demo/files.spec.ts`、`tests/browser/demo/file-upload.spec.ts` |
| R-04 | `src/modules/file_library/tests/files.test.ts`、`tests/browser/demo/files.spec.ts` |
| R-05 | `tests/browser/demo/files.spec.ts` |
| R-06 | `src/modules/file_library/tests/files.test.ts`、`tests/browser/demo/files.spec.ts`、`tests/framework/concurrency.test.ts` |
| R-07 | `tests/framework/concurrency.test.ts` |
| R-08 | `tests/browser/demo/page-layout.spec.ts`、`tests/browser/demo/file-components.spec.ts` |
| R-09 | `tests/framework/permissions.test.ts` |
| R-10 | `src/modules/file_library/tests/files.test.ts`、`tests/browser/demo/files.spec.ts` |
| R-11 | `tests/browser/demo/files.spec.ts` |

测试路径从项目根目录写起。结构检查核对规则声明、映射与文件是否存在，行为通过仍需实际运行测试，真实后台权限仍须独立验证。
