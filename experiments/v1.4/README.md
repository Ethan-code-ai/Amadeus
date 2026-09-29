# Amadeus v1.4 · 世界线观测终端

一个可在本地运行的 AI 智能助手实验版。v1.4 的核心变化是：**任何形式的世界线切换都会终止旧会话，并以目标世界线的欢迎语开启全新对话**。界面保留 Amadeus 原 Logo，以骨白氧化金属、铁锈橙、铜褐和少量氧化绿构成明亮锈蚀体系；原作式扫描线与现代信息编号只承担结构作用。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
copy .env.example .env.local
npm run dev
```

打开 <http://localhost:3000>。不配置 API Key 也可以运行，网站会自动进入 `DEMO` 演示模式。

如需连接 DeepSeek，在 `.env.local` 中配置 `DEEPSEEK_API_KEY`；密钥只在服务端使用，不会发送到浏览器。默认模型可通过 `DEEPSEEK_MODEL` 修改。

## v1.4 交互规则

- 世界线口令、Phone Trigger 选择以及服务端纠正世界线，全部调用统一的新会话流程。
- 新会话只保留目标世界线欢迎语和本次跃迁结果；旧消息、旧输入、朗读和未完成请求都不会带入。
- 迟到的网络响应会被会话代次校验丢弃，避免跳线后把旧回答写进新聊天。
- `WORLD LINE ALPHA`、`WORLD LINE BETA`、`EL PSY KONGROO` 及隐藏的 Steins Gate 口令继续可用。
- 时间、天气、语音朗读、动态人物与 Phone Trigger 功能继续保留。
- 登录入口使用原始 Amadeus 画面作为连续的全屏环境，认证信息贴合屏幕边缘，不再出现浮动窗口或嵌套 Logo 画框。

完整变更见 [VERSION.md](./VERSION.md)。

## 可用命令

```bash
npm run dev     # 开发模式
npm run build   # 构建检查
npm test        # 构建并运行页面/API 回归测试
npm run start   # 运行构建产物
```
