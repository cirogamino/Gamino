/* The Buzzroom — a 3D office you can look at.
   Procedural geometry only: no models, no textures loaded, nothing external. */

const T = window.THREE;

const CAST = [
  { id:"vera",       name:"VERA",   role:"Reception — answers the phone, takes the order", color:0x4fb3a9, screen:"calls"   },
  { id:"sol",        name:"SOL",    role:"Dispatch — routes every job to the right desk",  color:0x3f7d4f, screen:"routing" },
  { id:"marco",      name:"MARCO",  role:"Sales — quotes, follow-ups, closes",             color:0x26406e, screen:"pipeline"},
  { id:"nyla",       name:"NYLA",   role:"Video — cuts, renders, publishes",               color:0xc4571f, screen:"timeline"},
  { id:"kai",        name:"KAI",    role:"Design — images, layouts, thumbnails",           color:0xd6a32e, screen:"canvas"  },
  { id:"rio",        name:"RIO",    role:"Marketing — posts, captions, scheduling",        color:0xe2705c, screen:"social"  },
  { id:"penny",      name:"PENNY",  role:"Finance — invoices, payments, reconciliation",   color:0x7c4a72, screen:"ledger"  },
  { id:"atlas",      name:"ATLAS",  role:"Research — pulls data, checks facts, briefs",    color:0x4a6285, screen:"docs"    },
  { id:"ciro",       name:"CIRO",   role:"The boss. The only human in the building.",      color:0x9a9a9a, screen:"boss", human:true },
];

const SKIN = [0xf1c9a5, 0xe0ac86, 0xc68863, 0x8d5524, 0xf5d5b8, 0xa9714b, 0xd9a066, 0x704214, 0xe8b98d];
const HAIR = [0x2b1b12, 0x4a2c1a, 0x111111, 0x6b4423, 0x8d6a3f, 0x1c1c1c, 0x3b2314, 0x555555, 0x2a2a2a];

const scene = new T.Scene();
scene.background = new T.Color(0x0e0f12);
scene.fog = new T.Fog(0x0e0f12, 34, 62);

const camera = new T.PerspectiveCamera(42, innerWidth/innerHeight, 0.1, 200);
const renderer = new T.WebGLRenderer({ antialias:true, canvas: document.getElementById("stage") });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;

