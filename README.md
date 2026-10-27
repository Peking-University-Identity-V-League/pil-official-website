# 北京大学第五人格赛事官网

Peking University ID5 League（PIL）的静态官网，个人公开仓库为 [Reverune/pkuidv](https://github.com/Reverune/pkuidv)。主页、两个战术入口与独立 Umami 均由 CST 服务器上的 Nginx 提供，域名使用 DNS 直连。

| 地址 | 服务 |
| --- | --- |
| `https://pkuidv.com/` | 静态主页 |
| `https://pkuidv.com/tactical-friend/` | 战术应用 |
| `https://pkuidv.com/zhanshuyanlian/` | 同一战术应用 |

## 自动发布

本仓库 `main` 分支提交后，GitHub Actions 使用 Node.js `24.18.0` 安装锁定依赖，执行测试、素材校验与构建，再经 HTTPS 发布到 CST。支持手动执行。`dist` 仅包含 `public` 的主页资源和公开提交元数据。

`CST_HOST` 和 `CST_DEPLOY_TOKEN` 存在本仓库的 Actions Secrets，只注入发布步骤。主页发布凭据只能调用主页静态发布接口，不提供 SSH、Docker 或系统管理权限。普通公开读者不能读取 Secret；拥有工作流写权限的人可以通过修改代码访问 Secret。

发布客户端通过 HTTPS 校验证书、上传压缩包并核对回执和线上提交元数据。服务器拒绝目录穿越、链接、特殊文件与超额资源，使用不可变版本目录和原子切换。日志只输出固定结果与公开提交 SHA。发布后另行检查公开域名、资源类型与版本，不接受代理挑战页或旧版本。

战术工具的每 30 分钟源码检查与发布，由 [Reverune/pkuidv-tactical-friend-deploy](https://github.com/Reverune/pkuidv-tactical-friend-deploy) 独立负责。两份凭据分别限定对应目录，两个发布流程不会互相覆盖。

## 域名与路径

`pkuidv.com` 和 `umami.pkuidv.com` 的 A 记录直连 CST，Cloudflare 仅承担 DNS，不启用代理。Nginx 将主页和两个战术入口映射到独立版本目录；省略战术路径末尾斜杠时返回 308，并保留查询参数。

Nginx 为主页配置安全策略，战术入口使用适合应用素材的响应头。域名所有权 TXT 文件按原字节保留在站点根目录。TLS 证书通过 DNS 验证自动续期。

## 本地检查和预览

```sh
npm ci --ignore-scripts
npm test
npm run verify
npm run build
npm run preview
```

打开 `http://localhost:4173/`。`npm run dev` 预览 `public`，`preview` 预览 `dist`；本地主页预览不包含独立部署的战术应用。工具的本地预览参见战术部署仓库。服务器接收端检查可运行 `npm run test:receiver`。

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

统计实例独立部署，仅有 `admin` 与 `pil` 两个账号。网站属于 `pil` 的个人工作区，登录后可直接查看，无需切换团队。历史网站 ID 保持不变。

## 公开仓库边界

仓库只发布网页、素材和构建代码。`infra/`、`.deploy/`、`artifacts/`、`.apps/`、环境文件、私钥和下载来源元数据均被忽略。部署凭据只保存在对应仓库的 Actions Secret，不得写入源码、构建输出或公开日志。
