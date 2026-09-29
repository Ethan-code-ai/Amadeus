"use client";

import { KeyboardEvent, useEffect, useRef } from "react";

export type CharacterMode = "ready" | "processing" | "speaking";

type LiveCharacterProps = {
  mode: CharacterMode;
};

const SHEET_SIZE = 1254;
const COLS = 4;
const ROWS = 4;

// The main sheet keeps the blink and mouth animation frames.
const MAIN = {
  neutral: 0,
  blink25: 1,
  blink50: 2,
  blink75: 3,
  blinkClosed: 4,
  blinkOpen75: 5,
  blinkOpen50: 6,
  blinkOpen25: 7,
  talkClosed: 12,
  talkSmall: 13,
  talkMedium: 14,
  talkWide: 15,
} as const;

type FrameNumber = number;
type SheetKind = "main" | "tilt";
type AnimationFrame = { sheet: SheetKind; frame: FrameNumber };
type Calibration = { x: number; y: number; brightness: number };

const BLINK_SEQUENCE: Array<{ frame: FrameNumber; duration: number }> = [
  { frame: MAIN.blink25, duration: 62 },
  { frame: MAIN.blink50, duration: 52 },
  { frame: MAIN.blink75, duration: 48 },
  { frame: MAIN.blinkClosed, duration: 70 },
  { frame: MAIN.blinkOpen75, duration: 48 },
  { frame: MAIN.blinkOpen50, duration: 52 },
  { frame: MAIN.blinkOpen25, duration: 62 },
  { frame: MAIN.neutral, duration: 76 },
];

// The original 16-frame sheet remains in public for future animation work.
// The current click interaction intentionally uses one stable full-character tilt frame.
const TILT_ORDER = [10] as const;
const TILT_FRAME_DURATION = 1000;
const TILT_DURATION = TILT_FRAME_DURATION * TILT_ORDER.length;
const WHOLE_FRAME_BLEND_DURATION = 46;
const BLINK_DURATION = BLINK_SEQUENCE.reduce((sum, item) => sum + item.duration, 0);

// Per-frame alignment and exposure compensation keeps the torso anchor stable.
const MAIN_CALIBRATION: Record<number, Calibration> = {
  0: { x: 0, y: 0, brightness: 1.01132 },
  1: { x: 0, y: 0, brightness: 1.00999 },
  2: { x: 0, y: 0, brightness: 1.00435 },
  3: { x: 0, y: 0, brightness: 1.00698 },
  4: { x: 0, y: 0, brightness: 1.01093 },
  5: { x: -1, y: 0, brightness: 1.00964 },
  6: { x: 0, y: 0, brightness: 1.00791 },
  7: { x: 0, y: 0, brightness: 1.00641 },
  12: { x: 0, y: 0, brightness: 1.00164 },
  13: { x: -1, y: 0, brightness: 0.99876 },
  14: { x: 0, y: 0, brightness: 0.99728 },
  15: { x: 0, y: 0, brightness: 0.99557 },
};

const TILT_CALIBRATION: Record<number, Calibration> = {
  0: { x: 0, y: 0, brightness: 1 },
  1: { x: -1, y: 0, brightness: 1.00059 },
  2: { x: -2, y: 0, brightness: 1.00241 },
  3: { x: -3, y: 0, brightness: 1.00782 },
  4: { x: 1, y: -2, brightness: 1.00185 },
  5: { x: 0, y: -1, brightness: 1.00106 },
  6: { x: -2, y: -1, brightness: 1.00357 },
  7: { x: -3, y: -1, brightness: 1.00823 },
  8: { x: -1, y: -2, brightness: 0.99724 },
  9: { x: -2, y: -1, brightness: 1.00147 },
  10: { x: -4, y: -2, brightness: 1.00371 },
  11: { x: -4, y: -2, brightness: 1.00611 },
  12: { x: 0, y: 0, brightness: 0.99373 },
  13: { x: -2, y: 0, brightness: 0.99268 },
  14: { x: -3, y: 0, brightness: 0.99352 },
  15: { x: -3, y: 0, brightness: 0.99423 },
};

