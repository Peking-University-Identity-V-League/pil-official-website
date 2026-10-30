# 官网三维地图：管理员安装说明

目标地址为 `https://pkuidv.com/maps-3d/`。本次由管理员安装服务器静态资源和 Nginx 配置；二维入口随后发布。首页和现有工具继续使用各自的发布流程。

## 取哪个包

使用 **`pil-maps-3d-d881d1f.tar.gz`**，以及同页的 **`pil-maps-3d-d881d1f.tar.gz.sha256`**。

下载页（私有仓库，需要仓库读取权限）：

https://github.com/Peking-University-Identity-V-League/pil-identity-v-tactical-friend-private/releases/tag/web-v0.16.2-d881d1f

没有仓库权限时，由仓库维护者下载这两个文件后传给管理员。无需授予服务器访问私有仓库的权限。

不要使用 Release 页面自动生成的 `Source code` 压缩包，也不要使用历史 `toolkit-v0.16.1` 离线包。它们不是本次官网运行包。

本包包含 10 张地图、地图列表、二维端点接入、人物通行修正和独立俯瞰速度。运行源码提交为 `d881d1fb0bf3aad2bc8a076707d9ed57c59623d7`；worker SHA-256 为 `996c8c04044295c97a95a5721bbf5a58daded5dc35a35e0954e3916fd0d0d695`。原始底图和模型已内嵌；服务器运行时只需 Nginx，无需 Node、Python 或数据库。

## 1. 上传并安装文件

通过现有 SSH/SFTP 或服务器文件管理器上传。包约 183 MiB，不能走首页/二维工具现有的 24 MiB `/_deploy/` 上传接口。解压后的原始运行资源约 382 MiB，保留旧版本及预压缩资源时建议预留 2 GiB。

以下命令用于 Linux，需管理员权限。`/srv/pil-maps` 是本次新建的独立目录，可按服务器约定调整，但必须与 Nginx 示例中的 `root` 一起调整。

在两个下载文件所在目录运行：

```sh
(
set -eu
sha256sum -c pil-maps-3d-d881d1f.tar.gz.sha256
sudo install -d -m 0755 /srv/pil-maps/releases
if sudo test -e /srv/pil-maps/releases/pil-maps-3d-d881d1f; then
    echo '同名发布目录已存在，请核验原目录或选择新目录，不要覆盖在线版本。'
    exit 1
fi
sudo tar --no-same-owner -xzf pil-maps-3d-d881d1f.tar.gz -C /srv/pil-maps/releases
cd /srv/pil-maps/releases/pil-maps-3d-d881d1f
sha256sum -c SHA256SUMS
)
```

包内目录：

```text
pil-maps-3d-d881d1f/
  maps-3d/                  # 实际网站运行文件
  deployment/               # 本说明和 Nginx 配置示例
  release-info.json         # 来源与验证信息
  SHA256SUMS                # 包内逐文件校验
```

确认校验全部通过，再切换 `current`。如果已有 `current`，先记录 `readlink /srv/pil-maps/current` 作为回滚目标；它应当是软链接。

```sh
sudo ln -s /srv/pil-maps/releases/pil-maps-3d-d881d1f /srv/pil-maps/current.next &&
    sudo mv -Tf /srv/pil-maps/current.next /srv/pil-maps/current
```

若 `current.next` 已存在，先检查并处理该残留软链接，再重做这组命令；不能跳过失败的创建步骤直接替换 `current`。

目录和文件需要允许 Nginx worker 读取；上述包使用 0755 目录和 0644 文件。若服务器启用 SELinux/AppArmor，按现有网站约定为这个静态目录设置读取规则。

## 2. 配置 pkuidv.com 的 HTTPS 站点

使用包内 `deployment/maps-3d.nginx.conf`，本仓库同目录也有相同示例。将它作为独立配置文件放到服务器，例如 `/etc/nginx/snippets/pil-maps-3d.conf`，然后在**现有 `server_name pkuidv.com` 的 HTTPS `server {}` 内**增加：

```nginx
include /etc/nginx/snippets/pil-maps-3d.conf;
```

示例只接管 `/maps-3d` 和 `/maps-3d/`，不要替换整份官网站点配置。它使用独立静态目录，首页、二维工具、抽签和其他服务的路径不变。

地图需要独立的 Content-Security-Policy：当前成品的模块、贴图和计算线程使用 `data:` / `blob:`。首页原有的严格策略不能同时追加到地图响应；即使另加一条宽松策略，两条策略仍会共同生效。验收时确认地图只有示例中的一条 CSP，首页仍使用原有策略。

Nginx 的 `add_header` 在子 location 定义后通常不再继承父级头；示例已包含地图需要的安全头。若父级另有 HSTS 或服务器定制响应头，请在地图 location 中保留相同值。若父级使用 `add_header_inherit merge`，请在地图 location 明确增加 `add_header_inherit off;`，避免首页 CSP 合并进来；该指令从 Nginx 1.29.3 起可用，旧版不要添加。上游代理如追加 CSP，也需对这个目录作相同处理。参见 [Nginx 官方响应头说明](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header_inherit)。

```sh
sudo nginx -t && sudo systemctl reload nginx
```

配置检验成功后才 reload。若服务器的 Nginx 不是由 systemd 管理，使用现有的平滑重载方式。

示例启用 gzip 协商压缩。若现有 Nginx 支持 `gzip_static`，也可在发布目录预生成 `.gz` 文件并开启静态压缩，以减少请求时的 CPU 开销；这不影响功能安装。

## 3. 验收地图，再发布二维入口

先检查：

```sh
curl --fail --silent --show-error https://pkuidv.com/maps-3d/__release.json
curl --head https://pkuidv.com/maps-3d/ordnance_factory1.html
curl --head https://pkuidv.com/maps-3d/pil-handoff.js
```

发布信息中的 `source_commit` 和 `worker_sha256` 应与上文一致；HTML 返回 `text/html`，JS 返回 JavaScript MIME，`Cache-Control` 为 `no-cache`。不能返回官网首页的 HTML 来代替不存在的地图文件。

浏览器打开 https://pkuidv.com/maps-3d/ordnance_factory1.html ，等待地图和碰撞加载完成，验证能标记 A/B 求路线、切换第三人称并移动、设置俯瞰速度；控制台不应有 CSP、模块或 worker 加载失败。再检查医院及其余地图能打开，并确认官网首页、二维和抽签仍可用。

地图线上验收通过后，再由仓库维护者合并并发布二维入口：

https://github.com/Peking-University-Identity-V-League/pil-identity-v-tactical-friend/pull/26

该 PR 当前为草稿，尚未合并。现有二维仓库的 main 发布流程会部署 `/tactical-friend/` 及 `/zhanshuyanlian/`。最终从二维页面选测距起终点，点击“切换三维”，确认同图同点和“返回二维战术板”正常；医院重叠楼层会要求选择。

## 回滚

- **首次安装**：移除本次增加的 `include`，`nginx -t` 通过后 reload；首页和原二维工具不受这份独立配置影响。
- **已有三维旧版本**：将 `/srv/pil-maps/current` 按相同的临时软链接加原子替换方式指回安装前记录的版本。保留旧版本目录直至验收完成。
- 二维入口与地图是两个发布步骤；若入口尚未发布，保持 PR 草稿即可。入口已发布时，按二维仓库原有方式回退对应发布。
