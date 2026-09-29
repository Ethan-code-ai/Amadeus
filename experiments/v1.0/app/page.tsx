"use client";

// 本页需要浏览器状态、事件和语音 API，因此必须是 Client Component。
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { LiveCharacter } from "./LiveCharacter";

// 页面显示的消息结构。demo 用来标记没有 API Key 时的演示回复。
type Message = {
  role: "user" | "assistant";
  content: string;
  demo?: boolean;
};

// 新会话的固定欢迎语不会发送给模型，避免它污染真实聊天历史。
const welcome = "通信链路已建立。我是 Amadeus，有什么需要我协助的？";

// 首屏快捷问题。
const suggestions = [
  "解释一个我最近不理解的概念",
  "帮我整理今天的工作计划",
  "分析一个问题并给出可执行建议",
];

const MODE_TOGGLE_COMMAND = "EL PSY KONGROO";

export default function Home() {
  // ===== 对话与界面状态 =====
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcome },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [rawMode, setRawMode] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  // 新消息或“正在思考”状态出现时，将聊天区域平滑滚动到底部。
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  // 使用浏览器自带的 Web Speech API 朗读回答。
  // 可用音色取决于访问者的操作系统和浏览器，不是服务器统一提供的声音。
  function speak(text: string) {
    if (!voiceOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      text.replace(/[*#`>_\[\]]/g, ""),
    );
    utterance.lang = "zh-CN";
    utterance.rate = 1.02;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  // 发送消息的完整流程：更新本地界面 → 请求后端 → 写入回复 → 朗读。
  async function sendMessage(text = input) {
    const clean = text.trim();
    if (!clean || thinking) return;

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: clean },
    ];

    // 前端立即切换模式用于更新界面；服务端仍会独立判断，不能只信任客户端。
    const unlocksRawMode =
      clean.replace(/\s+/g, " ").toUpperCase() === MODE_TOGGLE_COMMAND;
    const nextRawMode = unlocksRawMode ? !rawMode : rawMode;
    setMessages(nextMessages);
    setRawMode(nextRawMode);
    setInput("");
    setThinking(true);
    window.speechSynthesis?.cancel();
    setSpeaking(false);

    try {
      // 浏览器只请求同源 /api/chat，所以 API Key 不会出现在浏览器中。
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 固定欢迎语只属于界面，不属于真正的模型上下文。
          messages: nextMessages
            .filter((item) => item.content !== welcome)
            .map(({ role, content }) => ({ role, content })),
          rawMode: nextRawMode,
        }),
      });
      const data = (await response.json()) as {
        reply?: string;
        demo?: boolean;
        error?: string;
      };
      if (!response.ok || typeof data.reply !== "string") {
        throw new Error(data.error || "未收到有效响应");
      }

      // 使用函数式更新，保证追加到当时最新的消息数组。
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply!, demo: data.demo },
      ]);
      speak(data.reply);
    } catch (error) {
      // 网络错误和后端返回的错误都会转成一条可见的助手消息。
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `通信中断：${
            error instanceof Error ? error.message : "未知错误"
          }。请检查服务后重试。`,
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  // 表单提交入口（点击 SEND）。
  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  // Enter 发送，Shift + Enter 保留为输入换行。
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  // 新会话只重置当前浏览器内存中的状态，不会删除服务端数据。
  // 当前项目没有数据库，因此刷新页面同样会丢失聊天历史。
  function resetChat() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setRawMode(false);
    setMessages([{ role: "assistant", content: welcome }]);
  }

  // 将两个布尔状态归并为人物组件使用的三种模式。
  const state = thinking
    ? "processing"
    : speaking
      ? "speaking"
      : "ready";
  const stateLabel = {
    processing: "ANALYZING INPUT",
    speaking: "VOICE OUTPUT",
    ready: "SYSTEM READY",
  }[state];

  // ===== 页面布局：顶部状态栏、左侧人物、右侧聊天与输入框 =====
  return (
    <main className="terminal">
      <header className="system-bar">
        <div className="wordmark">
          <span className="wordmark__glyph">A</span>
          <div>
            <b>AMADEUS</b>
            <small>Adaptive Multi-purpose Assistant</small>
          </div>
        </div>

        <div className="system-bar__center">
          <span>RESEARCH ASSISTANT TERMINAL</span>
          <i />
          <span>SESSION 01</span>
        </div>

        <div className="system-actions">
          <span className="link-state"><i /> NEURAL LINK ONLINE</span>
          <button
            type="button"
            className="square-button"
            onClick={() => setVoiceOn((value) => !value)}
            aria-label={voiceOn ? "关闭语音" : "开启语音"}
            title={voiceOn ? "关闭语音" : "开启语音"}
          >
            {voiceOn ? "VOL" : "MUTE"}
          </button>
          <button type="button" className="new-session" onClick={resetChat}>
            + 新会话
          </button>
        </div>
      </header>

      <section className="workspace">
        <section className="portrait-panel">
          <div className="panel-label">
            <div>
              <span>ENTITY PROFILE</span>
              <strong>MAKISE KURISU / AMADEUS</strong>
            </div>
            <span className="online"><i /> ONLINE</span>
          </div>

          <div
            className={`portrait-stage portrait-stage--${state}`}
          >
            <div className="portrait-aura" />
            <LiveCharacter mode={state} />
            <div className="scan-line" />
            <div className="screen-lines" />
            <div className="focus-corner focus-corner--tl" />
            <div className="focus-corner focus-corner--tr" />
            <div className="focus-corner focus-corner--bl" />
            <div className="focus-corner focus-corner--br" />
            <div className="state-badge">
              <span className="state-badge__pulse" />
              <div>
                <small>CURRENT STATE</small>
                <b>{stateLabel}</b>
              </div>
            </div>
            <div className="interaction-hint">
              MOVE TO TRACK · CLICK TO REACT
            </div>
          </div>

          <div className="profile-stats">
            <div><span>ENTITY</span><b>KURISU</b></div>
            <div><span>MODE</span><b>{rawMode ? "RAW" : "PERSONA"}</b></div>
            <div><span>VOICE</span><b>{voiceOn ? "ACTIVE" : "MUTED"}</b></div>
          </div>
        </section>

        <section className="communication-panel">
          <div className="communication-header">
            <div>
              <span>AMADEUS COMMUNICATION</span>
              <h1>智能助手对话终端</h1>
            </div>
            <div className="header-data">
              <span>MESSAGES</span>
              <b>{messages.length.toString().padStart(2, "0")}</b>
            </div>
          </div>

          <div className="conversation" ref={listRef} aria-live="polite">
            <div className="date-divider">
              <span>SECURE CHANNEL · LOCAL SESSION</span>
            </div>

            {messages.map((message, index) => (
              <article
                className={`message message--${message.role}`}
                key={`${message.role}-${index}`}
              >
                <div className="message__meta">
                  <span>{message.role === "assistant" ? "AMADEUS" : "YOU"}</span>
                  <time>{String(index + 1).padStart(2, "0")}</time>
                </div>
                <div className="message__body">
                  <p>{message.content}</p>
                  {message.demo && <span className="demo-mark">DEMO</span>}
                </div>
              </article>
            ))}

            {thinking && (
              /* 等待后端时显示三点加载动画，不会伪造一条真实历史消息。 */
              <article className="message message--assistant">
                <div className="message__meta">
                  <span>AMADEUS</span>
                  <time>··</time>
                </div>
                <div className="message__body message__body--loading">
                  <span /><span /><span />
                  <em>正在分析请求</em>
                </div>
              </article>
            )}
          </div>

          {messages.length === 1 && (
            <div className="quick-commands">
              <span>QUICK COMMANDS</span>
              <div>
                {suggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() => void sendMessage(suggestion)}
                  >
                    <i>›</i>{suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form className="command-line" onSubmit={submit}>
            <div className="command-prefix">
              <span>A</span>
              <i />
            </div>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={8000}
              rows={2}
              placeholder="向 Amadeus 输入问题..."
              aria-label="向 Amadeus 输入问题"
            />
            <div className="command-actions">
              <small>ENTER SEND<br />SHIFT + ENTER NEW LINE</small>
              <button type="submit" disabled={!input.trim() || thinking}>
                SEND <span>↗</span>
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
