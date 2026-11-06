// Zet de `teVerifieren`-punten uit de lessen in content/TWIJFELGEVALLEN.md.
// Draai dit na het aanpassen van lessen: npm run twijfels
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const FOLDER = "src/content/nl/lessen";
const TARGET = "content/TWIJFELGEVALLEN.md";
const START = "<!-- begin automatische lijst -->";
const END = "<!-- einde automatische lijst -->";

const lessons = readdirSync(FOLDER)
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(`${FOLDER}/${file}`, "utf8")))
  .filter((lesson) => lesson.teVerifieren?.length)
  .sort((a, b) => a.order - b.order);

const list = lessons
  .map(({ order, scenario, teVerifieren }) =>
    [
      `### Les ${order}: ${scenario.title}`,
      "",
      ...teVerifieren.map((point) => `- TODO: verifiëren: ${point}`),
    ].join("\n"),
  )
  .join("\n\n");

const text = readFileSync(TARGET, "utf8");
const block = `${START}\n\n${list}\n\n${END}`;
const pattern = new RegExp(`${START}[\\s\\S]*${END}`);
writeFileSync(
  TARGET,
  pattern.test(text)
    ? text.replace(pattern, () => block)
    : `${text.trimEnd()}\n\n## Lessen 8 tot en met 19\n\nDeze lijst komt uit het veld \`teVerifieren\` in de lesbestanden. Pas de punten daar aan en draai \`npm run twijfels\`.\n\n${block}\n`,
);
console.log(
  `${lessons.reduce((sum, lesson) => sum + lesson.teVerifieren.length, 0)} punten uit ${lessons.length} lessen`,
);
