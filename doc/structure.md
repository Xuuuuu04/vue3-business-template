# 开发包与页面

这份文件来自实际登记内容。运行是否成功，使用 project 命令和浏览器运行详情查看。

## 文件管理

按团队查看、上传、下载与删除文件

入口：src/modules/file_library/module.ts

依赖：无

| 页面 | 路径 | 源码 | 动作 |
| --- | --- | --- | --- |
| 文件列表 | /files | src/modules/file_library/pages/ListPage.vue | file_library.list |
| 文件详情 | /files/:id | src/modules/file_library/pages/DetailPage.vue | file_library.info、file_library.delete、file_library.download |
| 上传文件 | /files/upload | src/modules/file_library/pages/UploadPage.vue | file_library.upload、file_library.list |