/* ── camera orbit ─────────────────────────────────────────────────────── */
const orbit = { theta: 0, phi: 0.90, radius: 16.5, target: new T.Vector3(0, 2.15, -2.0) };
function applyCamera() {
  orbit.phi = Math.max(0.25, Math.min(1.45, orbit.phi));
  orbit.radius = Math.max(10, Math.min(44, orbit.radius));
  camera.position.set(
    orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
    orbit.target.y + orbit.radius * Math.cos(orbit.phi),
    orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta)
  );
  camera.lookAt(orbit.target);
}
let drag = null;
renderer.domElement.addEventListener("pointerdown", e => {
  drag = { x:e.clientX, y:e.clientY, t:orbit.theta, p:orbit.phi, moved:false };
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener("pointermove", e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
  orbit.theta = drag.t - dx * 0.006;
  orbit.phi = drag.p - dy * 0.005;
  applyCamera();
});
addEventListener("pointerup", () => { drag = null; });
renderer.domElement.addEventListener("wheel", e => {
  e.preventDefault();
  orbit.radius *= 1 + Math.sign(e.deltaY) * 0.09;
  applyCamera();
}, { passive:false });

/* ── lighting ─────────────────────────────────────────────────────────── */
scene.add(new T.HemisphereLight(0xbcd4ff, 0x3a2f22, 0.85));
const key = new T.DirectionalLight(0xffe6c4, 1.15);
key.position.set(9, 15, 8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -20; key.shadow.camera.right = 20;
key.shadow.camera.top = 20;   key.shadow.camera.bottom = -20;
key.shadow.camera.far = 50;
scene.add(key);
scene.add(new T.AmbientLight(0xffffff, 0.34));

/* ── materials ────────────────────────────────────────────────────────── */
const M = {
  floor:  new T.MeshStandardMaterial({ color:0x6b4a30, roughness:0.85 }),
  rug:    new T.MeshStandardMaterial({ color:0x2f3b45, roughness:0.95 }),
  wall:   new T.MeshStandardMaterial({ color:0x2b2622, roughness:0.95, side:T.DoubleSide }),
  brick:  new T.MeshStandardMaterial({ color:0x8a5740, roughness:1 }),
  wood:   new T.MeshStandardMaterial({ color:0xa97f52, roughness:0.6 }),
  darkw:  new T.MeshStandardMaterial({ color:0x3a2f26, roughness:0.7 }),
  metal:  new T.MeshStandardMaterial({ color:0x9aa0a6, roughness:0.35, metalness:0.7 }),
  black:  new T.MeshStandardMaterial({ color:0x16181c, roughness:0.5 }),
  glass:  new T.MeshStandardMaterial({ color:0x9fd8e8, transparent:true, opacity:0.14, roughness:0.05 }),
  plant:  new T.MeshStandardMaterial({ color:0x2f6b3a, roughness:0.9 }),
  pot:    new T.MeshStandardMaterial({ color:0x8c5a3c, roughness:0.9 }),
  paper:  new T.MeshStandardMaterial({ color:0xf3efe6, roughness:0.9 }),
};

/* ── room ─────────────────────────────────────────────────────────────── */
const room = new T.Group(); scene.add(room);

const floor = new T.Mesh(new T.BoxGeometry(30, 0.4, 24), M.floor);
floor.position.y = -0.2; floor.receiveShadow = true; room.add(floor);

const rug = new T.Mesh(new T.BoxGeometry(12, 0.06, 7.5), M.rug);
rug.position.set(0, 0.03, -1.4); rug.receiveShadow = true; room.add(rug);

function wall(w, h, x, y, z, ry, mat) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, 0.3), mat);
  m.position.set(x, y, z); m.rotation.y = ry;
  m.receiveShadow = true; room.add(m); return m;
}
wall(30, 8, 0, 4, -12, 0, M.brick);
wall(24, 8, -15, 4, 0, Math.PI/2, M.wall);
wall(24, 8, 15, 4, 0, Math.PI/2, M.wall);

// Windows punched into the back wall, glowing with warm afternoon light.
const winMat = new T.MeshStandardMaterial({ color:0xffe3bd, emissive:0xffc98a, emissiveIntensity:0.75 });
for (let i = -1; i <= 1; i++) {
  const w = new T.Mesh(new T.BoxGeometry(5.4, 3.6, 0.18), winMat);
  w.position.set(i * 8.6, 4.6, -11.83); room.add(w);
  const frame = new T.Mesh(new T.BoxGeometry(5.8, 4, 0.1), M.darkw);
  frame.position.set(i * 8.6, 4.6, -11.9); room.add(frame);
  const glow = new T.PointLight(0xffcf95, 0.5, 22); glow.position.set(i*8.6, 4.4, -9.5); room.add(glow);
}

// Wall TV — where finished work shows up.
const tvScreen = makeScreenCanvas("tv");
const tv = new T.Mesh(new T.BoxGeometry(7.2, 4.1, 0.2),
  new T.MeshStandardMaterial({ map: tvScreen.tex, emissive:0xffffff, emissiveMap: tvScreen.tex, emissiveIntensity:0.8 }));
tv.position.set(0, 3.75, -11.7); room.add(tv);
const tvBezel = new T.Mesh(new T.BoxGeometry(7.6, 4.5, 0.12), M.black);
tvBezel.position.set(0, 3.75, -11.78); room.add(tvBezel);

// Glass meeting room, back-right.
(function meetingRoom(){
  const g = new T.Group(); g.position.set(10.6, 0, -7.6); room.add(g);
  const a = new T.Mesh(new T.BoxGeometry(8, 5.4, 0.1), M.glass); a.position.set(0, 2.7, 3.4); g.add(a);
  const b = new T.Mesh(new T.BoxGeometry(0.1, 5.4, 7), M.glass); b.position.set(-3.9, 2.7, 0); g.add(b);
  const table = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 0.16, 24), M.wood);
  table.position.set(0, 1.05, 0); table.castShadow = true; g.add(table);
  const leg = new T.Mesh(new T.CylinderGeometry(0.16, 0.24, 1, 12), M.metal);
  leg.position.set(0, 0.5, 0); g.add(leg);
  for (let i = 0; i < 5; i++) {
    const a2 = (i/5) * Math.PI * 2;
    g.add(chair(Math.cos(a2)*2.4, 0, Math.sin(a2)*2.4, -a2 + Math.PI/2));
  }
})();

