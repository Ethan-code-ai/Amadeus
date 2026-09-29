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
import {
  clampToWorldLineRange,
  getWorldLine,
  resolveWorldLineCommand,
  WORLD_LINES,
  type WorldLineId,
} from "./worldline";

// 页面显示的消息结构。demo 用来标记没有 API Key 时的演示回复。
type Message = {
  role: "user" | "assistant";
  content: string;
  demo?: boolean;
  event?: boolean;
  // 欢迎语只属于界面档案，不能被发送到回答服务当作用户真实历史。
  shell?: boolean;
  // 世界线跃迁后，旧的助手日志会以新的档案标签被重新读取。
  reconstructed?: boolean;
};

type PhoneChoice = "answer" | "later" | "decline";

type PhoneEvent = {
  id: string;
  caller: string;
  origin: string;
  prompt: string;
  signal: number;
};

type NixieDisplayState = {
  current: string;
  ghost: string;
  flash: number;
};

type WorldLineNoiseState = {
  kind: PhoneChoice | "worldline";
  sequence: number;
  label: string;
};

// 新会话的固定欢迎语不会发送给模型，避免它污染真实聊天历史。
const initialWorldLine: WorldLineId = "beta";
const welcome = WORLD_LINES[initialWorldLine].welcome;

// 首屏快捷问题。
const suggestions = [
  "解释一个我最近不理解的概念",
  "帮我整理今天的工作计划",
  "分析一个问题并给出可执行建议",
];

const WORLD_LINE_STORAGE_KEY = "amadeus-world-line-v1.3";

const phoneChoiceNoiseLabel: Record<PhoneChoice, string> = {
  later: "CALL DEFERRED",
  decline: "CONNECTION REJECTED",
  answer: "CHANNEL CONNECTED",
};

// 三个来电处理选项是世界线选择器，而不是在当前读数上做随机增减。
const phoneChoiceWorldLine: Record<PhoneChoice, WorldLineId> = {
  later: "alpha",
  decline: "beta",
  answer: "steins-gate",
};

function isWorldLineId(value: unknown): value is WorldLineId {
  return typeof value === "string" && value in WORLD_LINES;
}

const phoneEvents: PhoneEvent[] = [
  {
    id: "worldline-signal-01",
    caller: "UNKNOWN CALLER",
    origin: "ROUTE UNVERIFIED",
    prompt: "收到一通来源不明的加密来电。信号正在等待你的响应。",
    signal: 96,
  },
  {
    id: "unknown-signal-02",
    caller: "UNKNOWN NODE",
    origin: "ROUTE NOT IDENTIFIED",
    prompt: "检测到无法识别的加密呼叫。对方仍在等待你的响应。",
    signal: 71,
  },
  {
    id: "lab-mem-03",
    caller: "LAB MEM 004",
    origin: "FUTURE GADGET LAB",
    prompt: "收到一条标记为“紧急”的来电请求。要现在处理吗？",
    signal: 88,
  },
];

// 来电结果明确说明当前载入的档案，避免人格与世界线标签发生错配。
function phoneReplyForWorldLine(worldLine: WorldLineId) {
  if (worldLine === "alpha") {
    return "来电已转入后台。需要处理什么？";
  }
  if (worldLine === "steins-gate") {
    return "……信号比预想得清楚。你那边没问题的话，就开始吧。";
  }
  return "……拒接了？算了，至少链路没有中断。你那边应该也听得见吧？";
}

