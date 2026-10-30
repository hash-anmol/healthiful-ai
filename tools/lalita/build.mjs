// Builds two variants of the sadhana app plus the English vidhi document.
//   /tmp/lalita-artifact/lalita-sadhana.html  : single file for a claude.ai artifact (images inlined, three.js from cdnjs)
//   <repo>/public/lalita/* : files for the Healthiful app (images and three.js served locally)
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const root = path.dirname(fileURLToPath(import.meta.url));
const R = (p) => fs.readFileSync(path.join(root, p), "utf8");
const HEALTHIFUL = process.env.HEALTHIFUL_DIR || path.join(root, "../..");

const stepsSrc = R("src/steps.js").replace(/if \(typeof module[^\n]*\n?/, "");
const data = `const NAMES=${R("data/names.json")};\n${stepsSrc}`;
const shell = (assets, three) =>
  R("src/shell.html")
    .replace("/*__CSS__*/", () => R("src/app.css"))
    .replace("/*__ASSETS__*/", () => JSON.stringify(assets))
    .replace("/*__THREE__*/", () => three)
    .replace("/*__DATA__*/", () => data)
    .replace("/*__SCENE__*/", () => R("src/scene.js"))
    .replace("/*__APP__*/", () => R("src/app.js"));
const b64 = (f) => "data:image/jpeg;base64," + fs.readFileSync(path.join(root, "assets", f)).toString("base64");

const art = shell({ yantra: b64("yantra.jpg"), lalita: b64("lalita.jpg"), guru: b64("guru.jpg") }, '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>');
fs.mkdirSync("/tmp/lalita-artifact", { recursive: true });
fs.writeFileSync("/tmp/lalita-artifact/lalita-sadhana.html", art);
console.log("artifact", (art.length / 1024).toFixed(0) + "KB");

if (HEALTHIFUL) {
  const out = path.join(HEALTHIFUL, "public/lalita");
  fs.mkdirSync(out, { recursive: true });
  for (const f of ["yantra.jpg", "lalita.jpg", "guru.jpg", "three.min.js"]) fs.copyFileSync(path.join(root, "assets", f), path.join(out, f));
  // the page is served as a full HTML document inside an iframe
  const body = shell({ yantra: "/lalita/yantra.jpg", lalita: "/lalita/lalita.jpg", guru: "/lalita/guru.jpg" }, '<script src="/lalita/three.min.js"></script>');
  fs.writeFileSync(
    path.join(out, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#120b0e"><style>html,body{margin:0;height:100%;background:#120b0e;color-scheme:dark}[hidden]{display:none!important}</style></head><body>${body}</body></html>`
  );
  console.log("healthiful ->", out);
}

// English vidhi document
const { SECTIONS, STEPS, SAMAGRI, SANKALP } = require(path.join(root, "src/steps.js"));
const q = (s) => s.split("\n").map((l) => "> " + l).join("  \n");
const rom = (r) => q("*" + r.split("\n").join("*\n*") + "*");
let md = `# Shri Lalita Sahasranama Malamantra Japavidhi\n\n*Inspired by Shri Om Swami · श्रीललितासहस्रनाम मालामन्त्र जपविधि*\n\nAll 21 steps from the Hindi PDF (27 pages), in English. Mantras are kept in Sanskrit (Devanagari) exactly as written in the PDF, with a Roman transliteration beneath each. Pages 8 to 26 of the PDF hold the complete Sahasranama stotram (182 verses), which is recited in step 19 (Malamantra).\n\n## What you need\n\n${SAMAGRI.map(([a, b]) => `- **${a}**: ${b}`).join("\n")}\n`;
for (const [k, sec] of Object.entries(SECTIONS)) {
  md += `\n## ${sec.name} · ${sec.hi}\n\n*${sec.note}*\n`;
  for (const s of STEPS.filter((x) => x.sec === k)) {
    md += `\n### ${s.n}. ${s.t} (${s.th})${s.day1 ? ": Day 1 only" : ""}\n\n${s.do}\n\n`;
    for (const m of s.m || []) md += `${q(m.d)}\n>\n${rom(m.r)}\n${m.note ? `\n→ ${m.note}\n` : ""}\n`;
    for (const l of s.lines || []) md += `${l.k ? `**${l.k}**\n\n` : ""}${q(l.d)}\n>\n${rom(l.r)}\n${l.how ? `\n→ ${l.how}\n` : ""}\n`;
    if (s.mode === "sankalp") md += `${q(SANKALP.d({}))}\n\n**English:** ${SANKALP.r({})}\n\n`;
    if (s.end) md += `**Closing of the stotram**\n\n${q(s.end.d)}\n\n`;
    if (s.note) md += `*${s.note}*\n\n`;
    md += `**Bhaav (what to picture):** ${s.bhaav}\n`;
  }
}
md += `\n---\n\n**Notes**\n\n- The three Ganesha mudras of step 8 are in a photo on page 3 of the PDF. The photo is not clear enough to read, so they are not described.\n- Step 13 does not say how many times to chant "Hreem Aadhaarashaktyai Namah".\n- In steps 16 and 17 the way of touching fingers and body parts is added from the traditional method. The PDF gives only the mantras.\n- The offerings in step 18 (sandalwood paste, flowers at her feet, guggal incense, lit lamp, food offering) come from the handwritten notes in the PDF margin.\n- It ends with: श्री जगदम्बा अर्पणमस्तु । महागुरु श्री ओम स्वामी अर्पणमस्तु ॥\n\n**Image credits**\n\n- Sri Yantra: artwork by Daniel Conrad under the direction of Harish Johari (1974), public domain, via Wikimedia Commons.\n- Goddess Lalita Tripura Sundari: image by Ckvicky1992, CC BY-SA 4.0, via Wikimedia Commons.\n`;
fs.writeFileSync(path.join(root, "Lalita-Sahasranama-Vidhi.md"), md);
console.log("md", (md.length / 1024).toFixed(0) + "KB");
