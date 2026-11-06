// Tijdelijke deploy: zet dist/ op de gh-pages-branch, totdat de Actions-workflow actief is.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const remote = "https://github.com/ronaldsteenkamp/tweeslag-tactiek.git";
const identity = [
  "-c",
  "user.name=ronaldsteenkamp",
  "-c",
  "user.email=336406225+ronaldsteenkamp@users.noreply.github.com",
];
const git = (...args) =>
  execFileSync("git", [...identity, ...args], {
    cwd: "dist",
    stdio: "inherit",
  });

writeFileSync("dist/.nojekyll", "");
git("init", "-q", "-b", "gh-pages");
git("add", "-A");
git("commit", "-q", "-m", "Deploy");
git("push", "-q", "--force", remote, "gh-pages");
