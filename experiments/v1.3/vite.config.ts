import vinext from "vinext";
import { defineConfig } from "vite";

// 阿里云等普通 Node.js 服务器只需要 Vinext 本身。
// 不引入 Codex/Cloudflare 预览环境专用插件，避免构建时依赖 .openai 或 build 目录。
export default defineConfig({
  plugins: [vinext()],
});
