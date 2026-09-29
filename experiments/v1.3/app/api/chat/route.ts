import { getRealtimeContext } from "./realtime";
import { BETA_AMADEUS_PROMPT, STEINS_GATE_PROMPT } from "./personas";
import {
  getWorldLine,
  isWorldLineCommand,
  resolveWorldLineCommand,
  type WorldLineId,
} from "../../worldline";

// 浏览器提交给接口的消息不允许含有 system 角色，防止用户覆盖服务端的人设与实时数据。
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProviderMessage = ChatMessage | { role: "system"; content: string };

const validWorldLines = new Set<WorldLineId>([
  "alpha",
  "beta",
  "steins-gate",
]);

function isWorldLineId(value: unknown): value is WorldLineId {
  return typeof value === "string" && validWorldLines.has(value as WorldLineId);
}

function transitionReply(worldLine: WorldLineId) {
  const profile = getWorldLine(worldLine);
  if (worldLine === "alpha") {
    return "观测目标已切换至 α 世界线。人物档案已卸载，接下来的回答使用原始模型通道。";
  }
  if (worldLine === "steins-gate") {
    return "读数已稳定在 Steins Gate。档案出现了微小但决定性的差异。";
  }
  return `世界线已锁定为 β，偏移率 ${profile.divergence.toFixed(6)}%。Amadeus 记忆快照重新接通。`;
}

// POST /api/chat：确定世界线 → 取得按需实时数据 → 调用回答服务。
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: ChatMessage[];
      worldLine?: WorldLineId;
      // 保留旧字段，方便从 v1.2 升级时仍可请求；v1.3 以 worldLine 为准。
      rawMode?: boolean;
    };

    // 限制消息数量与单条长度，防止极长历史使请求失控。
    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter(
            (item) =>
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string",
          )
          .slice(-20)
          .map((item) => ({ role: item.role, content: item.content.slice(0, 8000) }))
      : [];

    if (!messages.some((item) => item.role === "user")) {
      return Response.json({ error: "请输入一个问题" }, { status: 400 });
    }

    // 只有三个预定义世界线可被客户端选择。未知值会回退到 β，避免用户构造任意人设。
    const requestedWorldLine: WorldLineId = isWorldLineId(body.worldLine)
      ? body.worldLine
      : body.rawMode
        ? "alpha"
        : "beta";
    const latestMessage = messages[messages.length - 1];
    const commandWorldLine = latestMessage?.role === "user"
      ? resolveWorldLineCommand(latestMessage.content, requestedWorldLine)
      : null;
    const worldLine = commandWorldLine || requestedWorldLine;

    // 世界线口令本身不送去回答服务；前端据此播放失真、滚动数字和重构聊天档案。
    if (latestMessage?.role === "user" && commandWorldLine) {
      return Response.json({
        reply: transitionReply(worldLine),
        demo: false,
        worldLine,
        transition: true,
      });
    }

    // 清除最近一次跃迁以前的历史，让不同世界线不把彼此的记忆带入下一次回答。
    const lastCommandIndex = messages.findLastIndex(
      (item) => item.role === "user" && isWorldLineCommand(item.content),
    );
    const activeConversation = messages
      .slice(lastCommandIndex + 1)
      .filter((item) => !isWorldLineCommand(item.content));
    const latestUserText = [...activeConversation]
      .reverse()
      .find((item) => item.role === "user")?.content || "";

    // 只有提问涉及时间或天气才联网；服务端把可靠观测结果作为额外上下文交给回答服务。
    const realtime = await getRealtimeContext(latestUserText);
    const personaPrompt = worldLine === "beta"
      ? BETA_AMADEUS_PROMPT
      : worldLine === "steins-gate"
        ? STEINS_GATE_PROMPT
        : null;
    const providerMessages: ProviderMessage[] = [
      ...(personaPrompt ? [{ role: "system" as const, content: personaPrompt }] : []),
      ...(realtime ? [{ role: "system" as const, content: realtime.forModel }] : []),
      ...activeConversation,
    ];

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      // 即使尚未配置回答服务，时间与天气工具仍可把已经取得的数据展示给本地演示。
      const fallback = realtime?.demoReply ||
        "当前对话服务尚未完成配置，因此暂时无法获取真实回答。请检查本地环境配置后重启服务。";
      return Response.json({ reply: fallback, demo: true, worldLine });
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        messages: providerMessages,
        stream: false,
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return Response.json(
        { error: data.error?.message || `对话请求失败（${response.status}）`, worldLine },
        { status: response.status },
      );
    }

    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string") {
      return Response.json({ error: "对话服务没有返回文本", worldLine }, { status: 502 });
    }

    return Response.json({ reply, demo: false, worldLine });
  } catch (error) {
    console.error("[Amadeus chat] request failed", error);
    return Response.json(
      { error: "请求格式无效或对话服务暂不可用" },
      { status: 500 },
    );
  }
}
