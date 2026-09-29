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
  event?: boolean;
};

type PhoneChoice = "answer" | "later" | "decline";

type PhoneEvent = {
  id: string;
  caller: string;
  origin: string;
  prompt: string;
  signal: number;
  delta: Record<PhoneChoice, number>;
  reply: Record<PhoneChoice, string>;
};

type NixieDisplayState = {
  current: string;
  ghost: string;
  flash: number;
};

type WorldLineNoiseState = {
  choice: PhoneChoice;
  sequence: number;
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
const DEFAULT_WORLD_LINE = 1.048596;
const ORIGINAL_WORLD_LINE_MIN = 1.048000;
const ORIGINAL_WORLD_LINE_MAX = 1.048999;
const WORLD_LINE_STORAGE_KEY = "amadeus-world-line-v1.2";

const phoneChoiceNoiseLabel: Record<PhoneChoice, string> = {
  answer: "LINK ACCEPTED",
  later: "SIGNAL SUSPENDED",
  decline: "LINK SEVERED",
};

function clampToOriginalWorldLineRange(value: number) {
  return Math.min(ORIGINAL_WORLD_LINE_MAX, Math.max(ORIGINAL_WORLD_LINE_MIN, value));
}

const phoneEvents: PhoneEvent[] = [
  {
    id: "amadeus-check-01",
    caller: "AMADEUS / KURISU",
    origin: "VIKTOR CHONDRIA UNIVERSITY",
    prompt: "通信测试。现在方便接听吗？……先说好，只是确认神经链路状态。",
    signal: 96,
    delta: { answer: 0.000014, later: -0.000006, decline: -0.000021 },
    reply: {
      answer: "接通了。链路状态正常。你反应还挺快的嘛……别误会，我只是在记录测试结果。",
      later: "知道了，等你方便时再联系。至少没有直接挂断，还算有基本礼貌。",
      decline: "拒接？好吧，我会把它记录为一次通信失败。下次别让我等太久。",
    },
  },
  {
    id: "unknown-signal-02",
    caller: "UNKNOWN NODE",
    origin: "ROUTE NOT IDENTIFIED",
    prompt: "检测到无法识别的加密呼叫。是否允许 Amadeus 建立隔离通道？",
    signal: 71,
    delta: { answer: 0.000031, later: 0.000004, decline: -0.000012 },
    reply: {
      answer: "隔离通道已经建立。奇怪，对方在握手完成前切断了连接……这不像普通的网络故障。",
      later: "我先把数据包封存。等你准备好，我们再检查来源。别随便打开可疑链路。",
      decline: "连接已拒绝。我同意这个判断——未知节点不值得冒险。",
    },
  },
  {
    id: "lab-mem-03",
    caller: "LAB MEM 004",
    origin: "FUTURE GADGET LAB",
    prompt: "收到一条标记为“紧急”的来电请求。要现在转接吗？",
    signal: 88,
    delta: { answer: -0.000018, later: 0.000009, decline: 0.000027 },
    reply: {
      answer: "转接完成。对方只说了一句“机关已经行动了”就挂断……真是的，那家伙还是老样子。",
      later: "我把请求放进待处理队列。希望所谓的“紧急”不是又一个中二病发作。",
      decline: "已拒绝转接。世界暂时安静了几秒——从统计上说，这很难得。",
    },
  },
];

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
  const [worldLine, setWorldLine] = useState(DEFAULT_WORLD_LINE);
  const [worldLinePulse, setWorldLinePulse] = useState(0);
  const [nixieDisplay, setNixieDisplay] = useState<NixieDisplayState>({
    current: DEFAULT_WORLD_LINE.toFixed(6),
    ghost: DEFAULT_WORLD_LINE.toFixed(6),
    flash: 0,
  });
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneEventIndex, setPhoneEventIndex] = useState(0);
  const [phoneDecision, setPhoneDecision] = useState<PhoneChoice | null>(null);
  const [worldLineNoise, setWorldLineNoise] = useState<WorldLineNoiseState | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const worldLineNoiseTimerRef = useRef<number | null>(null);

  const activePhoneEvent = phoneEvents[phoneEventIndex % phoneEvents.length];

  // 世界线只保存在当前浏览器中，便于个人实验，不会写入服务器或账号。
  useEffect(() => {
    const stored = window.localStorage.getItem(WORLD_LINE_STORAGE_KEY);
    const parsed = stored ? Number(stored) : Number.NaN;
    if (Number.isFinite(parsed)) setWorldLine(clampToOriginalWorldLineRange(parsed));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(WORLD_LINE_STORAGE_KEY, worldLine.toFixed(6));
  }, [worldLine]);

  // v1.2：世界线被 Phone Trigger 改写后，显示一秒钟的信号重构噪声。
  // 计时器集中保存在 ref 中，连续触发时会重新计时，避免残留的旧计时器提前关闭新动画。
  useEffect(() => () => {
    if (worldLineNoiseTimerRef.current !== null) {
      window.clearTimeout(worldLineNoiseTimerRef.current);
    }
  }, []);

  // 辉光管不会改动真正的世界线，只让显示层在目标值附近产生放电跳数。
  // 原著的仪表是在同一条世界线附近逐位抖动，而不是把每一位改成任意数字：
  // 常态误差限制在 ±0.000007，事件重构也只从 ±0.000095 逐步收敛。
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
    if (worldLineNoiseTimerRef.current !== null) {
      window.clearTimeout(worldLineNoiseTimerRef.current);
      worldLineNoiseTimerRef.current = null;
    }
    setSpeaking(false);
    setRawMode(false);
    setMessages([{ role: "assistant", content: welcome }]);
    setPhoneOpen(false);
    setPhoneDecision(null);
    setWorldLineNoise(null);
  }

  function openPhoneTrigger() {
    if (phoneOpen) return;
    setPhoneDecision(null);
    setPhoneOpen(true);
  }

  function triggerWorldLineNoise(choice: PhoneChoice) {
    if (worldLineNoiseTimerRef.current !== null) {
      window.clearTimeout(worldLineNoiseTimerRef.current);
    }

    setWorldLineNoise({ choice, sequence: Date.now() });
    worldLineNoiseTimerRef.current = window.setTimeout(() => {
      setWorldLineNoise(null);
      worldLineNoiseTimerRef.current = null;
    }, 1000);
  }

  function resolvePhoneTrigger(choice: PhoneChoice) {
    if (phoneDecision) return;
    const event = activePhoneEvent;
    const nextWorldLine = clampToOriginalWorldLineRange(worldLine + event.delta[choice]);
    setPhoneDecision(choice);
    setWorldLine(Number(nextWorldLine.toFixed(6)));
    setWorldLinePulse((value) => value + 1);
    triggerWorldLineNoise(choice);
    setMessages((current) => [
      ...current,
      { role: "assistant", content: event.reply[choice], event: true },
    ]);
    window.setTimeout(() => {
      setPhoneOpen(false);
      setPhoneDecision(null);
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
      className={`terminal${worldLineNoise ? ` terminal--worldline-noise terminal--worldline-noise-${worldLineNoise.choice}` : ""}`}
    >
      {worldLineNoise && (
        <div
          className={`worldline-noise worldline-noise--${worldLineNoise.choice}`}
          data-testid="worldline-visual-noise"
          data-noise-choice={worldLineNoise.choice}
          key={worldLineNoise.sequence}
          aria-hidden="true"
        >
          <div className="worldline-noise__grain" />
          <div className="worldline-noise__tear worldline-noise__tear--a" />
          <div className="worldline-noise__tear worldline-noise__tear--b" />
          <div className="worldline-noise__chromatic" />
          <div className="worldline-noise__readout">
            <small>WORLD LINE RECONSTRUCTION</small>
            <b>{phoneChoiceNoiseLabel[worldLineNoise.choice]}</b>
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

        <div className="world-line-meter" aria-label={`当前世界线 ${worldLine.toFixed(6)}`}>
          <div className="world-line-meter__label">
            <span>WORLD LINE</span>
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
                  {message.event && <span className="event-mark">PHONE EVENT</span>}
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
              <button type="button" onClick={() => setPhoneOpen(false)} aria-label="关闭来电窗口">×</button>
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
              <button type="button" onClick={() => resolvePhoneTrigger("answer")}>
                <span>01</span><b>接听</b><small>ANSWER</small>
              </button>
              <button type="button" onClick={() => resolvePhoneTrigger("later")}>
                <span>02</span><b>稍后</b><small>HOLD</small>
              </button>
              <button type="button" onClick={() => resolvePhoneTrigger("decline")}>
                <span>03</span><b>拒接</b><small>DECLINE</small>
              </button>
            </div>
            {phoneDecision && (
              <div className="phone-terminal__result">
                WORLD LINE RECONSTRUCTED · {worldLine.toFixed(6)}%
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
