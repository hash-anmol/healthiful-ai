// Builds the Nitya sadhana into the Healthiful app: HEALTHIFUL_DIR/public/nitya/*
// (images and three.js are served next to the page; the page runs full screen inside an iframe)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const root = path.dirname(fileURLToPath(import.meta.url));
const R = (p) => fs.readFileSync(path.join(root, p), "utf8");
const HEALTHIFUL = process.env.HEALTHIFUL_DIR || path.join(root, "../..");

const out = path.join(HEALTHIFUL, "public/nitya");
fs.mkdirSync(out, { recursive: true });
for (const f of ["yantra.jpg", "guru.jpg", "three.min.js"]) fs.copyFileSync(path.join(root, "assets", f), path.join(out, f));
// spoken guidance (made with generate_voice.py)
fs.mkdirSync(path.join(out, "voice"), { recursive: true });
for (const f of fs.readdirSync(path.join(root, "assets/voice")).filter((x) => x.endsWith(".mp3"))) fs.copyFileSync(path.join(root, "assets/voice", f), path.join(out, "voice", f));
const body = R("src/shell.html")
  .replace("/*__CSS__*/", () => R("src/app.css"))
  .replace("/*__ASSETS__*/", () => JSON.stringify({ yantra: "/nitya/yantra.jpg", guru: "/nitya/guru.jpg" }))
  .replace("/*__THREE__*/", () => '<script src="/nitya/three.min.js"></script>')
  .replace("/*__SCENE__*/", () => R("src/scene.js"))
  .replace("/*__APP__*/", () => R("src/app.js"));
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0a0d1e"></head><body>${body}</body></html>`
);
console.log("nitya ->", out, (body.length / 1024).toFixed(0) + "KB");
