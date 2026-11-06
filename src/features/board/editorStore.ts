import { create } from "zustand";
import {
  addArrow,
  addStep,
  addVariant,
  addZone,
  BASE_VARIANT,
  createId,
  deleteStep,
  duplicateStep,
  keyframesOf,
  moveEntity,
  moveStep,
  newScenario,
  normalizePosition,
  rectangle,
  removeOverlay,
  removeVariant,
  renameVariant,
  translateOverlay,
  updateZone,
  withKeyframes,
  withNames,
} from "../../domain/editing";
import {
  pushHistory,
  redo,
  startHistory,
  undo,
  type History,
} from "../../domain/history";
import {
  scenarioSchema,
  type Arrow,
  type Keyframe,
  type Position,
  type Scenario,
  type Zone,
} from "../../domain/schema";
import { t } from "../../i18n";
import { browserStorage, readJson, writeJson } from "../storage";

const DRAFT_KEY = "tweeslag-tactiek.concept.v1";
const storage = browserStorage();

export type Tool = "select" | Arrow["kind"] | "zone";

type StepEdit = (keyframes: Keyframe[], index: number) => Keyframe[];

interface EditorState {
  history: History<Scenario>;
  /** De stand bij het begin van een sleepbeweging of typen; één undo gaat daarnaartoe terug. */
  gestureBase: Scenario | null;
  variantId: string;
  stepIndex: number;
  tool: Tool;
  selectedId: string | null;
  snap: boolean;
  flipped: boolean;

  setTool: (tool: Tool) => void;
  select: (id: string | null) => void;
  setStep: (index: number) => void;
  setVariant: (variantId: string) => void;
  toggleSnap: () => void;
  toggleFlipped: () => void;

  /** Tussenstand: wijzigt direct, maar pas endGesture maakt er één undo-stap van. */
  editLive: (edit: (keyframe: Keyframe) => Keyframe) => void;
  editScenarioLive: (edit: (scenario: Scenario) => Scenario) => void;
  endGesture: () => void;
  edit: (edit: (keyframe: Keyframe) => Keyframe) => void;

  moveToken: (id: string, position: Position) => void;
  moveSelected: (dx: number, dy: number) => void;
  drawArrow: (kind: Arrow["kind"], from: Position, to: Position) => void;
  drawZone: (from: Position, to: Position) => void;
  deleteSelected: () => void;
  setZone: (patch: Partial<Pick<Zone, "kind" | "label">>) => void;

  addStep: () => void;
  duplicateStep: () => void;
  deleteStep: () => void;
  moveStep: (delta: number) => void;

  addVariant: () => void;
  renameVariant: (variantId: string, label: string) => void;
  removeVariant: (variantId: string) => void;

  undo: () => void;
  redo: () => void;
  /** Vervangt het scenario; undo brengt het vorige terug. */
  open: (scenario: Scenario) => void;
}

function loadDraft(): Scenario {
  const result = scenarioSchema.safeParse(readJson(storage, DRAFT_KEY));
  return result.success ? result.data : newScenario(t("board.defaultTitle"));
}

