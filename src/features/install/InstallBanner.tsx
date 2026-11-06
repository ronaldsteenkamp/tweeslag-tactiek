import { useState } from "react";
import { t } from "../../i18n";
import { Modal } from "../ui/Modal";
import styles from "./InstallBanner.module.css";
import { useInstallStore } from "./installPrompt";

function InstallHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal title={t("install.helpTitle")} onClose={onClose}>
      <p className={styles.helpIntro}>{t("install.helpIntro")}</p>
      <div>
        <h3 className={styles.helpTitle}>{t("install.iphone")}</h3>
        <p className={styles.helpText}>{t("install.iphoneSteps")}</p>
      </div>
      <div>
        <h3 className={styles.helpTitle}>{t("install.android")}</h3>
        <p className={styles.helpText}>{t("install.androidSteps")}</p>
      </div>
      <div>
        <h3 className={styles.helpTitle}>{t("install.computer")}</h3>
        <p className={styles.helpText}>{t("install.computerSteps")}</p>
      </div>
    </Modal>
  );
}

export function InstallBanner() {
  const installed = useInstallStore((state) => state.installed);
  const install = useInstallStore((state) => state.install);
  const [showHelp, setShowHelp] = useState(false);

  if (installed) return null;

  return (
    <div className={styles.banner}>
      <p className={styles.text}>
        <strong>{t("install.title")}</strong> {t("install.text")}
      </p>
      <button
        type="button"
        className={styles.button}
        onClick={() => {
          void install().then((handled) => {
            if (!handled) setShowHelp(true);
          });
        }}
      >
        {t("install.button")}
      </button>
      {showHelp ? <InstallHelp onClose={() => setShowHelp(false)} /> : null}
    </div>
  );
}
