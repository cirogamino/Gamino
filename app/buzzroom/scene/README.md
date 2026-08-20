# The Buzzroom — 3D office scene

`office-shell.html` is the page (HUD, roster, activity feed) and
`office-scene.js` is the whole 3D world: room, desks, characters, animated
monitor screens, and the job-routing animation. Everything is procedural
geometry — no models, no image files, nothing fetched at runtime.

## Build

Concatenate the shell, a global-scoped copy of three.js, and the scene:

```bash
npm install three
node -e "
const fs=require('fs');
const three=fs.readFileSync('node_modules/three/build/three.cjs','utf8');
fs.writeFileSync('buzzroom.html',
  fs.readFileSync('app/buzzroom/scene/office-shell.html','utf8') +
  '\n<script>(function(){var module={exports:{}};var exports=module.exports;' +
  three + ';window.THREE=module.exports;})();<\/script>\n<script>' +
  fs.readFileSync('app/buzzroom/scene/office-scene.js','utf8') + '<\/script>');
"
```

three.js is wrapped rather than imported because the published page loads no
external scripts. The CommonJS build is used because the minified ES module
build is split across two files that import each other.

## Live data

The cast comes from `../roster.ts`. Job routes are the `ROUTES` array in the
scene — swap `startJob()` for events off the bus in `../../../docs/buzzroom/PLAN.md`
and the room stops simulating and starts reporting.