function plant(x, z, s = 1) {
  const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  const p = new T.Mesh(new T.CylinderGeometry(0.42, 0.32, 0.7, 12), M.pot);
  p.position.y = 0.35; p.castShadow = true; g.add(p);
  for (let i = 0; i < 7; i++) {
    const l = new T.Mesh(new T.SphereGeometry(0.42, 8, 6), M.plant);
    l.position.set((Math.random()-0.5)*0.8, 0.9 + Math.random()*0.9, (Math.random()-0.5)*0.8);
    l.scale.set(1, 1.5, 0.6); l.rotation.y = Math.random()*Math.PI;
    l.castShadow = true; g.add(l);
  }
  room.add(g); return g;
}
plant(-13, -9.5, 1.3); plant(13.3, 6.5, 1.1); plant(-13, 7, 1.2);

function chair(x, y, z, ry) {
  const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry;
  const seat = new T.Mesh(new T.BoxGeometry(0.95, 0.14, 0.9), M.black);
  seat.position.y = 0.62; seat.castShadow = true; g.add(seat);
  const back = new T.Mesh(new T.BoxGeometry(0.95, 1.05, 0.14), M.black);
  back.position.set(0, 1.16, -0.42); back.castShadow = true; g.add(back);
  const post = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.6, 10), M.metal);
  post.position.y = 0.32; g.add(post);
  const base = new T.Mesh(new T.CylinderGeometry(0.52, 0.52, 0.08, 14), M.metal);
  base.position.y = 0.05; g.add(base);
  return g;
}

/* ── animated monitor screens ─────────────────────────────────────────── */
function makeScreenCanvas(kind) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 160;
  const ctx = c.getContext("2d");
  const tex = new T.CanvasTexture(c);
  return { c, ctx, tex, kind, seed: Math.random() * 100 };
}

