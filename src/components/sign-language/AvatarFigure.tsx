"use client";

import type { HandShape, HandSide, Eyes, Mouth } from "@/lib/sign-language/gloss-dictionary";

export interface AvatarRender {
  rs: number;
  re: number;
  ls: number;
  le: number;
  active: HandSide | "none";
  handR: HandShape;
  handL: HandShape;
  headTilt: number;
  bobY: number;
  eyes: Eyes;
  mouth: Mouth;
}

interface ArmPoints {
  ex: number;
  ey: number;
  wx: number;
  wy: number;
  dx: number;
  dy: number;
}

const RAD = Math.PI / 180;
const UPPER = 46;
const LOWER = 42;

function clampDeg(v: number): number {
  return Math.max(-110, Math.min(110, v));
}

function rightArm(s: number, e: number): ArmPoints {
  const a1 = clampDeg(s) * RAD;
  const ex = 134 + Math.sin(a1) * UPPER;
  const ey = 112 + Math.cos(a1) * UPPER;
  const a2 = a1 + clampDeg(e) * RAD;
  return {
    ex,
    ey,
    wx: ex + Math.sin(a2) * LOWER,
    wy: ey + Math.cos(a2) * LOWER,
    dx: Math.sin(a2),
    dy: Math.cos(a2),
  };
}

function leftArm(s: number, e: number): ArmPoints {
  const a1 = clampDeg(s) * RAD;
  const ex = 86 - Math.sin(a1) * UPPER;
  const ey = 112 + Math.cos(a1) * UPPER;
  const a2 = a1 + clampDeg(e) * RAD;
  return {
    ex,
    ey,
    wx: ex - Math.sin(a2) * LOWER,
    wy: ey + Math.cos(a2) * LOWER,
    dx: -Math.sin(a2),
    dy: Math.cos(a2),
  };
}

function Hand({ arm, shape, active }: { arm: ArmPoints; shape: HandShape; active: boolean }) {
  const px = arm.wx + arm.dx * 7;
  const py = arm.wy + arm.dy * 7;
  const p = { x: -arm.dy, y: arm.dx };
  const palmR = active ? 7.5 : 5.5;

  const fingers = (offsets: number[], len: number): Array<[number, number, number, number]> =>
    offsets.map((off) => [px + p.x * off, py + p.y * off, px + p.x * off + arm.dx * len, py + p.y * off + arm.dy * len]);

  let shapes: Array<[number, number, number, number]> = [];
  if (shape === "point") {
    shapes = [[px, py, px + arm.dx * 16, py + arm.dy * 16]];
  } else if (shape === "fist") {
    shapes = [];
  } else if (shape === "cup") {
    shapes = fingers([-3, 0, 3], 9);
  } else if (shape === "flat") {
    shapes = fingers([-6, -3, 0, 3, 6], 12);
  } else if (shape === "palm") {
    shapes = fingers([-4, 0, 4], 13);
  } else {
    shapes = fingers([-5, -1.7, 1.7, 5], 15);
  }

  return (
    <>
      {shapes.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="currentColor"
          strokeWidth={active ? 3.2 : 2.4}
          strokeLinecap="round"
          opacity={active ? 1 : 0.55}
        />
      ))}
      <circle cx={px} cy={py} r={palmR} fill="currentColor" opacity={active ? 1 : 0.6} />
    </>
  );
}

function Face({ eyes, mouth }: { eyes: Eyes; mouth: Mouth }) {
  const stroke = "currentColor";
  return (
    <>
      {eyes === "open" || eyes === "happy" ? (
        <>
          <circle cx={99} cy={58} r={3.4} fill={stroke} />
          <circle cx={121} cy={58} r={3.4} fill={stroke} />
        </>
      ) : null}
      {eyes === "happy" ? (
        <>
          <path d="M93 52 Q99 48 105 52" stroke={stroke} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <path d="M115 52 Q121 48 127 52" stroke={stroke} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </>
      ) : null}
      {eyes === "concentrate" ? (
        <>
          <path d="M94 51 L102 58" stroke={stroke} strokeWidth={2.6} strokeLinecap="round" />
          <path d="M126 51 L118 58" stroke={stroke} strokeWidth={2.6} strokeLinecap="round" />
          <circle cx={101} cy={64} r={2.6} fill={stroke} />
          <circle cx={119} cy={64} r={2.6} fill={stroke} />
        </>
      ) : null}
      {eyes === "wink" ? (
        <>
          <circle cx={99} cy={58} r={3.4} fill={stroke} />
          <path d="M116 58 L126 58" stroke={stroke} strokeWidth={3} strokeLinecap="round" />
        </>
      ) : null}
      {mouth === "neutral" ? (
        <path d="M102 76 L118 76" stroke={stroke} strokeWidth={2.8} strokeLinecap="round" />
      ) : null}
      {mouth === "smile" ? (
        <path d="M101 76 Q110 83 119 76" stroke={stroke} strokeWidth={2.8} fill="none" strokeLinecap="round" />
      ) : null}
      {mouth === "open" ? <ellipse cx={110} cy={77} rx={5} ry={6} fill={stroke} /> : null}
      {mouth === "flat" ? <path d="M100 77 L120 77" stroke={stroke} strokeWidth={3.4} strokeLinecap="round" /> : null}
    </>
  );
}

export function AvatarFigure({ render, className }: { render: AvatarRender; className?: string }) {
  const right = rightArm(render.rs, render.re);
  const left = leftArm(render.ls, render.le);

  return (
    <svg
      viewBox="0 0 220 300"
      role="img"
      aria-hidden="true"
      className={className}
      style={{ width: "100%", height: "auto", maxHeight: 280, color: "currentColor" }}
    >
      <g transform={`translate(0 ${render.bobY})`}>
        <line x1={110} y1={84} x2={110} y2={110} stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
        <line x1={86} y1={112} x2={134} y2={112} stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
        <line x1={110} y1={112} x2={110} y2={196} stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
        <line x1={110} y1={196} x2={94} y2={262} stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
        <line x1={110} y1={196} x2={126} y2={262} stroke="currentColor" strokeWidth={5} strokeLinecap="round" />

        <line x1={134} y1={112} x2={right.ex} y2={right.ey} stroke="currentColor" strokeWidth={6} strokeLinecap="round" />
        <line x1={right.ex} y1={right.ey} x2={right.wx} y2={right.wy} stroke="currentColor" strokeWidth={6} strokeLinecap="round" />
        <line x1={86} y1={112} x2={left.ex} y2={left.ey} stroke="currentColor" strokeWidth={6} strokeLinecap="round" />
        <line x1={left.ex} y1={left.ey} x2={left.wx} y2={left.wy} stroke="currentColor" strokeWidth={6} strokeLinecap="round" />

        <Hand arm={right} shape={render.handR} active={render.active === "right" || render.active === "both"} />
        <Hand arm={left} shape={render.handL} active={render.active === "left" || render.active === "both"} />

        <g transform={`rotate(${render.headTilt} 110 84)`}>
          <circle cx={110} cy={62} r={30} stroke="currentColor" strokeWidth={4.6} fill="none" />
          <Face eyes={render.eyes} mouth={render.mouth} />
        </g>
      </g>
    </svg>
  );
}