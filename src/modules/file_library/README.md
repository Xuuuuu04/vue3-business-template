# 文件管理

入口 module.ts；业务规则见 doc/file_library/rules.md。flow.ts 定义动作计算图，步骤分别负责读取和写入，api.ts 使用后端模板的实际路径。public.ts 是其他业务包唯一允许导入的入口。

列表、详情、上传各有独立页面。页面输入交给 state.ts 中的动作，输出只读。生成器管理文件和页面登记。不要新增未登记文件、局部样式或外部请求。

检查：npm run check -- --module file_library。浏览器行为使用 tests/browser/demo/files.spec.ts；这些测试连接演示 HTTP 服务，真实后台另行验证。
