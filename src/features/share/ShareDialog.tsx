import { useEffect, useMemo, useState } from "react";
import { withNames } from "../../domain/editing";
import type { Scenario } from "../../domain/schema";
import { buildShareLink } from "../../domain/share";
import { t } from "../../i18n";
import { Modal } from "../ui/Modal";
import formStyles from "../ui/forms.module.css";
import styles from "./ShareDialog.module.css";

const QUIET_ZONE = 4;

function baseUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

interface QrMatrix {
  size: number;
  path: string;
}

/** De QR-bibliotheek wordt pas geladen als iemand echt wil delen. */
async function createQr(text: string): Promise<QrMatrix> {
  const { default: QRCode } = await import("qrcode");
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "L" });
  let path = "";
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      if (modules.get(row, column)) {
        path += `M${column + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
  }
  return { size: modules.size + QUIET_ZONE * 2, path };
}

function QrCode({ text }: { text: string }) {
  const [qr, setQr] = useState<{ text: string; matrix: QrMatrix } | null>(null);

  useEffect(() => {
    let current = true;
    void createQr(text).then((matrix) => {
      if (current) setQr({ text, matrix });
    });
    return () => {
      current = false;
    };
  }, [text]);

  if (qr?.text !== text) return <div className={styles.qrPlaceholder} />;

  return (
    <svg
      className={styles.qr}
      viewBox={`0 0 ${qr.matrix.size} ${qr.matrix.size}`}
      role="img"
      aria-label={t("share.qrLabel")}
      data-testid="qr-code"
      shapeRendering="crispEdges"
    >
      <rect width={qr.matrix.size} height={qr.matrix.size} fill="#fff" />
      <path d={qr.matrix.path} fill="#000" />
    </svg>
  );
}

interface ShareDialogProps {
  scenario: Scenario;
  onClose: () => void;
  /** Alleen op het tactiekbord: de naam aanpassen vlak voor het delen. */
  onRename?: (title: string) => void;
}

export function ShareDialog({ scenario, onClose, onRename }: ShareDialogProps) {
  const link = useMemo(
    () =>
      buildShareLink(
        withNames(
          scenario,
          t("board.defaultTitle"),
          t("board.variantFallback"),
        ),
        baseUrl(),
      ),
    [scenario],
  );
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      // Geen toegang tot het klembord: selecteer de link, dan kan kopiëren met de hand.
      document.querySelector<HTMLInputElement>("#share-url")?.select();
    }
  }

  return (
    <Modal title={t("share.title")} onClose={onClose}>
      {onRename ? (
        <label className={formStyles.field}>
          {t("board.name")}
          <input
            className={formStyles.input}
            value={scenario.title}
            maxLength={80}
            onChange={(event) => {
              setCopied(false);
              onRename(event.target.value);
            }}
          />
        </label>
      ) : null}

      {link.tooLarge ? (
        <p className={styles.problem} role="alert">
          {t("share.tooLarge")}
        </p>
      ) : (
        <>
          {link.fitsQr ? (
            <QrCode text={link.url} />
          ) : (
            <p className={styles.note}>{t("share.noQr")}</p>
          )}
          <label className={formStyles.field}>
            {t("share.link")}
            <input
              id="share-url"
              className={formStyles.input}
              value={link.url}
              readOnly
              data-testid="share-url"
              onFocus={(event) => event.target.select()}
            />
          </label>
          <button
            type="button"
            className={formStyles.primary}
            onClick={() => void copy()}
          >
            {t("share.copy")}
          </button>
          <p className={styles.status} role="status">
            {copied ? t("share.copied") : ""}
          </p>
        </>
      )}
    </Modal>
  );
}
