# Lalita Sadhana source

Source for the standalone app served at `/lalita/index.html` (embedded by `app/dashboard/sadhana/lalita/page.tsx`).

- `src/steps.js`: the 21 steps (English instructions, Sanskrit mantras)
- `src/scene.js`: the 3D hut (three.js r128)
- `src/app.js`, `src/app.css`, `src/shell.html`: the app
- `data/names.json`: the 1000 names (Devanagari, Roman, meaning)
- `assets/`: Sri Yantra and Lalita images, three.js

Rebuild into `public/lalita/` with `node tools/lalita/build.mjs`. Image credits are listed in the app.
