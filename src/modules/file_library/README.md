# 文件管理

入口在 `module.ts`，业务规则见 [文件规则](../../../doc/file_library/rules.md)。`flow.ts` 定义动作与步骤，`api.ts` 声明 `/api/v1/files` 接口；后端模板默认不带文件业务，真实产品需要实现这些接口。`public.ts` 是其他业务包唯一允许导入的入口。

列表、详情、上传各有独立页面。页面输入交给 `state.ts` 中的动作，输出只读。文件和页面由生成器登记，业务请求经过步骤，页面组合公共组件。

检查使用 `npm run check -- --module file_library`，浏览器行为在 `tests/browser/demo/`；这些测试连接演示 HTTP 服务，真实后台另行验证。
