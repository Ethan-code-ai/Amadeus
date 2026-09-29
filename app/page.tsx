"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { LiveCharacter } from "./LiveCharacter";

type Message = {
  role: "user" | "assistant";
  content: string;
  demo?: boolean;
};

const welcome = "通信链路已建立。我是 Amadeus，有什么需要我协助的？";

const suggestions = [
  "解释一个我最近不理解的概念",
  "帮我整理今天的工作计划",
  "分析一个问题并给出可执行建议",
];

const MODE_TOGGLE_COMMAND = "EL PSY KONGROO";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcome },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [rawMode, setRawMode] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

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

  async function sendMessage(text = input) {
    const clean = text.trim();
    if (!clean || thinking) return;

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: clean },
    ];
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.reply!, demo: data.demo },
      ]);
      speak(data.reply);
    } catch (error) {
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

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function resetChat() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setRawMode(false);
    setMessages([{ role: "assistant", content: welcome }]);
  }

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
              MOVE TO TRACK
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
