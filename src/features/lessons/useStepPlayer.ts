import { useCallback, useEffect, useRef, useState } from "react";
import { frameAt, holdMs } from "../../domain/interpolate";
import type { Keyframe } from "../../domain/schema";
import { useReducedMotion } from "../court/media";

export const SPEEDS = [0.5, 1, 1.5] as const;
export type Speed = (typeof SPEEDS)[number];

/** paused: stil. step: één overgang en dan stoppen. play: alle stappen achter elkaar. */
type Mode = "paused" | "step" | "play";

export function useStepPlayer(keyframes: Keyframe[]) {
  const [step, setStep] = useState(0);
  const [progress, setProgressState] = useState(1);
  const [mode, setMode] = useState<Mode>("paused");
  const [speed, setSpeed] = useState<Speed>(1);
  const reducedMotion = useReducedMotion();

  // De animatielus leest de actuele waarde zonder bij elk beeld opnieuw te starten.
  const progressRef = useRef(1);
  const setProgress = useCallback((value: number) => {
    progressRef.current = value;
    setProgressState(value);
  }, []);

  const lastStep = keyframes.length - 1;
  const keyframe = keyframes[step];
  const moving = progress < 1;

  useEffect(() => {
    if (mode === "paused" || !keyframe) return;

    if (moving) {
      const duration = reducedMotion ? 0 : keyframe.durationMs;
      let frameId = 0;
      let previous = performance.now();
      const tick = (now: number) => {
        const elapsed = (now - previous) * speed;
        previous = now;
        const next =
          duration === 0
            ? 1
            : Math.min(1, progressRef.current + elapsed / duration);
        setProgress(next);
        if (next < 1) frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frameId);
    }

    // De overgang is klaar: stoppen, of na de leestijd door naar de volgende stap.
    const stop = mode === "step" || step >= lastStep;
    const delay = stop ? 0 : holdMs(keyframe.caption) / speed;
    const timer = setTimeout(() => {
      if (stop) {
        setMode("paused");
      } else {
        setStep(step + 1);
        setProgress(0);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [
    keyframe,
    lastStep,
    mode,
    moving,
    reducedMotion,
    setProgress,
    speed,
    step,
  ]);

  function next() {
    if (step >= lastStep) return;
    setStep(step + 1);
    setProgress(0);
    if (mode !== "play") setMode("step");
  }

  function previous() {
    if (step === 0) return;
    goTo(step - 1);
  }

  function goTo(target: number) {
    setStep(target);
    setProgress(1);
    setMode("paused");
  }

  function togglePlay() {
    if (mode === "play") {
      setMode("paused");
      return;
    }
    if (step >= lastStep && !moving) {
      setStep(0);
      setProgress(1);
    } else if (!moving) {
      // Wie op afspelen drukt, wil meteen beweging zien en niet eerst de leestijd.
      setStep(step + 1);
      setProgress(0);
    }
    setMode("play");
  }

  return {
    step,
    lastStep,
    keyframe,
    frame: frameAt(keyframes, step, progress),
    playing: mode === "play",
    speed,
    setSpeed,
    next,
    previous,
    goTo,
    togglePlay,
  };
}