export const useEditor = create<EditorState>((set, get) => {
  const scenario = () => get().history.present;

  function commit(next: Scenario, extra: Partial<EditorState> = {}) {
    const { history } = get();
    if (next === history.present) return;
    set({ history: pushHistory(history, history.present, next), ...extra });
  }

  function currentKeyframes(): Keyframe[] {
    return keyframesOf(scenario(), get().variantId);
  }

  function mapCurrent(edit: (keyframe: Keyframe) => Keyframe): Scenario {
    const { stepIndex, variantId } = get();
    return withKeyframes(
      scenario(),
      variantId,
      currentKeyframes().map((keyframe, index) =>
        index === stepIndex ? edit(keyframe) : keyframe,
      ),
    );
  }

  function live(next: Scenario) {
    const { history, gestureBase } = get();
    set({
      gestureBase: gestureBase ?? history.present,
      history: { ...history, present: next },
    });
  }

  function editSteps(edit: StepEdit, nextIndex: (index: number) => number) {
    const { stepIndex, variantId } = get();
    const before = currentKeyframes();
    const after = edit(before, stepIndex);
    if (after === before) return;
    commit(withKeyframes(scenario(), variantId, after), {
      stepIndex: Math.min(nextIndex(stepIndex), after.length - 1),
      selectedId: null,
    });
  }

  /** Na undo of redo kunnen de huidige stap en variant verdwenen zijn. */
  function restore(history: History<Scenario>) {
    const { variantId, stepIndex } = get();
    const exists =
      variantId === BASE_VARIANT ||
      history.present.variants?.some((variant) => variant.id === variantId);
    const nextVariant = exists ? variantId : BASE_VARIANT;
    const count = keyframesOf(history.present, nextVariant).length;
    set({
      history,
      variantId: nextVariant,
      stepIndex: Math.min(stepIndex, count - 1),
      selectedId: null,
    });
  }

  return {
    history: startHistory(loadDraft()),
    gestureBase: null,
    variantId: BASE_VARIANT,
    stepIndex: 0,
    tool: "select",
    selectedId: null,
    snap: false,
    flipped: false,

    setTool: (tool) => set({ tool, selectedId: null }),
    select: (selectedId) => set({ selectedId }),
    setStep: (stepIndex) => set({ stepIndex, selectedId: null }),
    setVariant: (variantId) =>
      set({ variantId, stepIndex: 0, selectedId: null }),
    toggleSnap: () => set((state) => ({ snap: !state.snap })),
    toggleFlipped: () => set((state) => ({ flipped: !state.flipped })),

    editLive: (edit) => live(mapCurrent(edit)),
    editScenarioLive: (edit) => live(edit(scenario())),
    endGesture: () => {
      const { history, gestureBase } = get();
      if (!gestureBase) return;
      const named = withNames(
        history.present,
        t("board.defaultTitle"),
        t("board.variantFallback"),
      );
      set({
        gestureBase: null,
        history:
          gestureBase === named
            ? history
            : pushHistory(history, gestureBase, named),
      });
    },
    edit: (edit) => commit(mapCurrent(edit)),

    moveToken: (id, position) => {
      const place = normalizePosition(position, get().snap);
      live(mapCurrent((keyframe) => moveEntity(keyframe, id, place)));
    },
    moveSelected: (dx, dy) => {
      const { selectedId } = get();
      if (!selectedId) return;
      live(
        mapCurrent((keyframe) =>
          translateOverlay(keyframe, selectedId, dx, dy),
        ),
      );
    },
    drawArrow: (kind, from, to) => {
      const { snap } = get();
      const arrow: Arrow = {
        id: createId("pijl"),
        kind,
        from: normalizePosition(from, snap),
        to: normalizePosition(to, snap),
      };
      commit(mapCurrent((keyframe) => addArrow(keyframe, arrow)));
    },
    drawZone: (from, to) => {
      const { snap } = get();
      const zone: Zone = {
        id: createId("zone"),
        kind: "blocked",
        polygon: rectangle(
          normalizePosition(from, snap),
          normalizePosition(to, snap),
        ),
      };
      commit(
        mapCurrent((keyframe) => addZone(keyframe, zone)),
        {
          tool: "select",
          selectedId: zone.id,
        },
      );
    },
    deleteSelected: () => {
      const { selectedId } = get();
      if (!selectedId) return;
      commit(
        mapCurrent((keyframe) => removeOverlay(keyframe, selectedId)),
        { selectedId: null },
      );
    },
    setZone: (patch) => {
      const { selectedId } = get();
      if (!selectedId) return;
      commit(mapCurrent((keyframe) => updateZone(keyframe, selectedId, patch)));
    },

    addStep: () => editSteps(addStep, (index) => index + 1),
    duplicateStep: () => editSteps(duplicateStep, (index) => index + 1),
    deleteStep: () => editSteps(deleteStep, (index) => Math.max(0, index - 1)),
    moveStep: (delta) =>
      editSteps(
        (keyframes, index) => moveStep(keyframes, index, delta),
        (index) => index + delta,
      ),

    addVariant: () => {
      const count = (scenario().variants?.length ?? 0) + 1;
      const { scenario: next, variantId } = addVariant(
        scenario(),
        get().variantId,
        t("board.variantName", { number: count + 1 }),
      );
      commit(next, { variantId, stepIndex: 0, selectedId: null });
    },
    renameVariant: (variantId, label) =>
      live(renameVariant(scenario(), variantId, label)),
    removeVariant: (variantId) => {
      const active = get().variantId === variantId;
      commit(
        removeVariant(scenario(), variantId),
        active ? { variantId: BASE_VARIANT, stepIndex: 0 } : {},
      );
    },

    undo: () => restore(undo(get().history)),
    redo: () => restore(redo(get().history)),
    open: (next) =>
      commit(next, {
        variantId: BASE_VARIANT,
        stepIndex: 0,
        selectedId: null,
        tool: "select",
      }),
  };
});

export function selectKeyframes(state: EditorState): Keyframe[] {
  return keyframesOf(state.history.present, state.variantId);
}

export function selectKeyframe(state: EditorState): Keyframe {
  const keyframes = selectKeyframes(state);
  const keyframe = keyframes[state.stepIndex] ?? keyframes[0];
  if (!keyframe) throw new Error("Een scenario heeft altijd een stap");
  return keyframe;
}

// Het concept overleeft herladen, zodat een trainer op het strand niets kwijtraakt.
useEditor.subscribe((state, previous) => {
  if (state.gestureBase) return;
  if (state.history.present !== previous.history.present) {
    writeJson(storage, DRAFT_KEY, state.history.present);
  }
});
