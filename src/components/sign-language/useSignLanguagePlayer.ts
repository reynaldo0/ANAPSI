"use client";

import { useEffect, useRef, useState } from "react";
import { IDLE_POSE, type SignPose } from "@/lib/sign-language/gloss-dictionary";
import { resolvePoses } from "@/lib/sign-language/text-to-gloss";
import type { AvatarRender } from "@/components/sign-language/AvatarFigure";

export type SignSpeed = 0.75 | 1 | 1.3;

interface NumericPose {
  rs: number;
  re: number;
  ls: number;
  le: number;
}

interface DiscretePose {
  active: AvatarRender["active"];
  handR: AvatarRender["handR"];
  handL: AvatarRender["handL"];
  eyes: AvatarRender["eyes"];
  mouth: AvatarRender["mouth"];
  headTilt: number;
  nod: boolean;
}

export interface SignPlayerState {
  render: AvatarRender;
  index: number;
  total: number;
  playing: boolean;
  done: boolean;
  currentLabel: string;
  currentDescription: string;
}

const TAU = 0.12;

function numericOf(pose: SignPose): NumericPose {
  return {
    rs: pose.rightShoulder,
    re: pose.rightElbow,
    ls: pose.leftShoulder,
    le: pose.leftElbow,
  };
}

const IDLE_NUMERIC: NumericPose = numericOf(IDLE_POSE);

const IDLE_DISCRETE: DiscretePose = {
  active: "none",
  handR: "palm",
  handL: "palm",
  eyes: "open",
  mouth: "neutral",
  headTilt: 0,
  nod: false,
};

function idleState(): SignPlayerState {
  return {
    render: {
      rs: 0,
      re: 0,
      ls: 0,
      le: 0,
      active: "none",
      handR: "palm",
      handL: "palm",
      headTilt: 0,
      bobY: 0,
      eyes: "open",
      mouth: "neutral",
    },
    index: 0,
    total: 0,
    playing: false,
    done: false,
    currentLabel: "",
    currentDescription: "",
  };
}