function drawScreen(s, t, color) {
  const { ctx, c } = s;
  const hex = "#" + color.toString(16).padStart(6, "0");
  ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = hex; ctx.globalAlpha = 0.16; ctx.fillRect(0, 0, c.width, 18); ctx.globalAlpha = 1;
  ctx.fillStyle = hex; ctx.fillRect(8, 5, 40, 8);

  const k = s.kind, T0 = t + s.seed;
  if (k === "calls" || k === "pipeline" || k === "social") {
    for (let i = 0; i < 5; i++) {
      const y = 30 + i * 24, w = 90 + Math.sin(T0 * 0.9 + i) * 55 + 60;
      ctx.fillStyle = "#1c2430"; ctx.fillRect(10, y, 236, 18);
      ctx.fillStyle = hex; ctx.globalAlpha = 0.75; ctx.fillRect(10, y, Math.max(24, w), 18); ctx.globalAlpha = 1;
    }
  } else if (k === "routing" || k === "boss") {
    for (let i = 0; i < 6; i++) {
      const x = 24 + (i % 3) * 84, y = 34 + Math.floor(i / 3) * 56;
      ctx.fillStyle = "#1c2430"; ctx.fillRect(x, y, 62, 40);
      const on = (Math.sin(T0 * 1.4 + i * 1.7) > 0.2);
      ctx.fillStyle = on ? hex : "#2a3442"; ctx.fillRect(x + 5, y + 5, 52, 8);
      ctx.fillStyle = "#2a3442"; ctx.fillRect(x + 5, y + 19, 40, 5);
      ctx.fillRect(x + 5, y + 29, 30, 5);
    }
  } else if (k === "timeline") {
    for (let i = 0; i < 4; i++) {
      const y = 34 + i * 30;
      ctx.fillStyle = "#161d26"; ctx.fillRect(10, y, 236, 22);
      for (let j = 0; j < 6; j++) {
        const w = 20 + ((i * 7 + j * 13) % 30);
        const x = 12 + j * 40 + Math.sin(T0 * 0.5 + i) * 6;
        ctx.fillStyle = j % 2 ? hex : "#3d4b5c";
        ctx.fillRect(x, y + 3, w, 16);
      }
    }
    const px = 12 + ((T0 * 34) % 232);
    ctx.fillStyle = "#fff"; ctx.fillRect(px, 28, 2, 120);
  } else if (k === "canvas") {
    for (let i = 0; i < 9; i++) {
      const x = 18 + (i % 3) * 78, y = 32 + Math.floor(i / 3) * 40;
      ctx.fillStyle = i === Math.floor(T0 * 1.1) % 9 ? hex : "#232c38";
      ctx.fillRect(x, y, 64, 30);
    }
  } else if (k === "ledger" || k === "docs") {
    for (let i = 0; i < 7; i++) {
      const y = 28 + i * 17;
      ctx.fillStyle = "#232c38"; ctx.fillRect(12, y, 150, 9);
      ctx.fillStyle = hex; ctx.globalAlpha = 0.8;
      ctx.fillRect(178, y, 60 * (0.4 + 0.6 * Math.abs(Math.sin(T0 * 0.6 + i))), 9);
      ctx.globalAlpha = 1;
    }
  } else if (k === "tv") {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const x = 8 + (i % 4) * 62, y = 26 + Math.floor(i / 4) * 66;
      const live = ((T0 * 0.5 + i * 0.7) % n) < 1.4;
      ctx.fillStyle = live ? "#e2705c" : "#1c2430";
      ctx.fillRect(x, y, 56, 58);
      ctx.fillStyle = "#0d1117"; ctx.fillRect(x + 6, y + 6, 44, 32);
      ctx.fillStyle = live ? "#fff" : "#3d4b5c"; ctx.fillRect(x + 6, y + 44, 34, 6);
    }
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px system-ui";
    ctx.fillText("SHIPPED TODAY", 10, 16);
  }
  s.tex.needsUpdate = true;
}

/* ── name plate sprites ───────────────────────────────────────────────── */
function nameSprite(text, color) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(10,12,16,0.82)";
  ctx.beginPath(); ctx.roundRect(6, 26, 500, 76, 16); ctx.fill();
  ctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
  ctx.beginPath(); ctx.roundRect(22, 50, 28, 28, 6); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = "bold 44px system-ui"; ctx.textBaseline = "middle";
  ctx.fillText(text, 66, 66);
  const tex = new T.CanvasTexture(c);
  const sp = new T.Sprite(new T.SpriteMaterial({ map:tex, transparent:true, depthTest:false }));
  sp.scale.set(2.6, 0.65, 1);
  return sp;
}

/* ── a person ─────────────────────────────────────────────────────────── */
function person(shirt, skin, hair, human) {
  const g = new T.Group();
  const shirtMat = new T.MeshStandardMaterial({ color:shirt, roughness:0.75 });
  const skinMat  = new T.MeshStandardMaterial({ color:skin,  roughness:0.65 });
  const hairMat  = new T.MeshStandardMaterial({ color:hair,  roughness:0.85 });
  const pantMat  = new T.MeshStandardMaterial({ color: human ? 0x2b3a4a : 0x23272e, roughness:0.85 });

  const hips = new T.Mesh(new T.BoxGeometry(0.52, 0.34, 0.36), pantMat);
  hips.position.y = 0.78; hips.castShadow = true; g.add(hips);

  const torso = new T.Mesh(new T.CapsuleGeometry(0.27, 0.42, 4, 12), shirtMat);
  torso.position.y = 1.24; torso.castShadow = true; g.add(torso);

  const head = new T.Mesh(new T.SphereGeometry(0.235, 20, 16), skinMat);
  head.position.y = 1.78; head.castShadow = true; g.add(head);

  const hairMesh = new T.Mesh(new T.SphereGeometry(0.25, 18, 14, 0, Math.PI*2, 0, Math.PI*0.62), hairMat);
  hairMesh.position.y = 1.80; g.add(hairMesh);

  const arms = [];
  for (const side of [-1, 1]) {
    const a = new T.Mesh(new T.CapsuleGeometry(0.085, 0.44, 4, 8), shirtMat);
    a.position.set(side * 0.33, 1.24, 0.06);
    a.rotation.x = -0.5; a.castShadow = true; g.add(a); arms.push(a);
  }
  const legs = [];
  for (const side of [-1, 1]) {
    const l = new T.Mesh(new T.CapsuleGeometry(0.105, 0.44, 4, 8), pantMat);
    l.position.set(side * 0.15, 0.42, 0); l.castShadow = true; g.add(l); legs.push(l);
  }
  g.userData = { head, torso, arms, legs };
  return g;
}

