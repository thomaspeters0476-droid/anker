import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = resolve(root, "docs", "anker-onepager.html");
const pdf = resolve(root, "docs", "anker-onepager.pdf");

const candidates = [
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
  process.env["ProgramFiles"] && join(process.env["ProgramFiles"], "Google", "Chrome", "Application", "chrome.exe"),
  process.env["ProgramFiles(x86)"] && join(process.env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe"),
  process.env["ProgramFiles"] && join(process.env["ProgramFiles"], "Microsoft", "Edge", "Application", "msedge.exe"),
  process.env["ProgramFiles(x86)"] && join(process.env["ProgramFiles(x86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
].filter(Boolean);

const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.error("Chrome/Edge nicht gefunden. Öffne docs/anker-onepager.html und drucke als PDF.");
  process.exit(1);
}

const uri = "file:///" + html.replace(/\\/g, "/");
const r = spawnSync(
  browser,
  ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${pdf}`, uri],
  { encoding: "utf8" },
);
if (r.status !== 0) {
  console.error(r.stderr || r.stdout || "print failed");
  process.exit(r.status ?? 1);
}
console.log("wrote", pdf);
