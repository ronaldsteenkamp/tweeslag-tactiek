import { useEffect, useState } from "react";
import { keyframesOf, BASE_VARIANT } from "../../domain/editing";
import type { Zone } from "../../domain/schema";
import { t } from "../../i18n";
import type { MessageKey } from "../../i18n/nl";
import { useOrientation } from "../court/media";
import { ScenarioPlayer } from "../lessons/ScenarioPlayer";
import { ShareDialog } from "../share/ShareDialog";
import formStyles from "../ui/forms.module.css";
import { BoardCourt } from "./BoardCourt";
import styles from "./BoardPage.module.css";
import { LibraryDialog, MenuDialog, StepDialog } from "./dialogs";
import {
  selectKeyframe,
  selectKeyframes,
  useEditor,
  type Tool,
} from "./editorStore";

type Dialog = "share" | "menu" | "step" | "library";

const TOOLS: { tool: Tool; label: MessageKey; key: string }[] = [
  { tool: "select", label: "board.toolSelect", key: "v" },
  { tool: "run", label: "board.toolRun", key: "l" },
  { tool: "ball", label: "board.toolBall", key: "b" },
  { tool: "shot", label: "board.toolShot", key: "s" },
  { tool: "zone", label: "board.toolZone", key: "z" },
];

const ZONE_KINDS: { kind: Zone["kind"]; label: MessageKey }[] = [
  { kind: "blocked", label: "board.zoneBlocked" },
  { kind: "cover", label: "board.zoneCover" },
  { kind: "target", label: "board.zoneTarget" },
];

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function useShortcuts(onPlay: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    function handleKey(event: KeyboardEvent) {
      const editor = useEditor.getState();
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (modifier && key === "z") {
        if (isTyping(event.target)) return;
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (modifier && key === "y") {
        if (isTyping(event.target)) return;
        event.preventDefault();
        editor.redo();
        return;
      }
      if (modifier || event.altKey || isTyping(event.target)) return;
      if (document.querySelector("dialog[open]")) return;

      const tool = TOOLS.find((item) => item.key === key);
      if (tool) editor.setTool(tool.tool);
      else if (key === "delete" || key === "backspace") editor.deleteSelected();
      else if (key === "escape") editor.setTool("select");
      else if (key === "n") editor.addStep();
      else if (key === "d") editor.duplicateStep();
      else if (key === "p") onPlay();
      else return;
      event.preventDefault();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [enabled, onPlay]);
}

function SelectionBar() {
  const keyframe = useEditor(selectKeyframe);
  const selectedId = useEditor((state) => state.selectedId);
  const deleteSelected = useEditor((state) => state.deleteSelected);
  const setZone = useEditor((state) => state.setZone);
  const zone = keyframe.zones?.find((item) => item.id === selectedId);

  return (
    <div className={styles.selection}>
      {zone ? (
        <div className={styles.zoneKinds} role="group">
          {ZONE_KINDS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              className={styles.small}
              aria-pressed={zone.kind === kind}
              onClick={() => setZone({ kind })}
            >
              {t(label)}
            </button>
          ))}
        </div>
      ) : null}
      {zone ? (
        <input
          className={formStyles.input}
          aria-label={t("board.zoneLabel")}
          placeholder={t("board.zoneLabel")}
          maxLength={30}
          value={zone.label ?? ""}
          onChange={(event) => setZone({ label: event.target.value })}
        />
      ) : null}
      <button
        type="button"
        className={formStyles.danger}
        onClick={deleteSelected}
      >
        {t("board.delete")}
      </button>
    </div>
  );
}

function StepEditor({ onOptions }: { onOptions: () => void }) {
  const keyframe = useEditor(selectKeyframe);
  const editLive = useEditor((state) => state.editLive);
  const endGesture = useEditor((state) => state.endGesture);

  return (
    <div className={styles.stepEditor}>
      <textarea
        className={styles.caption}
        aria-label={t("board.caption")}
        placeholder={t("board.caption")}
        rows={2}
        maxLength={600}
        value={keyframe.caption}
        onChange={(event) => {
          const caption = event.target.value;
          editLive((current) => ({ ...current, caption }));
        }}
        onBlur={endGesture}
      />
      <button type="button" className={styles.small} onClick={onOptions}>
        {t("board.stepOptions")}
      </button>
    </div>
  );
}

