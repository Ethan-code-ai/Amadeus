# PRTS · Amadeus Archive

这是从 `experiments/v1.4` 独立复制出的 PRTS 视觉实验版。**任何形式的世界线切换都会终止旧会话，并以目标世界线的欢迎语开启全新对话**。它保留 Amadeus 的内部人格逻辑，可见标志使用用户提供的罗德岛 Logo 图片，同时参考公开明日方舟页面的节点式信息结构、浅底高对比、冷青信号和安全橙动作色。

**仅限本地预览**：`public/rhodes-island-user-supplied.png` 是用户提供的官方标志，权利状态尚未核实，不得把本实验目录部署到公网、打入公开发行包或上传为公开仓库。此目录已移除从 v1.4 复制来的 Sites 托管配置，避免误部署到现有站点。原版 `experiments/v1.4` 完全不受影响。

视觉参考清单见 [`design-reference/arknights-prts/`](../../design-reference/arknights-prts/)。PRTS 是本项目内部变体名，不代表官方 PRTS。

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
