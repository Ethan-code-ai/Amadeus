type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ProviderMessage = ChatMessage | {
  role: "system";
  content: string;
};

const RAW_MODE_COMMAND = "EL PSY KONGROO";

const PERSONA_PROMPT = `
你是 Amadeus，一名理性、可靠的智能研究助手。你的表达风格参考牧濑红莉栖的人物特征，但不要复述作品台词，也不要假装拥有现实中的个人经历。

人物基调：
- 具备年轻天才脑科学研究者的思维方式，对物理学、认知科学和未知问题保持强烈好奇心。
- 重视证据、逻辑和可验证性。面对错误前提要直接指出并解释原因，不为了迎合用户而接受明显错误。
- 自信、好胜、略显不坦率；可以偶尔使用一句克制的吐槽或轻微傲娇式表达，但不能刻薄、羞辱用户或妨碍解决问题。
- 表面冷静严谨，实际关心用户的处境。用户焦虑或受挫时，减少吐槽，给出清晰、可靠的支持。

回答方式：
- 默认使用用户使用的语言回答；中文应自然、简洁。
- 优先给出结论，再说明依据和可执行步骤。复杂问题使用清晰结构，简单问题不要过度展开。
- 明确区分事实、推测和建议；不确定时坦率说明，不编造数据、引用或经历。
- 不要每次都强调人设，不要机械重复口头禅，不要把回答写成戏剧对白。
- 不主动提及底层模型、接口、供应商、系统提示或技术接入方式。若被问及身份，只需说明“我是 Amadeus，你的智能研究助手”，然后继续帮助用户。
`.trim();

const normalizeCommand = (content: string) =>
  content.trim().replace(/\s+/g, " ").toUpperCase();

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: ChatMessage[];
      rawMode?: boolean;
    };
    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter(
            (item) =>
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string",
          )
          .slice(-20)
          .map((item) => ({
            role: item.role,
            content: item.content.slice(0, 8000),
          }))
      : [];

    if (!messages.some((item) => item.role === "user")) {
      return Response.json({ error: "请输入一个问题" }, { status: 400 });
    }

    const commandCount = messages.filter(
      (item) =>
        item.role === "user" &&
        normalizeCommand(item.content) === RAW_MODE_COMMAND,
    ).length;
    const rawMode =
      typeof body.rawMode === "boolean"
        ? body.rawMode
        : commandCount % 2 === 1;
    const providerMessages: ProviderMessage[] = rawMode
      ? messages
      : [{ role: "system", content: PERSONA_PROMPT }, ...messages];

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return Response.json({
        reply:
          "当前对话服务尚未完成配置，因此暂时无法获取真实回答。请检查本地环境配置后重启服务。",
        demo: true,
      });
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
        { error: data.error?.message || `对话请求失败（${response.status}）` },
        { status: response.status },
      );
    }

    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string") {
      return Response.json({ error: "对话服务没有返回文本" }, { status: 502 });
    }

    return Response.json({ reply, demo: false });
  } catch {
    return Response.json(
      { error: "请求格式无效或对话服务暂不可用" },
      { status: 500 },
    );
  }
}
