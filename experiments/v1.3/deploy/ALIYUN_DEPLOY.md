# Amadeus v1.3 阿里云部署

本方案让旧版本继续监听 `127.0.0.1:3001`，新版本监听 `127.0.0.1:3013`。只有在 v1.3 验证成功后，才把 Nginx 从旧端口切到新端口。

## 1. 使用 WinSCP 上传

把发布压缩包上传到服务器：

```text
/root/Amadeus-v1.3-cloud.zip
```

## 2. 解压并安装依赖

以下命令在阿里云终端中以 root 用户执行：

```bash
mkdir -p /var/www/Amadeus-v1.3
unzip -q -o /root/Amadeus-v1.3-cloud.zip -d /var/www/Amadeus-v1.3
cd /var/www/Amadeus-v1.3
npm ci
```

## 3. 配置 DeepSeek

压缩包不会包含本地 API Key。首次部署时创建服务器自己的环境文件：

```bash
cd /var/www/Amadeus-v1.3
if [ ! -f .env.local ]; then cp .env.example .env.local; fi
nano .env.local
```

至少填写：

```dotenv
DEEPSEEK_API_KEY=你的真实API_Key
DEEPSEEK_MODEL=deepseek-v4-flash
```

保存后限制权限：

```bash
chmod 600 /var/www/Amadeus-v1.3/.env.local
```

这条条件命令不会覆盖服务器上已经存在的 `.env.local`。

## 4. 构建并启动 v1.3

```bash
cd /var/www/Amadeus-v1.3
npm run build

set -a
. ./.env.local
set +a

pm2 delete amadeus-v13 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

验证 Node 服务：

```bash
pm2 status
pm2 logs amadeus-v13 --lines 50 --nostream
curl -I http://127.0.0.1:3013
```

只有看到 `HTTP/1.1 200 OK` 后再继续。

## 5. 把域名从旧版本切换到 v1.3

先备份现有 Nginx 配置：

```bash
cp -a /etc/nginx/conf.d/amadeus.conf \
  /etc/nginx/conf.d/amadeus.conf.backup-$(date +%Y%m%d-%H%M%S)
```

只替换反向代理端口，保留现有域名和 HTTPS 配置：

```bash
sed -i -E 's#proxy_pass http://127\.0\.0\.1:[0-9]+;#proxy_pass http://127.0.0.1:3013;#g' \
  /etc/nginx/conf.d/amadeus.conf

nginx -t && systemctl reload nginx
```

验证：

```bash
grep -n "proxy_pass" /etc/nginx/conf.d/amadeus.conf
curl -I -H 'Host: ljq2333.fun' http://127.0.0.1
```

最后在浏览器打开：

```text
http://ljq2333.fun/
```

如果服务器已经配置有效证书，也可访问：

```text
https://ljq2333.fun/
```

## 回滚

如果域名切换后出现异常，把代理端口改回旧版的 `3001`：

```bash
sed -i -E 's#proxy_pass http://127\.0\.0\.1:[0-9]+;#proxy_pass http://127.0.0.1:3001;#g' \
  /etc/nginx/conf.d/amadeus.conf
nginx -t && systemctl reload nginx
```

旧版 PM2 进程在整个部署过程中无需停止。
