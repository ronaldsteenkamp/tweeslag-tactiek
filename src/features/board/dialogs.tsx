import { useRef, useState, type ChangeEvent } from "react";
import { scenarioSchema, type Scenario } from "../../domain/schema";
import { newScenario } from "../../domain/editing";
import { t } from "../../i18n";
import { Modal } from "../ui/Modal";
import formStyles from "../ui/forms.module.css";
import styles from "./dialogs.module.css";
import { selectKeyframe, selectKeyframes, useEditor } from "./editorStore";
import { useLibraryStore } from "./library";

const DURATIONS_MS = [500, 800, 1000, 1500, 2000, 3000, 5000];
const ARCS = [
  { value: 0, label: "board.arcFlat" },
  { value: 1.5, label: "board.arcLow" },
  { value: 3.5, label: "board.arcHigh" },
] as const;

function formatSeconds(ms: number): string {
  return `${String(ms / 1000).replace(".", ",")} s`;
}

export function StepDialog({ onClose }: { onClose: () => void }) {
  const keyframe = useEditor(selectKeyframe);
  const count = useEditor((state) => selectKeyframes(state).length);
  const stepIndex = useEditor((state) => state.stepIndex);
  const editor = useEditor.getState();

  return (
    <Modal
      title={t("board.stepTitle", { step: stepIndex + 1 })}
      onClose={onClose}
    >
      <label className={formStyles.field}>
        {t("board.duration")}
        <select
          className={formStyles.input}
          value={keyframe.durationMs}
          onChange={(event) => {
            const durationMs = Number(event.target.value);
            editor.edit((current) => ({ ...current, durationMs }));
          }}
        >
          {[...new Set([...DURATIONS_MS, keyframe.durationMs])]
            .sort((a, b) => a - b)
            .map((ms) => (
              <option key={ms} value={ms}>
                {formatSeconds(ms)}
              </option>
            ))}
        </select>
      </label>
      <label className={formStyles.field}>
        {t("board.arc")}
        <select
          className={formStyles.input}
          value={keyframe.ball.arc ?? 0}
          onChange={(event) => {
            const arc = Number(event.target.value);
            editor.edit((current) => ({
              ...current,
              ball: { ...current.ball, arc },
            }));
          }}
        >
          {ARCS.map(({ value, label }) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>
      </label>
      <div className={formStyles.row}>
        <button
          type="button"
          className={formStyles.button}
          disabled={stepIndex === 0}
          onClick={() => editor.moveStep(-1)}
        >
          {t("board.moveEarlier")}
        </button>
        <button
          type="button"
          className={formStyles.button}
          disabled={stepIndex === count - 1}
          onClick={() => editor.moveStep(1)}
        >
          {t("board.moveLater")}
        </button>
      </div>
      <button
        type="button"
        className={formStyles.button}
        onClick={() => {
          editor.duplicateStep();
          onClose();
        }}
      >
        {t("board.duplicateStep")}
      </button>
      <button
        type="button"
        className={formStyles.danger}
        disabled={count === 1}
        onClick={() => {
          editor.deleteStep();
          onClose();
        }}
      >
        {t("board.deleteStep")}
      </button>
    </Modal>
  );
}

function fileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "scenario"}.json`;
}

function downloadScenario(scenario: Scenario) {
  const blob = new Blob([JSON.stringify(scenario, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName(scenario.title);
  link.click();
  URL.revokeObjectURL(url);
}

export function MenuDialog({
  onClose,
  onOpenLibrary,
}: {
  onClose: () => void;
  onOpenLibrary: () => void;
}) {
  const scenario = useEditor((state) => state.history.present);
  const snap = useEditor((state) => state.snap);
  const editor = useEditor.getState();
  const save = useLibraryStore((state) => state.save);
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [importError, setImportError] = useState(false);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStatus("");
    try {
      const result = scenarioSchema.safeParse(JSON.parse(await file.text()));
      setImportError(!result.success);
      if (result.success) {
        editor.open(result.data);
        onClose();
      }
    } catch {
      setImportError(true);
    }
  }

  return (
    <Modal title={t("board.menu")} onClose={onClose}>
      <label className={formStyles.field}>
        {t("board.name")}
        <input
          className={formStyles.input}
          value={scenario.title}
          maxLength={80}
          onChange={(event) => {
            const title = event.target.value;
            editor.editScenarioLive((current) => ({ ...current, title }));
          }}
        />
      </label>

      <div className={formStyles.row}>
        <button
          type="button"
          className={formStyles.primary}
          onClick={() => {
            editor.endGesture();
            save(useEditor.getState().history.present);
            setStatus(t("board.saved"));
          }}
        >
          {t("board.save")}
        </button>
        <button
          type="button"
          className={formStyles.button}
          onClick={onOpenLibrary}
        >
          {t("board.library")}
        </button>
      </div>
      <p className={styles.status} role="status">
        {status}
      </p>

      <h3 className={formStyles.sectionTitle}>{t("board.variants")}</h3>
      {scenario.variants?.map((variant) => (
        <div key={variant.id} className={styles.variantRow}>
          <input
            className={formStyles.input}
            aria-label={t("board.variantLabel")}
            maxLength={30}
            value={variant.label}
            onChange={(event) =>
              editor.renameVariant(variant.id, event.target.value)
            }
          />
          <button
            type="button"
            className={formStyles.danger}
            onClick={() => editor.removeVariant(variant.id)}
          >
            {t("board.delete")}
          </button>
        </div>
      ))}
      <button
        type="button"
        className={formStyles.button}
        onClick={editor.addVariant}
      >
        {t("board.addVariant")}
      </button>

      <h3 className={formStyles.sectionTitle}>{t("board.fieldSettings")}</h3>
      <label className={formStyles.check}>
        <input type="checkbox" checked={snap} onChange={editor.toggleSnap} />
        {t("board.snap")}
      </label>
      <button
        type="button"
        className={formStyles.button}
        onClick={editor.toggleFlipped}
      >
        {t("court.flip")}
      </button>

      <h3 className={formStyles.sectionTitle}>{t("board.file")}</h3>
      <div className={formStyles.row}>
        <button
          type="button"
          className={formStyles.button}
          onClick={() => downloadScenario(scenario)}
        >
          {t("board.export")}
        </button>
        <button
          type="button"
          className={formStyles.button}
          onClick={() => fileInput.current?.click()}
        >
          {t("board.import")}
        </button>
      </div>
      <input
        ref={fileInput}
        className={styles.hiddenFile}
        type="file"
        accept=".json,application/json"
        aria-label={t("board.import")}
        data-testid="import-file"
        onChange={(event) => void importFile(event)}
      />
      {importError ? (
        <p className={styles.problem} role="alert">
          {t("board.importError")}
        </p>
      ) : null}
      <button
        type="button"
        className={formStyles.button}
        onClick={() => {
          editor.open(newScenario(t("board.defaultTitle")));
          onClose();
        }}
      >
        {t("board.new")}
      </button>
    </Modal>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function LibraryDialog({ onClose }: { onClose: () => void }) {
  const entries = useLibraryStore((state) => state.entries);
  const remove = useLibraryStore((state) => state.remove);

  return (
    <Modal title={t("board.library")} onClose={onClose}>
      {entries.length === 0 ? (
        <p className={styles.empty}>{t("board.libraryEmpty")}</p>
      ) : (
        <ul className={styles.library}>
          {entries.map(({ scenario, savedAt }) => (
            <li key={scenario.id} className={styles.entry}>
              <div className={styles.entryText}>
                <strong>{scenario.title}</strong>
                <span className={styles.date}>{formatDate(savedAt)}</span>
              </div>
              <div className={formStyles.row}>
                <button
                  type="button"
                  className={formStyles.primary}
                  aria-label={t("board.openNamed", { title: scenario.title })}
                  onClick={() => {
                    useEditor.getState().open(scenario);
                    onClose();
                  }}
                >
                  {t("board.open")}
                </button>
                <button
                  type="button"
                  className={formStyles.danger}
                  aria-label={t("board.deleteNamed", { title: scenario.title })}
                  onClick={() => remove(scenario.id)}
                >
                  {t("board.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
