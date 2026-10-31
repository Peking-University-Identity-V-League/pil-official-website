# 北京大学第五人格赛事 · PIL

Peking University Identity5 League（PIL）官方网站，提供赛事介绍、官方平台入口，以及战术演练工具、随机抽取工具的导航。

**访问官网：[pkuidv.com](https://pkuidv.com/)**

## 本地开发

使用 Node.js 24：

```sh
npm ci --ignore-scripts
npm run dev
```

打开 [localhost:4173](http://localhost:4173/)。

## 检查与构建

```sh
npm test
npm run verify
npm run build
npm run preview
```

构建结果位于 `dist/`。本地预览包含官网首页，战术演练工具（[/tactical-friend](https://pkuidv.com/tactical-friend)）和随机抽取工具（[/lottery/](https://pkuidv.com/lottery/)）通过线上入口访问。

## 内容维护

- `public/`：网页与发布素材。`lottery-section.css` 是随机抽取工具预览的样式，在 `styles.css` 之后加载。
- `platforms.json`：官方平台链接和二维码配置。
- `assets/`：素材源文件与来源说明。
- `scripts/`：本地预览、素材处理和构建脚本。
- `scripts/i18n/`：多语言词典。`/en/`、`/fr/`、`/ru/`、`/ja/`、`/ko/`、`/es/`、`/ar/` 由中文首页按词典生成；修改首页文案后先更新 `source.mjs`，再更新各语言文件，否则 `npm run verify` 会报错。

修改平台链接时，同步更新首页与 `platforms.json`，再运行 `npm run assets` 和 `npm run verify`。

## 素材说明

赛事标识、平台图标及其他素材的权利归各自权利人所有。素材来源见 [assets/LOGO-SOURCES.md](assets/LOGO-SOURCES.md)，字体许可见 [public/assets/OFL.txt](public/assets/OFL.txt)。
