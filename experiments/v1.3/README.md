# Amadeus v1.3 · 世界线记忆终端

一个可在本地运行的 AI 智能助手示例。左侧展示 Amadeus 助手形象，右侧提供对话终端；支持世界线记忆分支、Phone Trigger、辉光管仪表、视觉噪声、实时天气时间与浏览器语音朗读。

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

## v1.3 互动

- 当前分支会显示为 `WORLD LINE: β`、`WORLD LINE: α`、`WORLD LINE: STEINS GATE` 或 `WORLD LINE: RAW CHANNEL`。
- `EL PSY KONGROO` 在 β 世界线与原始回答通道之间切换，跃迁时会播放 1 秒失真与辉光管重构。
- `WORLD LINE ALPHA` 可切换普通智能助手分支；Steins Gate 分支保留为隐藏口令。
- 直接询问“北京时间”“东京现在几点”“北京天气”等，即可按需使用服务器端实时工具。

详细世界线设定和口令见 [VERSION.md](./VERSION.md)。

## 可用命令

```bash
npm run dev     # 开发模式
npm run build   # 构建检查
npm run start   # 运行构建产物
```
