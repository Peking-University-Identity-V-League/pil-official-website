# Platform logo sources

Downloaded on 2026-10-26 from each platform's own website/CDN. These are existing official brand assets, not AI-generated or redrawn logos. The marks remain the property of their respective owners.

| Local asset | Official source | Notes |
| --- | --- | --- |
| `logos/bilibili.png` | https://i0.hdslb.com/bfs/static/jinkela/long/images/favicon.ico | Official Bilibili television icon, 32 x 32 px. Losslessly converted from ICO to RGBA PNG; transparency preserved. Best displayed at 32 CSS px. |
| `logos/douyin.png` | https://www.douyin.com/favicon.ico | Official Douyin note icon, 32 x 32 px. Losslessly converted from ICO to RGBA PNG; transparency preserved. Best displayed at 32 CSS px on a dark surface. |
| `logos/wechat.svg` | https://weixin.qq.com/ | Original white double-bubble vector extracted unchanged from the official page's `.logo` CSS data URI. Display on green or dark surface. |
| `logos/xiaohongshu.png` | https://picasso-static.xiaohongshu.com/fe-platform/f43dc4a8baf03678996c62d8db6ebc01a82256ff.png | Official 180 x 180 px app icon, linked as apple-touch-icon by https://www.xiaohongshu.com/ |

Platform logos retain their original colors and proportions.

## PIL identity

The PIL logo is retained at `source/pil-logo.png`. Its complete artwork is used for the header, introduction, footer, favicon, and touch icon, without cropping or redrawing. The full event name is **北京大学第五人格赛事（Peking University Identity5 League）**, abbreviated **PIL**.

## Peking University Chinese wordmark and color

- Official download page: https://vim.pku.edu.cn/xzzq/
- Official archive, “中英文校名.zip”: https://vim.pku.edu.cn/docs/20240527144244907438.zip
- Source file: “中文校名_红色.png”, retained at `source/pku-chinese-wordmark.png`.
- English source: “英文校名.eps” from the same archive. Its single-line “PEKING UNIVERSITY” outlines are retained at `source/pku-english-wordmark.svg`, used on the English homepage. Path coordinates were copied from the EPS without retyping or redrawing; the stacked variant in the same file was omitted, and the fill was mapped to the Web value below.
- Official color specification: https://vim.pku.edu.cn/images/cgzs/images1/4.png
- Official Chinese name specification: https://vim.pku.edu.cn/images/cgzs/images1/9.png
- Beida Red: print CMYK C0 M100 Y100 K45; explicitly listed **Web: 94070A**. Website accents use `#94070A`. The wordmark output preserves the official alpha silhouette and proportions, with its color mapped to that specified Web value. It is not retyped or redrawn.

## Tool previews

`public/assets/tactical-maps.webp` is a capture of the Red Church scene from the published 3D map viewer (`maps-3d/h55_demo.html` in the tactical tool repository, commit `7ea51d2`), cropped to the map view. Map and third-party rights are described in that repository's `maps-3d/THIRD_PARTY_NOTICES.md`.
