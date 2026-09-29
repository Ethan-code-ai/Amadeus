# Amadeus · DeepSeek 智能助手

一个可在本地运行的 AI 智能助手示例。左侧展示 Amadeus 助手形象，右侧提供 DeepSeek 对话终端；支持思考状态动画与浏览器语音朗读。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
copy .env.example .env.local
npm run dev
```

打开 <http://localhost:3000>。

不配置 API Key 也可以运行，网站会自动进入 `DEMO` 演示模式。要连接真实 DeepSeek：

1. 在 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 创建 API Key。
2. 编辑 `.env.local`，将 `DEEPSEEK_API_KEY` 改为真实值。
3. 重新启动 `npm run dev`。

API Key 只在服务端使用，不会发送到浏览器。默认模型为 `deepseek-v4-flash`，可通过 `DEEPSEEK_MODEL` 修改。

## 可用命令

```bash
npm run dev     # 开发模式
npm run build   # 构建检查
npm run start   # 运行构建产物
```