const frameRect = (frame: FrameNumber) => {
  const column = frame % COLS;
  const row = Math.floor(frame / COLS);
  const x0 = Math.round((column * SHEET_SIZE) / COLS);
  const x1 = Math.round(((column + 1) * SHEET_SIZE) / COLS);
  const y0 = Math.round((row * SHEET_SIZE) / ROWS);
  const y1 = Math.round(((row + 1) * SHEET_SIZE) / ROWS);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

const sequenceFrame = (
  age: number,
  sequence: Array<{ frame: FrameNumber; duration: number }>,
) => {
  let cursor = age;
  for (const item of sequence) {
    if (cursor < item.duration) return item.frame;
    cursor -= item.duration;
  }
  return sequence[sequence.length - 1].frame;
};

export function LiveCharacter({ mode }: LiveCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const tiltStartedAtRef = useRef(-10_000);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const triggerTilt = () => {
    tiltStartedAtRef.current = performance.now();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      triggerTilt();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const mainSprite = new Image();
    const tiltSprite = new Image();
    mainSprite.src = "/amadeus-v4-motion-16-transparent-v4.png";
    tiltSprite.src = "/amadeus-v4-tilt-current-transparent-v1.png";

    let loadedCount = 0;
    let raf = 0;
    let width = 1;
    let height = 1;
    let elapsed = 0;
    let lastTime = performance.now();
    let nextBlinkAt = lastTime + 2200;
    let blinkStartedAt = -1;
    let tiltWasActive = false;
    let displayed: AnimationFrame = { sheet: "main", frame: MAIN.neutral };
    let previous: AnimationFrame = displayed;
    let transitionStartedAt = lastTime - WHOLE_FRAME_BLEND_DURATION;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const talkingFrame = (): FrameNumber => {
      const wave = 0.5 + Math.sin(elapsed * 7.4) * 0.25 + Math.sin(elapsed * 3.2) * 0.15;
      if (wave > 0.69) return MAIN.talkWide;
      if (wave > 0.42) return MAIN.talkMedium;
      return MAIN.talkSmall;
    };

    const chooseFrame = (now: number): AnimationFrame => {
      // Speaking takes priority, so a click cannot interrupt the mouth animation.
      if (modeRef.current === "speaking") {
        return { sheet: "main", frame: talkingFrame() };
      }

      const tiltAge = now - tiltStartedAtRef.current;
      if (tiltAge >= 0 && tiltAge < TILT_DURATION) {
        const step = Math.min(Math.floor(tiltAge / TILT_FRAME_DURATION), TILT_ORDER.length - 1);
        return {
          sheet: "tilt",
          frame: TILT_ORDER[step],
        };
      }

      if (blinkStartedAt >= 0) {
        const blinkAge = now - blinkStartedAt;
        if (blinkAge < BLINK_DURATION) {
          return { sheet: "main", frame: sequenceFrame(blinkAge, BLINK_SEQUENCE) };
        }
        blinkStartedAt = -1;
        nextBlinkAt = now + 2800 + Math.random() * 2500;
      }

      return {
        sheet: "main",
        frame: modeRef.current === "processing" ? MAIN.blink25 : MAIN.neutral,
      };
    };

    const drawFrame = (animationFrame: AnimationFrame, drawSize: number, alpha = 1) => {
      const calibration = animationFrame.sheet === "tilt"
        ? TILT_CALIBRATION[animationFrame.frame]
        : MAIN_CALIBRATION[animationFrame.frame];
      const image = animationFrame.sheet === "tilt" ? tiltSprite : mainSprite;

      context.save();
      context.globalAlpha = alpha;
      context.filter = `brightness(${calibration.brightness})`;
      if (animationFrame.sheet === "tilt") {
        // The active tilt is a standalone alpha PNG, so use the whole image.
        // Destination offsets preserve the calibration from the original sheet.
        const offsetX = (-calibration.x / image.naturalWidth) * drawSize;
        const offsetY = (-calibration.y / image.naturalHeight) * drawSize;
        context.drawImage(
          image,
          0,
          0,
          image.naturalWidth,
          image.naturalHeight,
          -drawSize / 2 + offsetX,
          -drawSize / 2 + offsetY,
          drawSize,
          drawSize,
        );
      } else {
        const rect = frameRect(animationFrame.frame);
        // The transparent sheet preserves the original cell geometry. A two-pixel
        // inset removes only the exported separator line and matches the tilt crop.
        const margin = 2;
        context.drawImage(
          image,
          rect.x + margin + calibration.x,
          rect.y + margin + calibration.y,
          rect.width - margin * 2,
          rect.height - margin * 2,
          -drawSize / 2,
          -drawSize / 2,
          drawSize,
          drawSize,
        );
      }
      context.restore();
    };

    const render = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += delta;

      const tiltAge = now - tiltStartedAtRef.current;
      const tiltActive = tiltAge >= 0 && tiltAge < TILT_DURATION;
      if (tiltWasActive && !tiltActive) {
        // Do not let a delayed automatic blink fire on the final return frame.
        blinkStartedAt = -1;
        nextBlinkAt = now + 1800;
      }
      tiltWasActive = tiltActive;
      if (modeRef.current === "ready" && !tiltActive && blinkStartedAt < 0 && now >= nextBlinkAt) {
        blinkStartedAt = now;
      }

      const wanted = chooseFrame(now);
      if (wanted.sheet !== displayed.sheet || wanted.frame !== displayed.frame) {
        previous = displayed;
        displayed = wanted;
        transitionStartedAt = now;
      }

      context.clearRect(0, 0, width, height);

      // A square draw box prevents stretching at every responsive viewport size.
      const drawSize = Math.min(width * 0.94, height * 0.97, 780);
      const centerX = width / 2;
      const centerY = height - drawSize / 2 + drawSize * 0.004;

      context.save();
      context.translate(centerX, centerY);
      // Both layers are complete character frames. No face or body part is overlaid.
      const switchedSheet = previous.sheet !== displayed.sheet;
      const blend = switchedSheet
        ? 1
        : Math.min(Math.max((now - transitionStartedAt) / WHOLE_FRAME_BLEND_DURATION, 0), 1);
      // Keep the previous opaque frame underneath. Fading both opaque black-backed
      // frames would darken the character during every transition.
      if (blend < 1) drawFrame(previous, drawSize, 1);
      drawFrame(displayed, drawSize, blend);
      context.restore();

      raf = requestAnimationFrame(render);
    };

    const startWhenReady = () => {
      loadedCount += 1;
      if (loadedCount === 2) {
        lastTime = performance.now();
        raf = requestAnimationFrame(render);
      }
    };

    mainSprite.onload = startWhenReady;
    tiltSprite.onload = startWhenReady;

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="live-character"
      role="button"
      tabIndex={0}
      aria-label="Amadeus v4 动态人物。点击显示单帧完整人物歪头动作，回答时切换口型。"
      onKeyDown={handleKeyDown}
      onClick={triggerTilt}
    />
  );
}
