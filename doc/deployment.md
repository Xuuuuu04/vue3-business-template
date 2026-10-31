# 真实后台接入与部署

开发时复制 `.env.example`，设置 `VITE_API_MODE=real`、`API_PROXY_TARGET` 和实际组织代码，然后运行 `npm run dev:real`。通过登录页面使用后端账号；前端请求同源 `/api`，由开发服务器代理到后台。`VITE_` 变量会进入前端，不能放密钥或服务端私密配置。

登录接口约定在产品自己的 `src/app/login.config.ts`，业务接口在各包的 `api.ts`，可用 `npm run project -- --module 包名 --json` 查看。FastAPI 模板默认没有业务包，可用它的账号预设生成登录包，再对照 `doc/api/openapi.json` 接入并验证。响应的 `X-Request-ID` 和 `X-Run-ID` 自动进入运行详情。每个非公开前端动作检查自身权限，后台继续检查身份、组织和对象范围。

访问令牌只放内存，不写浏览器存储，也不自动刷新，刷新页面后重新登录。退出登录清除本页凭据和运行记录，并阻止旧动作继续发请求；会话过期时离开受限页面。后台会话撤销与跨页面会话保持需要产品另行明确要求并统一实现。

生产执行 `VITE_API_MODE=real npm run build`，将 `dist/` 放入静态资源目录。`deploy/nginx.conf` 提供同源部署参考，放在已有 `nginx.conf` 的 `http {}` 内；官方 Nginx 镜像可将它放到 `/etc/nginx/conf.d/default.conf`。它监听 8080，静态目录为 `/usr/share/nginx/html`，不是已经部署的服务。

`/api` 和 `/api/` 保留原始路径代理到 `http://127.0.0.1:8000`。容器内的 127.0.0.1 是该容器自身，独立后端容器需要改成实际服务地址。配置关闭代理自动重试、API 缓冲和 gzip，并请求后台不压缩响应，允许 SSE 数据及时发送；前端仍需要使用适合该接口的流式读取。上传参考限额为 12 MiB，容纳当前 10 MB（10,000,000 字节）的文件样例及 multipart 开销；生产按后台限额、代理限制和请求格式调整，后台仍要校验上传大小。[Nginx 代理说明](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

HTML 和 SPA 路径使用 `Cache-Control: no-store`。成功返回且打包后带哈希的 `/assets/` 资源可缓存一年；缺失资源返回 404，不回到首页，也不长期缓存。隐藏静态文件及 `.map` 返回 404。静态 JS/CSS 支持 gzip，API 响应不由此配置压缩。[Nginx 压缩说明](https://nginx.org/en/docs/http/ngx_http_gzip_module.html)

CSP 允许本地脚本、字体和同源请求，禁止对象与页面嵌入；内置主题和浮层使用动态样式，因此 `style-src` 保留 `unsafe-inline`。所有安全头与缓存头都在 server 层设置并带 `always`，覆盖错误响应。以后在 location 内添加 `add_header` 时需要保留完整的头部设置；旧版本 Nginx 会停止继承上层头部。[Nginx 响应头说明](https://nginx.org/en/docs/http/ngx_http_headers_module.html)

本配置是 HTTP 内部服务参考，HTTPS 应在可信外层代理或实际 HTTPS server 中终结。配置证书、域名、可信代理地址和转发协议之后再验证公开 HTTPS；不能直接信任任意客户端提供的转发头。本参考默认不发送 HSTS，避免把尚未配置的 HTTPS 写成承诺。

配置、保护与模板更新检查运行：

```sh
npx vitest run tests/framework/deployment.test.ts
```

本机已有 Docker 时，可以在隔离容器内实际验证配置。测试使用可替换的官方 Nginx 镜像和仅包含合成数据的 Python 后台，临时容器与文件在结束时清理，不连接真实后台。先准备镜像，再显式执行；普通检查不自动拉镜像或创建容器。

```sh
docker pull nginx:stable-alpine
docker pull python:3.12-slim
RUN_NGINX_CHECKS=1 npx vitest run tests/framework/deployment.test.ts
```

可用 `NGINX_TEST_IMAGE` 和 `NGINX_TEST_BACKEND_IMAGE` 指定已准备的镜像，按生产采用的版本复测。容器检查覆盖 `nginx -t`、SPA 直接访问、缓存/CSP/错误响应安全头、资源和 map 的 404、gzip、API 路径、一次写请求与 SSE。

开发工具默认在生产关闭。VITE_SHOW_CONSOLE=true 会注册运行和组件查看页，若开放生产页面，服务器必须另外限制访问。源码映射默认不公开。没有服务端权限控制的前端路由不能保护秘密。

上线之前分别确认：实际账号权限、组织隔离、上传限制、真实存储、下载内容、删除结果、后台运行编号、直接访问和浏览器返回。浏览器样板测试不证明这些真实服务行为。模板仓库 CI 不执行生产部署。