/* ── a workstation ────────────────────────────────────────────────────── */
const stations = [];
const N = CAST.length;

CAST.forEach((agent, i) => {
  // Horseshoe opening toward the camera.
  const spread = 2.95;
  const a = -spread/2 + (i / (N - 1)) * spread;
  const R = 6.8;
  const x = Math.sin(a) * R, z = -Math.cos(a) * R + 1.1;

  const g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = a;
  room.add(g);

  const desk = new T.Mesh(new T.BoxGeometry(2.5, 0.12, 1.35), M.wood);
  desk.position.y = 1.08; desk.castShadow = true; desk.receiveShadow = true; g.add(desk);
  for (const sx of [-1.08, 1.08]) {
    const leg = new T.Mesh(new T.BoxGeometry(0.12, 1.08, 1.2), M.darkw);
    leg.position.set(sx, 0.54, 0); leg.castShadow = true; g.add(leg);
  }

  const scr = makeScreenCanvas(agent.screen);
  const mon = new T.Mesh(new T.BoxGeometry(1.42, 0.86, 0.06),
    new T.MeshStandardMaterial({ map:scr.tex, emissive:0xffffff, emissiveMap:scr.tex, emissiveIntensity:0.95 }));
  mon.position.set(0, 1.72, -0.42); g.add(mon);
  const monBack = new T.Mesh(new T.BoxGeometry(1.5, 0.94, 0.07), M.black);
  monBack.position.set(0, 1.72, -0.47); g.add(monBack);
  const stand = new T.Mesh(new T.BoxGeometry(0.16, 0.4, 0.14), M.black);
  stand.position.set(0, 1.34, -0.44); g.add(stand);

  const kb = new T.Mesh(new T.BoxGeometry(0.9, 0.04, 0.3), M.black);
  kb.position.set(0, 1.16, 0.18); g.add(kb);

  // Screen glow tints the desk — this is what makes a busy desk read.
  const glow = new T.PointLight(agent.color, 0.0, 5.5);
  glow.position.set(0, 1.6, 0.1); g.add(glow);

  // Desk lamp: off when idle, on when working.
  const lampMat = new T.MeshStandardMaterial({ color:0xffdca8, emissive:0xffc46b, emissiveIntensity:0 });
  const lamp = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), lampMat);
  lamp.position.set(-1.0, 1.34, -0.1); g.add(lamp);

  // Out-tray: finished work stacks up here through the day.
  const tray = new T.Group(); tray.position.set(0.98, 1.15, 0.24); g.add(tray);

  const ch = chair(0, 0, 1.15, Math.PI); g.add(ch);

  const p = person(agent.color, SKIN[i % SKIN.length], HAIR[i % HAIR.length], agent.human);
  p.position.set(0, 0.28, 1.05);
  g.add(p);

  const label = nameSprite(agent.name, agent.color);
  label.position.set(0, 2.75, 0);
  g.add(label);

  stations.push({
    agent, group:g, screen:scr, glow, lampMat, person:p, tray, desk,
    world: new T.Vector3(x, 0, z),
    busy: false, busyUntil: 0, done: 0, phase: Math.random() * 10,
  });
});

/* ── the job: a glowing folder that physically moves between desks ────── */
const folderGeo = new T.BoxGeometry(0.42, 0.06, 0.32);
function makeFolder(color) {
  const m = new T.Mesh(folderGeo, new T.MeshStandardMaterial({
    color, emissive:color, emissiveIntensity:0.75, roughness:0.6 }));
  m.castShadow = true;
  return m;
}

const jobs = [];
let jobSeq = 0;

