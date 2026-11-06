import { useEffect, useRef, type ReactNode } from "react";
import { t } from "../../i18n";
import styles from "./Modal.module.css";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Een native dialog regelt de focus, Escape en het blokkeren van de achtergrond. */
export function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="modal-title"
      onClose={onClose}
    >
      <div className={styles.header}>
        <h2 className={styles.title} id="modal-title">
          {title}
        </h2>
        <button type="button" className={styles.close} onClick={onClose}>
          {t("ui.close")}
        </button>
      </div>
      <div className={styles.body}>{children}</div>
    </dialog>
  );
}
