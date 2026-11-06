import { useMemo, useState } from "react";
import { paths } from "../../app/router";
import { BASE_VARIANT, keyframesOf } from "../../domain/editing";
import { decodeScenario, type DecodeError } from "../../domain/share";
import type { Scenario } from "../../domain/schema";
import { t } from "../../i18n";
import type { MessageKey } from "../../i18n/nl";
import { useEditor } from "../board/editorStore";
import { useLibraryStore } from "../board/library";
import { ScenarioPlayer } from "../lessons/ScenarioPlayer";
import formStyles from "../ui/forms.module.css";
import styles from "./SharedPage.module.css";

const ERROR_MESSAGES: Record<DecodeError, MessageKey> = {
  corrupt: "shared.errorCorrupt",
  "too-large": "shared.errorTooLarge",
  version: "shared.errorVersion",
};

function SharedScenario({ scenario }: { scenario: Scenario }) {
  const saveCopy = useLibraryStore((state) => state.saveCopy);
  const [saved, setSaved] = useState(false);
  const [variantId, setVariantId] = useState(BASE_VARIANT);
  const variants = scenario.variants ?? [];

  function openOnBoard() {
    useEditor.getState().open(scenario);
    window.location.hash = paths.board;
  }

  const banner = (
    <div className={styles.banner}>
      <p className={styles.title} role="status">
        {t("shared.notice", { title: scenario.title })}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={formStyles.primary}
          disabled={saved}
          onClick={() => {
            saveCopy(scenario);
            setSaved(true);
          }}
        >
          {t(saved ? "shared.saved" : "shared.save")}
        </button>
        <button
          type="button"
          className={formStyles.button}
          onClick={openOnBoard}
        >
          {t("shared.open")}
        </button>
      </div>
      {variants.length > 0 ? (
        <div className={styles.variants} role="group">
          {[
            { id: BASE_VARIANT, label: t("board.baseVariant") },
            ...variants,
          ].map((variant) => (
            <button
              key={variant.id}
              type="button"
              className={formStyles.button}
              aria-pressed={variant.id === variantId}
              onClick={() => setVariantId(variant.id)}
            >
              {variant.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <ScenarioPlayer
      key={variantId}
      title={scenario.title}
      players={scenario.players}
      keyframes={keyframesOf(scenario, variantId)}
      banner={banner}
    />
  );
}

export function SharedPage({ data }: { data: string }) {
  const result = useMemo(() => decodeScenario(data), [data]);

  if (result.ok) return <SharedScenario scenario={result.scenario} />;

  return (
    <div className={styles.error}>
      <h1 className={styles.errorTitle}>{t("shared.errorTitle")}</h1>
      <p role="alert">{t(ERROR_MESSAGES[result.error])}</p>
      <a className={formStyles.primary} href={paths.lessons}>
        {t("player.backToLessons")}
      </a>
    </div>
  );
}
