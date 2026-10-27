# 北京大学第五人格赛事官网

Peking University ID5 League（PIL）的静态官网，个人公开部署仓库为 [Reverune/pkuidv](https://github.com/Reverune/pkuidv)。

一次构建包含三个入口：`/` 是赛事主页，`/tactical-friend/` 和 `/zhanshuyanlian/` 是同一份战术演练应用。两个应用入口使用相对资源路径，保留各自地址，并在同域名下共享浏览器本地存储。

## EdgeOne Pages / Makers 部署

导入本仓库，生产分支选择 `main`，根目录为仓库根目录，框架选择 Other / 其他：

| 设置 | 值 |
| --- | --- |
| Node.js | 控制台选择 `24.18.0` |
| 安装命令 | `npm ci --ignore-scripts` |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |

`edgeone.json` 已声明安装、构建、输出目录、两个入口的斜杠重定向和响应头，不设置 `nodeVersion`，沿用控制台选择。绑定 `pkuidv.com` 的项目应为本主页项目，才能同时提供主页与两个工具入口。独立战术部署仓库的根路径是战术应用，不能同时承担主页。

构建会浅克隆个人公开仓库 [Reverune/pkuidv-tactical-friend-deploy](https://github.com/Reverune/pkuidv-tactical-friend-deploy) 的最新 `main`，运行其中的静态打包器。打包器再读取组织公开应用仓库的最新 `main`，只复制 HTML、CSS、JS、语言文件并注入统计，不运行组织仓库的 npm 安装钩子或构建脚本。构建需要 GitHub 网络访问，不需要 GitHub Token、Cloudflare 凭据或 EO 部署钩子。

最终 `dist` 只包含主页公开素材、两个应用目录及公开的提交版本元数据。构建不会复制后台配置、运维记录或本地凭据。`public/` 中的域名所有权 TXT 文件按原字节保留。首页 CSP 只作用于首页，避免影响工具的外部地图资源。

EdgeOne Git 集成可在本仓库提交时重建。组织应用仓库单独更新不会触发本主页项目的 Git 集成；主页项目需要自己的部署钩子才能接入定时更新。独立战术项目现有的钩子只触发其所属项目，不能代替主页项目的钩子。手动重新部署本主页项目也会获取构建时最新的应用源码。

## 本地检查和预览

```sh
npm ci --ignore-scripts
npm test
npm run verify
npm run build
npm run preview
```

打开 `http://localhost:4173/`、`http://localhost:4173/tactical-friend/` 或 `http://localhost:4173/zhanshuyanlian/`。`npm run dev` 仅预览 `public/` 中的主页；`preview` 预览完整 `dist/`。

`verify` 解码 B 站、微信、小红书二维码，对照原始链接，并检查链接行为、图片、字体和资源。抖音为用户提供的专用圆形码，需在抖音 App 扫描确认。

## 内容与素材

- `public/index.html`、`public/styles.css`、`public/app.js`：首页内容、响应式样式、二维码弹窗与交互。
- `platforms.json`：公开平台链接，用于生成和核验二维码。
- `assets/source/`：网页素材原图；浏览器使用 `public/assets/` 下的压缩素材。
- `scripts/prepare-assets.mjs`：从原图生成 WebP、平台 logo 和二维码；抖音使用提供的原始专用码。
- `scripts/prepare-brand.mjs`：保留 PIL logo 完整画面和北京大学中文校名字形与比例，采用指定 Web 色值 `#94070A`。
- `assets/LOGO-SOURCES.md`：图形素材来源；字体许可见 `public/assets/OFL.txt`。

修改平台链接时同步更新首页与 `platforms.json`，再运行 `npm run assets`、`npm run verify`。正常构建直接使用已生成素材。

## 访问统计

首页与两个战术入口使用同一 Umami 网站 ID，经 `umami.pkuidv.com` 上报。追踪仅在正式域名 `pkuidv.com` 启用，尊重 Do Not Track；EO 默认预览域名和本地预览不会混入生产统计。统计服务故障不会影响页面操作。

首页统计平台链接点击、二维码打开与保存请求、导航按钮点击。页脚公共聚合接口显示今日访客和累计浏览量；访客数为匿名估算，接口失败时隐藏数字。

战术入口还记录地图、模式、工具、角色与道具的使用，以及首次编辑、对象数量、九宫格分布、经过时间、导出/撤销/清空请求。不会发送标注文字、精确坐标、路线或完整战术 JSON。详细字段与过滤规则可在战术部署仓库的 `telemetry/` 及 README 中审查。

## 公开仓库边界

仓库只发布网页、素材和构建代码。`infra/`、`.deploy/`、`artifacts/`、`.apps/`、环境文件、私钥和下载来源元数据均被忽略。部署钩子只能存入对应部署仓库的 Actions Secret，不应进入源码、构建输出或公开日志。