function deskPoint(st) {
  return new T.Vector3(st.world.x, 1.28, st.world.z).add(
    new T.Vector3(Math.sin(st.group.rotation.y), 0, Math.cos(st.group.rotation.y)).multiplyScalar(0.5));
}

const ROUTES = [
  { label:"Inbound call → quote → invoice",   path:["vera","sol","marco","penny"] },
  { label:"Video request → cut → publish",    path:["vera","sol","nyla","rio"]    },
  { label:"Design ask → artwork → post",      path:["vera","sol","kai","rio"]     },
  { label:"Research brief → data → summary",  path:["vera","sol","atlas","ciro"]  },
];

function startJob(routeIndex) {
  const route = ROUTES[routeIndex ?? Math.floor(Math.random() * ROUTES.length)];
  const hops = route.path.map(id => stations.find(s => s.agent.id === id)).filter(Boolean);
  if (hops.length < 2) return;
  const color = hops[0].agent.color;
  const mesh = makeFolder(color);
  mesh.position.copy(deskPoint(hops[0]));
  room.add(mesh);
  const job = { id: ++jobSeq, label:route.label, hops, i:0, t:0, mesh, dwell:1.1, state:"work" };
  jobs.push(job);
  hops[0].busy = true;
  logLine(`Job #${job.id} — ${route.label}`, hops[0].agent);
  return job;
}

function updateJobs(dt) {
  for (let k = jobs.length - 1; k >= 0; k--) {
    const j = jobs[k];
    const from = j.hops[j.i];
    if (j.state === "work") {
      j.t += dt;
      from.busy = true;
      j.mesh.position.copy(deskPoint(from));
      j.mesh.position.y = 1.28 + Math.sin(j.t * 6) * 0.03;
      j.mesh.rotation.y += dt * 1.4;
      if (j.t >= j.dwell) {
        from.busy = false;
        j.i++;
        if (j.i >= j.hops.length) {
          // Delivered: it lands in the out-tray and the wall TV ticks over.
          const st = j.hops[j.hops.length - 1];
          st.done++;
          const sheet = new T.Mesh(new T.BoxGeometry(0.4, 0.03, 0.3), M.paper);
          sheet.position.y = st.done * 0.035; st.tray.add(sheet);
          room.remove(j.mesh);
          jobs.splice(k, 1);
          logLine(`Job #${j.id} — delivered`, st.agent, true);
          continue;
        }
        j.state = "move"; j.t = 0;
        j.a = deskPoint(j.hops[j.i - 1]);
        j.b = deskPoint(j.hops[j.i]);
      }
    } else {
      j.t += dt;
      const u = Math.min(1, j.t / 0.85);
      const e = u < 0.5 ? 2*u*u : -1 + (4 - 2*u) * u;
      j.mesh.position.lerpVectors(j.a, j.b, e);
      j.mesh.position.y = 1.28 + Math.sin(e * Math.PI) * 1.5;   // arcs over the floor
      j.mesh.rotation.y += dt * 5;
      if (u >= 1) { j.state = "work"; j.t = 0; j.dwell = 0.9 + Math.random() * 1.4; }
    }
  }
}

/* ── activity feed ────────────────────────────────────────────────────── */
const feed = document.getElementById("feed");
function logLine(text, agent, done) {
  const row = document.createElement("div");
  row.className = "ev" + (done ? " done" : "");
  row.innerHTML = `<span class="dot" style="background:#${agent.color.toString(16).padStart(6,"0")}"></span>
    <span class="who">${agent.name}</span><span class="what">${text}</span>`;
  feed.prepend(row);
  while (feed.children.length > 14) feed.lastChild.remove();
}

/* ── roster sidebar ───────────────────────────────────────────────────── */
const rosterEl = document.getElementById("roster");
rosterEl.innerHTML = stations.map((s, i) => `
  <button class="r" data-i="${i}">
    <span class="dot" style="background:#${s.agent.color.toString(16).padStart(6,"0")}"></span>
    <span class="rn">${s.agent.name}</span>
    <span class="rs" id="rs-${i}">idle</span>
  </button>`).join("");

rosterEl.addEventListener("click", e => {
  const b = e.target.closest(".r"); if (!b) return;
  focusStation(stations[+b.dataset.i]);
});