export function BoardPage() {
  const orientation = useOrientation();
  const scenario = useEditor((state) => state.history.present);
  const keyframes = useEditor(selectKeyframes);
  const stepIndex = useEditor((state) => state.stepIndex);
  const variantId = useEditor((state) => state.variantId);
  const tool = useEditor((state) => state.tool);
  const flipped = useEditor((state) => state.flipped);
  const selectedId = useEditor((state) => state.selectedId);
  const canUndo = useEditor((state) => state.history.past.length > 0);
  const canRedo = useEditor((state) => state.history.future.length > 0);
  const editor = useEditor.getState();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [playing, setPlaying] = useState(false);

  useShortcuts(() => setPlaying(true), !playing);

  if (playing) {
    return (
      <ScenarioPlayer
        title={scenario.title}
        players={scenario.players}
        keyframes={keyframesOf(scenario, variantId)}
        autoPlay
        headerAction={
          <button
            type="button"
            className={formStyles.button}
            onClick={() => setPlaying(false)}
          >
            {t("board.backToEdit")}
          </button>
        }
      />
    );
  }

  const variants = scenario.variants ?? [];

  return (
    <div className={styles.layout}>
      <h1 className={styles.visuallyHidden}>{t("nav.board")}</h1>
      <div className={styles.field}>
        <BoardCourt view={{ orientation, flipped }} />
      </div>

      <div className={styles.panel}>
        <div
          className={styles.tools}
          role="group"
          aria-label={t("board.tools")}
        >
          {TOOLS.map((item) => (
            <button
              key={item.tool}
              type="button"
              className={styles.small}
              aria-pressed={tool === item.tool}
              onClick={() => editor.setTool(item.tool)}
            >
              {t(item.label)}
            </button>
          ))}
        </div>

        {variants.length > 0 ? (
          <div
            className={styles.strip}
            role="group"
            aria-label={t("board.variants")}
          >
            {[
              { id: BASE_VARIANT, label: t("board.baseVariant") },
              ...variants,
            ].map((variant) => (
              <button
                key={variant.id}
                type="button"
                className={styles.chip}
                aria-pressed={variant.id === variantId}
                onClick={() => editor.setVariant(variant.id)}
              >
                {variant.label}
              </button>
            ))}
          </div>
        ) : null}

        {selectedId ? (
          <SelectionBar />
        ) : (
          <>
            <ol className={styles.strip} aria-label={t("board.steps")}>
              {keyframes.map((keyframe, index) => (
                <li key={keyframe.id}>
                  <button
                    type="button"
                    className={styles.step}
                    aria-current={index === stepIndex ? "step" : undefined}
                    aria-label={t("board.goToStep", { step: index + 1 })}
                    onClick={() => editor.setStep(index)}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className={styles.addStep}
                  onClick={editor.addStep}
                >
                  {t("board.addStep")}
                </button>
              </li>
            </ol>
            <StepEditor onOptions={() => setDialog("step")} />
          </>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.small}
            disabled={!canUndo}
            onClick={editor.undo}
          >
            {t("board.undo")}
          </button>
          <button
            type="button"
            className={styles.small}
            disabled={!canRedo}
            onClick={editor.redo}
          >
            {t("board.redo")}
          </button>
          <button
            type="button"
            className={styles.small}
            onClick={() => setPlaying(true)}
          >
            {t("player.play")}
          </button>
          <button
            type="button"
            className={styles.small}
            onClick={() => setDialog("menu")}
          >
            {t("board.menu")}
          </button>
          <button
            type="button"
            className={styles.share}
            onClick={() => setDialog("share")}
          >
            {t("board.share")}
          </button>
        </div>
      </div>

      {dialog === "share" ? (
        <ShareDialog
          scenario={scenario}
          onClose={() => {
            editor.endGesture();
            setDialog(null);
          }}
          onRename={(title) =>
            editor.editScenarioLive((current) => ({ ...current, title }))
          }
        />
      ) : null}
      {dialog === "step" ? (
        <StepDialog onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "menu" ? (
        <MenuDialog
          onClose={() => {
            editor.endGesture();
            setDialog(null);
          }}
          onOpenLibrary={() => setDialog("library")}
        />
      ) : null}
      {dialog === "library" ? (
        <LibraryDialog onClose={() => setDialog(null)} />
      ) : null}
    </div>
  );
}
