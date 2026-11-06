import { rules } from "../../content";
import { t } from "../../i18n";
import { RichText } from "../lessons/RichText";
import styles from "./RulesPage.module.css";

export function RulesPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>{t("rules.heading")}</h1>
      <p className={styles.intro}>{t("rules.intro")}</p>
      {rules.sections.map((section) => (
        <section key={section.title}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          <ul className={styles.list}>
            {section.items.map((item) => (
              <li key={item.text}>
                <RichText source={item.text} />
                {item.rule ? (
                  <span className={styles.rule}>
                    {t("rules.reference", { rule: item.rule })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className={styles.source}>
        {t("rules.source")}{" "}
        <a href={rules.sourceUrl} rel="noreferrer">
          {rules.sourceName}
        </a>
      </p>
    </div>
  );
}