const panel = document.getElementById("panel");
function focusStation(st) {
  orbit.target.set(st.world.x * 0.55, 1.3, st.world.z * 0.55);
  orbit.radius = 13; orbit.phi = 1.02;
  orbit.theta = Math.atan2(st.world.x, st.world.z + 8);
  applyCamera();
  panel.style.display = "block";
  panel.innerHTML = `
    <button class="x" id="panel-x">✕</button>
    <div class="pn"><span class="dot" style="background:#${st.agent.color.toString(16).padStart(6,"0")}"></span>${st.agent.name}</div>
    <div class="pr">${st.agent.role}</div>
    <div class="pk"><span>Status</span><b>${st.busy ? "working" : "idle"}</b></div>
    <div class="pk"><span>Delivered today</span><b>${st.done}</b></div>`;
  document.getElementById("panel-x").onclick = () => { panel.style.display = "none"; };
}

// Click a desk in the scene.
const ray = new T.Raycaster(), ptr = new T.Vector2();
renderer.domElement.addEventListener("click", e => {
  if (drag && drag.moved) return;
  ptr.x = (e.clientX / innerWidth) * 2 - 1;
  ptr.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  for (const st of stations) {
    if (ray.intersectObject(st.group, true).length) { focusStation(st); return; }
  }
});

/* ── controls ─────────────────────────────────────────────────────────── */
document.getElementById("btn-job").onclick = () => startJob();
document.getElementById("btn-wide").onclick = () => {
  orbit.target.set(0, 2.15, -2.0); orbit.radius = 16.5; orbit.phi = 0.90; orbit.theta = 0;
  applyCamera(); panel.style.display = "none";
};
let auto = true;
const btnAuto = document.getElementById("btn-auto");
btnAuto.onclick = () => {
  auto = !auto;
  btnAuto.textContent = auto ? "Auto: on" : "Auto: off";
  btnAuto.classList.toggle("off", !auto);
};

/* ── loop ─────────────────────────────────────────────────────────────── */
let _last = performance.now(), _t0 = _last;
const clock = { getDelta(){ const n=performance.now(); const d=(n-_last)/1000; _last=n; return d; },
  getElapsedTime(){ return (performance.now()-_t0)/1000; } };
let nextJob = 2;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  if (auto) {
    nextJob -= dt;
    if (nextJob <= 0 && jobs.length < 4) { startJob(); nextJob = 3.5 + Math.random() * 4; }
  }
  updateJobs(dt);

  stations.forEach((st, i) => {
    drawScreen(st.screen, t, st.agent.color);

    const busy = st.busy;
    st.glow.intensity += ((busy ? 1.5 : 0.25) - st.glow.intensity) * dt * 4;
    st.lampMat.emissiveIntensity += ((busy ? 1.6 : 0) - st.lampMat.emissiveIntensity) * dt * 4;

    // Typing when busy, breathing when not.
    const u = st.person.userData;
    const speed = busy ? 13 : 2.2;
    const amp = busy ? 0.09 : 0.022;
    u.arms[0].rotation.x = -0.5 + Math.sin(t * speed + st.phase) * amp;
    u.arms[1].rotation.x = -0.5 + Math.sin(t * speed + st.phase + 1.6) * amp;
    u.torso.position.y = 1.24 + Math.sin(t * (busy ? 5 : 1.6) + st.phase) * (busy ? 0.012 : 0.02);
    u.head.position.y = 1.78 + Math.sin(t * (busy ? 5 : 1.6) + st.phase) * (busy ? 0.012 : 0.02);
    u.head.rotation.y = busy ? Math.sin(t * 0.7 + st.phase) * 0.12 : Math.sin(t * 0.35 + st.phase) * 0.5;

    const el = document.getElementById("rs-" + i);
    if (el) {
      const txt = busy ? "working" : "idle";
      if (el.textContent !== txt) { el.textContent = txt; el.className = "rs " + (busy ? "on" : ""); }
    }
  });

  drawScreen(tvScreen, t, 0xe2705c);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

applyCamera();
document.getElementById("loading").remove();
tick();
setTimeout(() => startJob(0), 600);
