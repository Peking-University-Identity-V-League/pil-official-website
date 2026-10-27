# 北京大学第五人格赛事官网

Peking University ID5 League（PIL）的静态官网，个人公开仓库为 [Reverune/pkuidv](https://github.com/Reverune/pkuidv)。生产主页由 Cloudflare Pages 托管，两个战术入口由独立 Worker 提供。

| 地址 | 服务 |
| --- | --- |
| `https://pkuidv.com/` | Pages 主页 |
| `https://pkuidv.com/tactical-friend/` | 战术应用 Worker |
| `https://pkuidv.com/zhanshuyanlian/` | 同一战术应用 Worker |

## 自动发布

本仓库 `main` 分支提交后，GitHub Actions 使用 Node.js `24.18.0` 安装锁定依赖，执行测试、素材校验与构建，再发布到既有 Pages 项目 `pkuidv`。支持手动执行。`dist` 仅包含 `public` 的主页资源、响应头和公开提交元数据。

`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 存在本仓库的 Actions Secrets，只注入发布步骤。主页专用凭据只有对应账号的 Pages 写权限，不包含 DNS、个人资料或 Workers 管理权限。普通公开读者不能直接读取 Secret；拥有工作流写权限的人可以通过修改代码访问 Secret。

发布包装器只输出固定结果、数字 API 错误码、提交 SHA 与部署 ID，不输出 Wrangler 原始账号诊断。发布后通过认证 API 核验 Pages 的生产提交和成功状态。认证核验与外部页面访问分别确认，不把机器人挑战视为页面验证通过。

战术工具的每 30 分钟源码检查与 Worker 发布，由 [Reverune/pkuidv-tactical-friend-deploy](https://github.com/Reverune/pkuidv-tactical-friend-deploy) 独立负责。主页构建不再拉取或打包另一份战术工具，避免两个发布流程互相覆盖。

## 域名与路径

`pkuidv.com` 的 CNAME 指向 `pkuidv.pages.dev` 并启用 Cloudflare 代理。两个战术子路径通过该域名的 Worker 路由分配；省略末尾斜杠时由 Worker 补齐。根路径不会被战术 Worker 接管。

Pages 使用 `public/_headers` 中的主页安全策略。战术 Worker 返回自己的响应，允许其需要的地图素材；不会继承主页 CSP。域名所有权 TXT 文件按原字节保留在站点根目录。

## 本地检查和预览

```sh
npm ci --ignore-scripts
npm test
npm run verify
npm run build
npm run preview
```

打开 `http://localhost:4173/`。`npm run dev` 预览 `public`，`preview` 预览 `dist`；本地主页预览不模拟线上独立 Worker 路由。工具的本地预览参见战术部署仓库。

`verify` 解码 B 站、微信、小红书二维码，对照原始链接，并检查链接行为、图片、字体和资源。抖音使用提供的专用圆形码，需在抖音 App 扫描确认。

## 内容与素材

- `public/index.html`、`public/styles.css`、`public/app.js`：首页内容、响应式样式、二维码弹窗与交互。
- `platforms.json`：公开平台链接，用于生成和核验二维码。
- `assets/source/`：网页素材原图；浏览器使用 `public/assets/` 下的压缩素材。
- `scripts/prepare-assets.mjs`：从原图生成 WebP、平台 logo 和二维码；抖音使用提供的原始专用码。
- `scripts/prepare-brand.mjs`：保留 PIL logo 完整画面和北京大学中文校名字形与比例，采用指定 Web 色值 `#94070A`。
- `assets/LOGO-SOURCES.md`：图形素材来源；字体许可见 `public/assets/OFL.txt`。

修改平台链接时同步更新首页与 `platforms.json`，再运行 `npm run assets`、`npm run verify`。正常构建直接使用已生成素材。

## Umami 统计

首页与两个战术入口使用同一 Umami 网站，经 `umami.pkuidv.com` 上报。追踪仅在正式域名启用并尊重 Do Not Track，预览与本地访问不会混入正式数据。统计服务故障不影响页面操作。

首页统计平台链接点击、二维码打开与保存请求、导航按钮点击。页脚公共聚合接口显示今日访客和累计浏览量；访客数为匿名估算，接口失败时隐藏数字。

战术工具还统计固定类别的工具使用、对象数量、九宫格分布和经过时间，不发送标注文字、精确坐标、路线或完整战术 JSON。字段与过滤规则见战术部署仓库的 `telemetry/`。

后台网站属于 PIL 团队。`pil` 登录后的个人网站列表为空时，应切换到 PIL 团队工作区。

## 公开仓库边界

仓库只发布网页、素材和构建代码。`infra/`、`.deploy/`、`artifacts/`、`.apps/`、环境文件、私钥和下载来源元数据均被忽略。部署凭据只保存在对应仓库的 Actions Secret，不得写入源码、构建输出或公开日志。