export default function Home() {
  // ===== 对话与界面状态 =====
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: welcome, shell: true },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [worldLineId, setWorldLineId] = useState<WorldLineId>(initialWorldLine);
  // 防止首帧默认 β 在读取 localStorage 之前覆盖用户上次所在的世界线。
  const [worldLineRestored, setWorldLineRestored] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [worldLine, setWorldLine] = useState(WORLD_LINES[initialWorldLine].divergence);
  const [worldLinePulse, setWorldLinePulse] = useState(0);
  const [nixieDisplay, setNixieDisplay] = useState<NixieDisplayState>({
    current: WORLD_LINES[initialWorldLine].divergence.toFixed(6),
    ghost: WORLD_LINES[initialWorldLine].divergence.toFixed(6),
    flash: 0,
  });
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneEventIndex, setPhoneEventIndex] = useState(0);
  const [phoneDecision, setPhoneDecision] = useState<PhoneChoice | null>(null);
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [loginOpen, setLoginOpen] = useState(true);
  const [operatorId, setOperatorId] = useState("");
  const [worldLineNoise, setWorldLineNoise] = useState<WorldLineNoiseState | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const worldLineNoiseTimerRef = useRef<number | null>(null);

  const activePhoneEvent = phoneEvents[phoneEventIndex % phoneEvents.length];
  const activeWorldLine = getWorldLine(worldLineId);

  // 世界线只保存在当前浏览器中，便于个人实验，不会写入服务器或账号。
  // v1.3 使用独立键，绝不覆盖已保存的 v1.2 世界线读数。
  useEffect(() => {
    const stored = window.localStorage.getItem(WORLD_LINE_STORAGE_KEY);
    if (!stored) {
      setWorldLineRestored(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { id?: unknown; divergence?: unknown };
      if (isWorldLineId(parsed.id) && typeof parsed.divergence === "number") {
        setWorldLineId(parsed.id);
        setWorldLine(clampToWorldLineRange(parsed.divergence, parsed.id));
        // 刷新页面时聊天历史本就不保存，因此欢迎语也应与恢复后的世界线同时重建。
        setMessages([{ role: "assistant", content: WORLD_LINES[parsed.id].welcome, shell: true }]);
      }
    } catch {
      // 旧格式或被手动修改的 localStorage 不应影响页面启动，直接使用 β 默认值。
    } finally {
      setWorldLineRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!worldLineRestored) return;
    window.localStorage.setItem(
      WORLD_LINE_STORAGE_KEY,
      JSON.stringify({ id: worldLineId, divergence: Number(worldLine.toFixed(6)) }),
    );
  }, [worldLine, worldLineId, worldLineRestored]);

  // v1.2：世界线被 Phone Trigger 改写后，显示一秒钟的信号重构噪声。
  // 计时器集中保存在 ref 中，连续触发时会重新计时，避免残留的旧计时器提前关闭新动画。
  useEffect(() => () => {
    if (worldLineNoiseTimerRef.current !== null) {
      window.clearTimeout(worldLineNoiseTimerRef.current);
    }
  }, []);

  // 辉光管不会改动真正的世界线，只让显示层在当前分支的目标值附近产生放电跳数。
  // 口令或来电重构时会从 ±0.000095 逐步收敛，常态只保留极小的数字抖动。
  useEffect(() => {
    const target = worldLine.toFixed(6);
    const targetUnits = Math.round(worldLine * 1_000_000);
    let tick = 0;

    const jumpTubes = () => {
      tick += 1;
      const reconstructing = worldLinePulse > 0 && tick <= 18;
      const stableBeat = reconstructing ? tick > 14 && tick % 2 === 0 : tick % 7 === 0;

      setNixieDisplay((previous) => {
        const convergence = Math.max(0, 1 - (tick - 1) / 18);
        const amplitude = reconstructing
          ? Math.max(7, Math.round(95 * convergence))
          : 7;
        const offset = stableBeat
          ? 0
          : Math.round((Math.random() * 2 - 1) * amplitude);
        const next = ((targetUnits + offset) / 1_000_000).toFixed(6);

        return {
          current: next,
          ghost: previous.current,
          flash: previous.flash + 1,
        };
      });
    };

    let timer = 0;
    const scheduleNextJump = () => {
      jumpTubes();
      const reconstructingNow = worldLinePulse > 0 && tick <= 18;
      const idleDelay = tick % 7 === 0 ? 540 + Math.random() * 520 : 112 + Math.random() * 105;
      timer = window.setTimeout(scheduleNextJump, reconstructingNow ? 82 : idleDelay);
    };

    scheduleNextJump();
    return () => window.clearTimeout(timer);
  }, [worldLine, worldLinePulse]);

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

    // 口令仅影响世界线状态，服务端会再次验证，不能只依赖浏览器的判断。
    const commandWorldLine = resolveWorldLineCommand(clean, worldLineId);
    const nextWorldLineId = commandWorldLine || worldLineId;
    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: clean },
    ];

    setMessages(nextMessages);
    if (commandWorldLine) {
      reconstructWorldLine(commandWorldLine);
    }
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
            .filter((item) => !item.shell)
            .map(({ role, content }) => ({ role, content })),
          // 口令由服务端以“跃迁前的世界线”再计算一次；普通消息前后状态相同。
          worldLine: worldLineId,
        }),
      });
      const data = (await response.json()) as {
        reply?: string;
        demo?: boolean;
        error?: string;
        worldLine?: WorldLineId;
        transition?: boolean;
      };
      if (!response.ok || typeof data.reply !== "string") {
        throw new Error(data.error || "未收到有效响应");
      }

      // 服务端是最终裁定者；如果其判断出的世界线与前端不同，以服务端为准重新显示。
      if (isWorldLineId(data.worldLine) && data.worldLine !== nextWorldLineId) {
        reconstructWorldLine(data.worldLine);
      }

      // 使用函数式更新，保证追加到当时最新的消息数组。
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.reply!,
          demo: data.demo,
          reconstructed: Boolean(data.transition),
        },
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
    if (worldLineNoiseTimerRef.current !== null) {
      window.clearTimeout(worldLineNoiseTimerRef.current);
      worldLineNoiseTimerRef.current = null;
    }
    setSpeaking(false);
    setWorldLineId(initialWorldLine);
    setWorldLine(WORLD_LINES[initialWorldLine].divergence);
    setMessages([{ role: "assistant", content: welcome, shell: true }]);
    setPhoneOpen(false);
    setPhoneDecision(null);
    setPhoneRequired(false);
    setLoginOpen(true);
    setOperatorId("");
    setWorldLineNoise(null);
  }

  function openPhoneTrigger() {
    if (phoneOpen) return;
    setPhoneDecision(null);
    setPhoneRequired(false);
    setPhoneOpen(true);
  }

  // 这是本地实验版的会话入口，不创建真实账号，也不收集密码。
  // 登录完成后立即弹出来电，让用户用三个处理选项确定本次人格分支。
  function completeLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!operatorId.trim()) return;
    setWorldLineId(initialWorldLine);
    setWorldLine(WORLD_LINES[initialWorldLine].divergence);
    setMessages([{ role: "assistant", content: welcome, shell: true }]);
    setLoginOpen(false);
    setPhoneEventIndex(0);
    setPhoneDecision(null);
    setPhoneRequired(true);
    setPhoneOpen(true);
  }

  // 口令跃迁与 Phone Trigger 共用同一层视觉失真，只是显示的重构理由不同。
  function triggerWorldLineNoise(kind: PhoneChoice | "worldline", label: string) {
    if (worldLineNoiseTimerRef.current !== null) {
      window.clearTimeout(worldLineNoiseTimerRef.current);
    }

    setWorldLineNoise({ kind, label, sequence: Date.now() });
    worldLineNoiseTimerRef.current = window.setTimeout(() => {
      setWorldLineNoise(null);
      worldLineNoiseTimerRef.current = null;
    }, 1000);
  }

  // 重构不会伪造模型对话，只改动属于本地档案的欢迎语、标签和视觉读数。
  // 因此用户能看到“同一份聊天记录被另一条世界线重新解释”的细微差别。
  function reconstructWorldLine(next: WorldLineId) {
    const profile = getWorldLine(next);
    setWorldLineId(next);
    setWorldLine(profile.divergence);
    setWorldLinePulse((value) => value + 1);
    triggerWorldLineNoise("worldline", profile.label);
    setMessages((current) => current.map((message, index) => (
      message.role === "assistant"
        ? {
            ...message,
            content: index === 0 ? profile.welcome : message.content,
            shell: index === 0 ? true : message.shell,
            reconstructed: true,
          }
        : message
    )));
  }

  function resolvePhoneTrigger(choice: PhoneChoice) {
    if (phoneDecision) return;
    const nextWorldLineId = phoneChoiceWorldLine[choice];
    const profile = getWorldLine(nextWorldLineId);
    setPhoneDecision(choice);
    setWorldLineId(nextWorldLineId);
    setWorldLine(profile.divergence);
    setWorldLinePulse((value) => value + 1);
    triggerWorldLineNoise(choice, phoneChoiceNoiseLabel[choice]);
    setMessages((current) => {
      const reconstructed = current.map((message, index) => (
        message.role === "assistant"
          ? {
              ...message,
              content: index === 0 ? profile.welcome : message.content,
              shell: index === 0 ? true : message.shell,
              reconstructed: true,
            }
          : message
      ));

      return [
        ...reconstructed,
        {
          role: "assistant",
          content: phoneReplyForWorldLine(nextWorldLineId),
          event: true,
        },
      ];
    });
    window.setTimeout(() => {
      setPhoneOpen(false);
      setPhoneDecision(null);
      setPhoneRequired(false);
      setPhoneEventIndex((value) => (value + 1) % phoneEvents.length);
    }, 1100);
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
    <main
      className={`terminal${worldLineNoise ? ` terminal--worldline-noise terminal--worldline-noise-${worldLineNoise.kind}` : ""}`}
      data-world-line={worldLineId}
    >
      {worldLineNoise && (
        <div
          className={`worldline-noise worldline-noise--${worldLineNoise.kind}`}
          data-testid="worldline-visual-noise"
          data-noise-choice={worldLineNoise.kind}
          key={worldLineNoise.sequence}
          aria-hidden="true"
        >
          <div className="worldline-noise__grain" />
          <div className="worldline-noise__tear worldline-noise__tear--a" />
          <div className="worldline-noise__tear worldline-noise__tear--b" />
          <div className="worldline-noise__chromatic" />
          <div className="worldline-noise__readout">
            <small>{worldLineNoise.kind === "worldline" ? "WORLD LINE RECONSTRUCTION" : "SIGNAL RECONFIGURATION"}</small>
            <b>{worldLineNoise.label}</b>
            <span>{nixieDisplay.current}%</span>
          </div>
        </div>
      )}
      <header className="system-bar">
        <div className="wordmark">
          <span className="amadeus-logo" aria-hidden="true">
          </span>
          <div className="wordmark__meta">
            <b>AMADEUS SYSTEM</b>
            <small>MEMORY DATA / NEURAL NETWORK</small>
          </div>
        </div>

        <div className="world-line-meter" aria-label={`${activeWorldLine.label}，偏移率 ${worldLine.toFixed(6)}`}>
          <div className="world-line-meter__label">
            <span>{activeWorldLine.label}</span>
            <small>DIVERGENCE</small>
          </div>
          <div className="nixie-rack" aria-hidden="true">
            {nixieDisplay.current.split("").map((character, index) =>
              character === "." ? (
                <span className="nixie-dot" key={`dot-${index}`}>.</span>
              ) : (
                <span
                  className="nixie-tube"
                  key={`tube-${index}`}
                  data-ghost={nixieDisplay.ghost[index] ?? character}
                  data-flash={nixieDisplay.flash % 4}
                >
                  <i>{nixieDisplay.ghost[index] ?? character}</i>
                  <b>{character}</b>
                </span>
              ),
            )}
          </div>
          <em>%</em>
          <div className="world-line-meter__ticks" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </div>

        <div className="system-actions">
          <span className="link-state"><i /> NEURAL LINK ONLINE</span>
          <button
            type="button"
            className={`phone-trigger-button${phoneOpen ? " phone-trigger-button--active" : ""}`}
            onClick={openPhoneTrigger}
            aria-haspopup="dialog"
            aria-expanded={phoneOpen}
          >
            <span className="phone-trigger-button__icon">⌁</span>
            PHONE
          </button>
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
              <strong>{worldLineId === "alpha" ? "ORIGINAL MODEL / α" : worldLineId === "beta" ? "MAKISE KURISU / AMADEUS" : "MAKISE KURISU / LIVING"}</strong>
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
            <div className="worldline-memory" aria-live="polite">
              <small>MEMORY ARCHIVE</small>
              <span>{activeWorldLine.memoryLabel}</span>
            </div>
          </div>

          <div className="profile-stats">
            <div><span>ENTITY</span><b>{worldLineId === "alpha" ? "CHANNEL" : worldLineId === "beta" ? "AMADEUS" : "KURISU"}</b></div>
            <div><span>MODE</span><b>{activeWorldLine.modeLabel}</b></div>
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
              <span>SECURE CHANNEL · {operatorId.trim() || "LOCAL SESSION"}</span>
            </div>

            {messages.map((message, index) => (
              <article
                className={`message message--${message.role}${message.reconstructed ? " message--reconstructed" : ""}`}
                key={`${message.role}-${index}`}
              >
                <div className="message__meta">
                  <span>{message.role === "assistant" ? activeWorldLine.assistantLabel : "YOU"}</span>
                  <time>{String(index + 1).padStart(2, "0")}</time>
                </div>
                <div className="message__body">
                  <p>{message.content}</p>
                  {message.demo && <span className="demo-mark">DEMO</span>}
                  {message.event && <span className="event-mark">PHONE EVENT</span>}
                  {message.role === "assistant" && message.reconstructed && (
                    <span className="memory-variant">{activeWorldLine.historyVariant}</span>
                  )}
                </div>
              </article>
            ))}

            {thinking && (
              /* 等待后端时显示三点加载动画，不会伪造一条真实历史消息。 */
              <article className="message message--assistant">
                <div className="message__meta">
                  <span>{activeWorldLine.assistantLabel}</span>
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
              placeholder={worldLineId === "alpha" ? "向原始模型输入问题..." : worldLineId === "beta" ? "向 Amadeus 输入问题..." : "向牧濑红莉栖输入问题..."}
              aria-label="输入问题"
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

      {loginOpen && (
        <div className="login-overlay" role="presentation">
          <form
            className="login-terminal"
            onSubmit={completeLogin}
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-terminal-title"
          >
            <div className="login-terminal__mark" aria-hidden="true">
              <span className="amadeus-logo" />
            </div>
            <div className="login-terminal__heading">
              <small>AMADEUS · NEURAL NETWORK SYSTEM</small>
              <h2 id="login-terminal-title">LOG IN</h2>
              <p>在开始通话前，先告诉我该怎么称呼你。……只是通信协议的一部分，别想太多。</p>
            </div>
            <label htmlFor="operator-id">OPERATOR ID</label>
            <div className="login-terminal__input">
              <span>&gt;</span>
              <input
                id="operator-id"
                value={operatorId}
                onChange={(event) => setOperatorId(event.target.value)}
                maxLength={24}
                autoFocus
                autoComplete="off"
                placeholder="输入显示名称"
              />
            </div>
            <div className="login-terminal__footer">
              <span><i /> NEURAL LINK STANDBY</span>
              <button type="submit" disabled={!operatorId.trim()}>
                LOG IN <b>↗</b>
              </button>
            </div>
          </form>
        </div>
      )}

      {phoneOpen && (
        <div className="phone-overlay" role="presentation">
          <section
            className={`phone-terminal${phoneDecision ? " phone-terminal--resolved" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="phone-trigger-title"
          >
            <div className="phone-terminal__scan" />
            <header>
              <span>PHONE TRIGGER</span>
              <b>INCOMING CONNECTION</b>
              {!phoneRequired && (
                <button type="button" onClick={() => setPhoneOpen(false)} aria-label="关闭来电窗口">×</button>
              )}
            </header>
            <div className="phone-terminal__signal" aria-hidden="true">
              <i /><i /><i /><i />
              <span>{activePhoneEvent.signal}%</span>
            </div>
            <div className="phone-terminal__identity">
              <small>CALLER ID</small>
              <h2 id="phone-trigger-title">{activePhoneEvent.caller}</h2>
              <span>{activePhoneEvent.origin}</span>
            </div>
            <p>{activePhoneEvent.prompt}</p>
            <div className="phone-terminal__actions">
              <button type="button" onClick={() => resolvePhoneTrigger("later")}>
                <span>01</span><b>稍后</b><small>REMIND ME LATER</small>
              </button>
              <button type="button" onClick={() => resolvePhoneTrigger("decline")}>
                <span>02</span><b>拒接</b><small>DECLINE</small>
              </button>
              <button type="button" onClick={() => resolvePhoneTrigger("answer")}>
                <span>03</span><b>接听</b><small>ANSWER</small>
              </button>
            </div>
            {phoneDecision && (
              <div className="phone-terminal__result">
                CALL ROUTING COMPLETE · SIGNAL STABILIZED
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
