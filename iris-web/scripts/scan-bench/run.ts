import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { report } from "./report";
import { runScan, type ScanRun } from "./session";

const args = process.argv.slice(2);
const opt = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};

async function main() {
  if (args[0] === "--worker") {
    const from = Number(args[1]);
    const to = Number(args[2]);
    for (let seed = from; seed < to; seed++)
      process.stdout.write(JSON.stringify(runScan(seed)) + "\n");
  } else {
    const n = opt("n", 300);
    const first = opt("seed", 1);
    const workers = Math.max(
      1,
      Math.min(
        n,
        opt(
          "workers",
          Math.max(1, (await import("node:os")).cpus().length - 2),
        ),
      ),
    );
    const outIdx = args.indexOf("--out");
    const here = fileURLToPath(import.meta.url);
    const alias = pathToFileURL(
      path.join(path.dirname(here), "alias.mjs"),
    ).href;
    const started = Date.now();
    const chunks = Array.from({ length: workers }, (_, w) => [
      first + Math.floor((n * w) / workers),
      first + Math.floor((n * (w + 1)) / workers),
    ]);
    const runs: ScanRun[] = [];
    await Promise.all(
      chunks.map(
        ([from, to]) =>
          new Promise<void>((resolve, reject) => {
            const child = spawn(
              process.execPath,
              [
                "--no-warnings",
                "--import",
                alias,
                here,
                "--worker",
                String(from),
                String(to),
              ],
              { stdio: ["ignore", "pipe", "inherit"] },
            );
            let buf = "";
            child.stdout.on("data", (d) => {
              buf += d;
              let nl;
              while ((nl = buf.indexOf("\n")) >= 0) {
                runs.push(JSON.parse(buf.slice(0, nl)));
                buf = buf.slice(nl + 1);
              }
            });
            child.on("exit", (code) =>
              code === 0
                ? resolve()
                : reject(new Error(`worker ${from}-${to} exited with ${code}`)),
            );
          }),
      ),
    );
    runs.sort((a, b) => a.seed - b.seed);
    if (outIdx >= 0)
      writeFileSync(
        args[outIdx + 1],
        runs.map((r) => JSON.stringify(r)).join("\n") + "\n",
      );
    console.log(report(runs, (Date.now() - started) / 1000));
  }
}

await main();
