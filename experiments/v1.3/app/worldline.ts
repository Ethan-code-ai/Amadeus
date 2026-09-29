// 世界线定义由前端和服务端共同使用，避免显示的编号与服务端的人设记忆脱节。
// 数值采用《命运石之门》常被用作代表的偏移率；Phone Trigger 会直接选择对应档案。
export type WorldLineId = "alpha" | "beta" | "steins-gate";

export type WorldLineDefinition = {
  id: WorldLineId;
  symbol: "α" | "β" | "SG";
  label: string;
  divergence: number;
  assistantLabel: string;
  modeLabel: string;
  welcome: string;
  memoryLabel: string;
  historyVariant: string;
};

export const WORLD_LINES: Record<WorldLineId, WorldLineDefinition> = {
  alpha: {
    id: "alpha",
    symbol: "α",
    label: "WORLD LINE: α",
    divergence: 0.571024,
    assistantLabel: "RAW α",
    modeLabel: "ORIGINAL MODEL",
    welcome: "连接已经建立。请直接输入你的问题。",
    memoryLabel: "ALPHA CHANNEL · 原始模型输出；不加载 Amadeus 或牧濑红莉栖人格档案。",
    historyVariant: "RAW α",
  },
  beta: {
    id: "beta",
    symbol: "β",
    label: "WORLD LINE: β",
    divergence: 1.130205,
    assistantLabel: "AMADEUS",
    modeLabel: "AMADEUS",
    welcome: "听得到吗？……连接状态看起来还算稳定。有什么事？",
    memoryLabel: "BETA ARCHIVE · Amadeus 红莉栖；记忆截止于赴日前，不拥有与冈部共同度过的实验室经历。",
    historyVariant: "ARCHIVE β",
  },
  "steins-gate": {
    id: "steins-gate",
    symbol: "SG",
    label: "WORLD LINE: STEINS GATE",
    divergence: 1.048596,
    assistantLabel: "KURISU",
    modeLabel: "LIVING PERSONA",
    welcome: "喂？听得到吗？……接通以后就别一直沉默，有事快说。",
    memoryLabel: "STEINS GATE ARCHIVE · 生前牧濑红莉栖；不继承 α／β 的完整记忆，仅保留无法证实的既视感。",
    historyVariant: "KURISU SG",
  },
};

// 口令不直接展示在界面上。EL PSY KONGROO 保留 v1.2 的“人设／原始回答”切换习惯，
// 同时也可从 α 与 Steins Gate 回到 β。Steins Gate 口令故意不写入普通帮助文案。
const normalizeCommand = (content: string) =>
  content.trim().replace(/\s+/g, " ").toUpperCase();

export function getWorldLine(id: WorldLineId) {
  return WORLD_LINES[id];
}

export function resolveWorldLineCommand(
  content: string,
  current: WorldLineId,
): WorldLineId | null {
  const command = normalizeCommand(content);

  if (command === "WORLD LINE ALPHA" || command === "ALPHA WORLD LINE") {
    return "alpha";
  }

  if (command === "WORLD LINE BETA" || command === "BETA WORLD LINE") {
    return "beta";
  }

  if (command === "WORLD LINE STEINS GATE") {
    return "steins-gate";
  }

  if (
    command === "THE CHOICE OF STEINS GATE" ||
    command === "GATE OF STEINER"
  ) {
    return current === "steins-gate" ? "beta" : "steins-gate";
  }

  if (command === "EL PSY KONGROO") {
    return current === "beta" ? "alpha" : "beta";
  }

  return null;
}

export function isWorldLineCommand(content: string) {
  return resolveWorldLineCommand(content, "beta") !== null ||
    normalizeCommand(content) === "EL PSY KONGROO";
}

// 每条世界线只允许在代表数字附近小幅偏移，避免显示值跨入别的吸引场。
export function clampToWorldLineRange(value: number, worldLine: WorldLineId) {
  const anchor = WORLD_LINES[worldLine].divergence;
  return Math.min(anchor + 0.00095, Math.max(anchor - 0.00095, value));
}
