import { useCallback, useEffect, useRef, useState } from "react";
import { frameAt } from "../../domain/interpolate";
import type { Keyframe } from "../../domain/schema";
import { useReducedMotion } from "../court/media";

/** Stappen door een scenario. Volgende laat de beweging zien; terugspringen gaat direct. */
export function useStepPlayer(keyframes: Keyframe[]) {
  const [step, setStep] = useState(0);
  const [progress, setProgressState] = useState(1);
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
    if (!moving || !keyframe) return;

    const duration = reducedMotion ? 0 : keyframe.durationMs;
    let frameId = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = now - previous;
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
  }, [keyframe, moving, reducedMotion, setProgress]);

  function next() {
    if (step >= lastStep) return;
    setStep(step + 1);
    setProgress(0);
  }

  function goTo(target: number) {
    setStep(target);
    setProgress(1);
  }

  function previous() {
    if (step > 0) goTo(step - 1);
  }

  return {
    step,
    lastStep,
    keyframe,
    frame: frameAt(keyframes, step, progress),
    next,
    previous,
    goTo,
  };
}
