"use client";

import { useEffect, useRef } from "react";

export type CharacterMode =
  | "ready"
  | "processing"
  | "speaking";

type LiveCharacterProps = {
  mode: CharacterMode;
};

const CELL = 512;
const FRAME = {
  neutral: { x: 0, y: 0 },
  blink: { x: 1, y: 0 },
  mouthSmall: { x: 2, y: 0 },
  mouthWide: { x: 0, y: 1 },
  thinking: { x: 1, y: 1 },
} as const;

const lerp = (current: number, target: number, amount: number) =>
  current + (target - current) * amount;

const easeInOut = (value: number) =>
  value < 0.5
    ? 2 * value * value
    : 1 - Math.pow(-2 * value + 2, 2) / 2;

export function LiveCharacter({ mode }: LiveCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const image = new Image();
    image.src = "/kurisu-sprite-v1.png";

    let animationFrame = 0;
    let width = 1;
    let height = 1;
    let lastTime = performance.now();
    let elapsed = 0;
    let nextBlink = 2.2;
    let blinkStart = -1;
    let poseBlend = 0;
    let mouth = 0;

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

    const source = (frame: keyof typeof FRAME) => ({
      x: FRAME[frame].x * CELL,
      y: FRAME[frame].y * CELL,
    });

    const drawWarpedFrame = (
      frame: keyof typeof FRAME,
      alpha: number,
      centerX: number,
      bottom: number,
      size: number,
      bend: number,
      lift: number,
    ) => {
      if (alpha <= 0.002) return;
      const frameSource = source(frame);
      const strips = 28;
      const sourceStripHeight = CELL / strips;
      const destinationStripHeight = size / strips + 0.8;

      context.save();
      context.globalAlpha = alpha;
      for (let index = 0; index < strips; index += 1) {
        const progress = index / (strips - 1);
        const upperWeight = Math.pow(1 - progress, 1.65);
        const torsoWeight = Math.sin(progress * Math.PI) * 0.2;
        const xShift = bend * (upperWeight + torsoWeight);
        const breathingScale =
          1 + Math.sin(elapsed * 1.55 + progress * 1.4) * 0.0025 * progress;
        const destinationWidth = size * breathingScale;
        const destinationX =
          centerX - destinationWidth / 2 + xShift * (0.6 + upperWeight);
        const destinationY =
          bottom - size + index * (size / strips) + lift * upperWeight;

        context.drawImage(
          image,
          frameSource.x,
          frameSource.y + index * sourceStripHeight,
          CELL,
          sourceStripHeight + 1,
          destinationX,
          destinationY,
          destinationWidth,
          destinationStripHeight,
        );
      }
      context.restore();
    };

    const drawPatch = (
      frame: keyof typeof FRAME,
      sourceX: number,
      sourceY: number,
      sourceWidth: number,
      sourceHeight: number,
      destinationX: number,
      destinationY: number,
      destinationWidth: number,
      destinationHeight: number,
      alpha: number,
      rotation = 0,
      pivotX = destinationX + destinationWidth / 2,
      pivotY = destinationY + destinationHeight / 2,
      clipToEllipse = false,
    ) => {
      if (alpha <= 0.002) return;
      const frameSource = source(frame);
      context.save();
      context.globalAlpha = alpha;
      context.translate(pivotX, pivotY);
      context.rotate(rotation);
      context.translate(-pivotX, -pivotY);
      if (clipToEllipse) {
        context.beginPath();
        context.ellipse(
          destinationX + destinationWidth / 2,
          destinationY + destinationHeight / 2,
          destinationWidth * 0.49,
          destinationHeight * 0.46,
          0,
          0,
          Math.PI * 2,
        );
        context.clip();
      }
      context.drawImage(
        image,
        frameSource.x + sourceX,
        frameSource.y + sourceY,
        sourceWidth,
        sourceHeight,
        destinationX,
        destinationY,
        destinationWidth,
        destinationHeight,
      );
      context.restore();
    };

    const render = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += delta;

      const pointer = pointerRef.current;
      pointer.x = lerp(pointer.x, pointer.targetX, 0.075);
      pointer.y = lerp(pointer.y, pointer.targetY, 0.075);

      const currentMode = modeRef.current;
      const poseTarget = currentMode === "processing" ? 1 : 0;
      poseBlend = lerp(
        poseBlend,
        poseTarget,
        currentMode === "processing" ? 0.065 : 0.085,
      );

      if (currentMode === "speaking") {
        const speechWave =
          0.44 +
          Math.sin(elapsed * 10.2) * 0.2 +
          Math.sin(elapsed * 4.1 + 0.7) * 0.09;
        const mouthTarget = Math.max(0.16, Math.min(0.78, speechWave));
        const speechSmoothing = 1 - Math.exp(-delta * 8);
        mouth = lerp(mouth, mouthTarget, speechSmoothing);
      } else {
        const closeSmoothing = 1 - Math.exp(-delta * 10);
        mouth = lerp(mouth, 0, closeSmoothing);
      }

      let blink = 0;
      if (elapsed >= nextBlink && blinkStart < 0) {
        blinkStart = elapsed;
      }
      if (blinkStart >= 0) {
        const blinkProgress = (elapsed - blinkStart) / 0.2;
        if (blinkProgress <= 1) {
          blink = Math.sin(blinkProgress * Math.PI);
        } else {
          blinkStart = -1;
          nextBlink = elapsed + 3.2 + Math.random() * 2.8;
        }
      }

      const breath = Math.sin(elapsed * 1.45) * 3.2;
      const thinkSway =
        currentMode === "processing" ? Math.sin(elapsed * 1.2) * 3.4 : 0;
      const bodyBend = pointer.x * 12 + thinkSway;
      const bodyLift = breath - pointer.y * 3;

      context.clearRect(0, 0, width, height);

      const size = Math.min(width * 1.36, height * 0.98, 760);
      const centerX = width / 2 + pointer.x * 7;
      const bottom = height + size * 0.015;

      drawWarpedFrame(
        "neutral",
        1 - poseBlend,
        centerX,
        bottom,
        size,
        bodyBend,
        bodyLift,
      );
      drawWarpedFrame(
        "thinking",
        poseBlend,
        centerX,
        bottom,
        size,
        bodyBend - 2,
        bodyLift - poseBlend * 4,
      );

      const scale = size / CELL;
      const baseLeft = centerX - size / 2;
      const baseTop = bottom - size;
      const headX = baseLeft + 108 * scale + pointer.x * 7;
      const headY =
        baseTop + 2 * scale + pointer.y * 3 + Math.sin(elapsed * 1.3);
      const headWidth = 296 * scale;
      const headHeight = 260 * scale;
      const headCenterX = headX + headWidth / 2;
      const headCenterY = headY + headHeight / 2;
      const headRotation =
        pointer.x * 0.026 - pointer.y * 0.012 - poseBlend * 0.015;

      {
        drawPatch(
          "neutral",
          108,
          2,
          296,
          260,
          headX,
          headY,
          headWidth,
          headHeight,
          1 - poseBlend,
          headRotation,
          headCenterX,
          headCenterY,
        );
        drawPatch(
          "thinking",
          108,
          2,
          296,
          260,
          headX,
          headY,
          headWidth,
          headHeight,
          poseBlend,
          headRotation,
          headCenterX,
          headCenterY,
        );

        const eyeX = headX + (163 - 108) * scale;
        const eyeY = headY + (103 - 2) * scale;
        drawPatch(
          "blink",
          163,
          103,
          185,
          77,
          eyeX,
          eyeY,
          185 * scale,
          77 * scale,
          easeInOut(blink),
          headRotation,
          headCenterX,
          headCenterY,
        );

        const mouthSourceX = 244;
        const mouthSourceY = 178;
        const mouthSourceWidth = 43;
        const mouthSourceHeight = 40;
        const mouthX = headX + (mouthSourceX - 108) * scale;
        const mouthY = headY + (mouthSourceY - 2) * scale;
        const wideMix = Math.max(0, Math.min(1, (mouth - 0.56) / 0.22));
        const mouthSmallAlpha =
          Math.min(1, mouth * 1.8) * (1 - wideMix * 0.82);
        const mouthWideAlpha = wideMix * 0.88;

        drawPatch(
          "mouthSmall",
          mouthSourceX,
          mouthSourceY,
          mouthSourceWidth,
          mouthSourceHeight,
          mouthX,
          mouthY,
          mouthSourceWidth * scale,
          mouthSourceHeight * scale * (0.94 + mouth * 0.06),
          mouthSmallAlpha,
          headRotation,
          headCenterX,
          headCenterY,
          true,
        );
        drawPatch(
          "mouthWide",
          mouthSourceX,
          mouthSourceY,
          mouthSourceWidth,
          mouthSourceHeight,
          mouthX,
          mouthY,
          mouthSourceWidth * scale,
          mouthSourceHeight * scale * (0.92 + mouth * 0.1),
          mouthWideAlpha,
          headRotation,
          headCenterX,
          headCenterY,
          true,
        );
      }

      animationFrame = requestAnimationFrame(render);
    };

    image.onload = () => {
      lastTime = performance.now();
      animationFrame = requestAnimationFrame(render);
    };

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="live-character"
      role="img"
      aria-label="Amadeus 动态人物形象"
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        pointerRef.current.targetX =
          ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        pointerRef.current.targetY =
          ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      }}
      onPointerLeave={() => {
        pointerRef.current.targetX = 0;
        pointerRef.current.targetY = 0;
      }}
    />
  );
}