export function useSignLanguagePlayer(
  signIds: string[],
  opts: { autoPlay?: boolean; speed?: SignSpeed } = {},
): {
  state: SignPlayerState;
  play: () => void;
  pause: () => void;
  restart: () => void;
  setSpeed: (speed: SignSpeed) => void;
} {
  const autoPlay = opts.autoPlay !== false;
  const queueRef = useRef<SignPose[]>([]);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const doneRef = useRef(false);
  const speedRef = useRef<SignSpeed>(opts.speed ?? 1);
  const targetRef = useRef<NumericPose>(IDLE_NUMERIC);
  const currentRef = useRef<NumericPose>({ ...IDLE_NUMERIC });
  const discreteRef = useRef<DiscretePose>({ ...IDLE_DISCRETE });
  const bobRef = useRef(0);
  const poseStartRef = useRef(0);
  const lastSetRef = useRef(0);
  const forceRef = useRef(true);
  const reducedRef = useRef(false);

  const [state, setState] = useState<SignPlayerState>(idleState);

  useEffect(() => {
    reducedRef.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  const enterPose = (pose: SignPose, now: number): void => {
    targetRef.current = numericOf(pose);
    discreteRef.current = {
      active: pose.activeHand,
      handR: pose.handShape,
      handL: pose.handShape,
      eyes: pose.eyes,
      mouth: pose.mouth,
      headTilt: pose.headTilt,
      nod: pose.nod,
    };
    poseStartRef.current = now;
    forceRef.current = true;
  };

  const build = (now: number): SignPlayerState => {
    const queue = queueRef.current;
    const playing = playingRef.current;
    const cur = currentRef.current;
    const dis = discreteRef.current;
    const pose = queue[indexRef.current] ?? null;

    const wobAmp = reducedRef.current ? 1.6 : 4.5;
    const rs = cur.rs;
    let re = cur.re;
    const ls = cur.ls;
    let le = cur.le;
    if (playing && pose) {
      if (dis.active === "right") re += Math.sin(now / 130) * wobAmp;
      else if (dis.active === "left") le += Math.sin(now / 130) * wobAmp;
      else if (dis.active === "both") {
        re += Math.sin(now / 130) * wobAmp;
        le -= Math.sin(now / 130) * wobAmp;
      }
    }

    let headTilt = dis.headTilt;
    if (playing && pose?.nod) {
      const since = now - poseStartRef.current;
      const duration = Math.max(pose.heldMs / speedRef.current, 1);
      headTilt += 8 * Math.sin(Math.min(since / duration, 1) * Math.PI);
    }

    const targetBob = playing ? 1.1 : 0;
    bobRef.current += (targetBob - bobRef.current) * 0.12;
    const bobY = Math.sin(now / 160) * bobRef.current;

    const render: AvatarRender = {
      rs,
      re,
      ls,
      le,
      active: playing ? dis.active : "none",
      handR: playing ? dis.handR : IDLE_DISCRETE.handR,
      handL: playing ? dis.handL : IDLE_DISCRETE.handL,
      headTilt,
      bobY,
      eyes: playing ? dis.eyes : IDLE_DISCRETE.eyes,
      mouth: playing ? dis.mouth : IDLE_DISCRETE.mouth,
    };

    return {
      render,
      index: indexRef.current,
      total: queue.length,
      playing,
      done: doneRef.current && !playing,
      currentLabel: pose?.label ?? "",
      currentDescription: pose?.description ?? "",
    };
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const queue = queueRef.current;
      if (playingRef.current && queue.length > 0) {
        const pose = queue[indexRef.current];
        const since = now - poseStartRef.current;
        const duration = Math.max(pose.heldMs / speedRef.current, 1);
        if (since >= duration) {
          if (indexRef.current + 1 < queue.length) {
            indexRef.current += 1;
            enterPose(queue[indexRef.current], now);
          } else if (playingRef.current) {
            playingRef.current = false;
            doneRef.current = true;
            targetRef.current = IDLE_NUMERIC;
            discreteRef.current = { ...IDLE_DISCRETE };
            forceRef.current = true;
          }
        }
      }

      const k = 1 - Math.exp(-dt / TAU);
      const cur = currentRef.current;
      const tgt = targetRef.current;
      cur.rs += (tgt.rs - cur.rs) * k;
      cur.re += (tgt.re - cur.re) * k;
      cur.ls += (tgt.ls - cur.ls) * k;
      cur.le += (tgt.le - cur.le) * k;
      if (Math.abs(cur.rs - tgt.rs) < 0.1) cur.rs = tgt.rs;
      if (Math.abs(cur.re - tgt.re) < 0.1) cur.re = tgt.re;
      if (Math.abs(cur.ls - tgt.ls) < 0.1) cur.ls = tgt.ls;
      if (Math.abs(cur.le - tgt.le) < 0.1) cur.le = tgt.le;

      if (now - lastSetRef.current >= 33 || forceRef.current) {
        lastSetRef.current = now;
        forceRef.current = false;
        setState(build(now));
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const poses = resolvePoses(signIds ?? []);
    queueRef.current = poses;
    indexRef.current = 0;
    doneRef.current = false;
    if (poses.length === 0) {
      playingRef.current = false;
      targetRef.current = IDLE_NUMERIC;
      discreteRef.current = { ...IDLE_DISCRETE };
      forceRef.current = true;
      return;
    }
    enterPose(poses[0], performance.now());
    playingRef.current = autoPlay;
    forceRef.current = true;
  }, [signIds, autoPlay]);

  return {
    state,
    play: () => {
      if (queueRef.current.length === 0) return;
      if (doneRef.current) {
        indexRef.current = 0;
        enterPose(queueRef.current[0], performance.now());
      }
      playingRef.current = true;
      doneRef.current = false;
      forceRef.current = true;
    },
    pause: () => {
      playingRef.current = false;
      forceRef.current = true;
    },
    restart: () => {
      if (queueRef.current.length === 0) return;
      indexRef.current = 0;
      playingRef.current = true;
      doneRef.current = false;
      enterPose(queueRef.current[0], performance.now());
      forceRef.current = true;
    },
    setSpeed: (speed: SignSpeed) => {
      speedRef.current = speed;
      forceRef.current = true;
    },
  };
}