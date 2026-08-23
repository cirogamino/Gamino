# The Buzzroom — a live 3D office you can watch your AIs work in

A room you can look at. Eight AI agents, each with a name, a shirt, a voice, a
desk, and a screen. When a job comes in, you watch it land on a desk, get
worked, and turn into something real on the wall. You can hit the intercom and
talk to the whole room, or walk up to one desk and talk to that agent.

This document is the plan behind the concept images in `concepts/`.

---

## 1. The one architectural decision that matters

**The room is not the system. The room is a window onto the system.**

Everything else follows from this. The agents do their work wherever they
already do it — n8n, a Worker, a queue, a phone line. As they work, they emit
small events to one shared bus. The 3D room subscribes to that bus and animates
what it hears. It has no opinion about how the work got done.

That separation buys three things:

- **The room can never break the business.** If the 3D view crashes, the orders
  still get taken. It is a spectator.
- **Anything can join the room later.** A new agent shows up in the office the
  moment it starts emitting events. No 3D work required to add a coworker.
- **The whole day is replayable.** Because the room is driven by an ordered
  event log, you can scrub it. More on why that's the killer feature in §7.

### So — is n8n the right tool for this?

Partly, and it's worth being precise about which part, because this is the
place where the project could go wrong.

**Yes for the engine.** n8n is a genuinely good fit for what you're already
planning with the phone company and the receptionist: a call comes in, a
webhook fires, the workflow routes it, calls a model, writes a record, sends a
reply. Keep that. The same n8n instance can drive every agent in the room.
Adding "and also POST this event to the Buzzroom" is one extra HTTP node at
each step you care about — maybe an hour of work across all eight agents.

**No for the visualization.** The n8n canvas is a *developer's* view: boxes and
wires, laid out for whoever built the workflow. It shows you the plumbing. What
you're describing is an *operator's* view — a room, with people in it, where
you understand what's happening because it looks like a place you've been. You
cannot get the second thing by decorating the first. n8n's canvas isn't
extensible into a 3D room, and trying would mean fighting the tool forever.

So: **n8n is the nervous system, the Buzzroom is the face.** Neither one is
trying to be the other. The contract between them is the event schema in §3,
which is about fifteen lines of JSON.

One more reason to keep them apart: not every agent will live in n8n forever.
Some will end up as Workers, some as long-running processes, some as a vendor's
API. If the room reads from n8n directly, every one of those migrations breaks
the room. If the room reads from an event bus, none of them do.

---

## 2. Stack

The repo is already a Remix app on Cloudflare Workers with KV. That is,
conveniently, most of what this needs.

| Layer | Choice | Why |
|---|---|---|
| Room rendering | React Three Fiber (Three.js in React) | Runs in the browser, no install, embeds in the existing Remix app as a route |
| Live transport | Cloudflare Durable Object + WebSockets | One DO instance *is* the room — it holds current state and fans out to every viewer. This is exactly the problem DOs exist for |
| Event ingest | Worker route `POST /api/buzz/event` | n8n and anything else POST here with a shared secret |
| History | D1 (or KV for the first pass) | Append-only event log. Powers replay and the daily recap |
| Artifacts | R2 | Where finished videos/images/PDFs live so the wall TV can show them |
| Voice | ElevenLabs Conversational AI, one agent per cast member | Already connected; each gets its own voice id |
| Characters | Full-body PNG cutouts, alpha-masked, billboarded in 3D | See §5 — this is the big cost saver |

Nothing here needs a server you have to babysit. It deploys with
`wrangler deploy` alongside what's already in the repo.

---

## 3. The event contract

This is the whole integration surface. If n8n can send these, the room works.

```jsonc
{
  "id": "evt_01H...",           // unique, for dedupe
  "ts": "2026-08-13T14:02:11Z",
  "jobId": "job_4471",          // the thing moving through the office
  "agentId": "vera",            // must match an id in app/buzzroom/roster.ts
  "type": "job.received",
  "label": "Inbound call — Ramirez roof quote",  // one line, shown on screen
  "to": "sol",                  // only on job.handoff
  "artifact": {                 // only on artifact.produced
    "kind": "video",            // video | image | doc | invoice
    "url": "https://r2.../final.mp4",
    "thumbUrl": "https://r2.../final.jpg"
  }
}
```

Event types, and what each one does to the room:

| `type` | What you see happen |
|---|---|
| `job.received` | A glowing folder appears on that agent's desk. Their lamp comes on. |
| `job.started` | Their monitor lights up; they lean into the screen |
| `job.handoff` | The folder physically slides across the floor to the `to` agent's desk |
| `artifact.produced` | The thing appears — on their monitor, then up on the wall TV |
| `job.completed` | Folder closes and drops into the out-tray. Soft chime |
| `job.failed` | Desk lamp goes amber. Folder sits there. Nothing else moves |
| `agent.speaking` | That character animates; a caption bubble shows what they said |
| `agent.status` | `idle` / `working` / `blocked` / `offline` — drives posture and lighting |

Deliberately small. Eight verbs cover everything an office does. Resist adding
more until a real need shows up, because every new type is new animation work.

---

## 4. Build phases

Each phase is independently useful and independently shippable. You can stop
after any one of them and still have something worth showing.

### Phase 0 — The Poster *(done today)*
The concept images. Locks art direction, cast, and shirt colors before anyone
writes rendering code. Deliverable: `concepts/` + `app/buzzroom/roster.ts`.

### Phase 1 — The Diorama *(~1 week)*
A real page at `/buzzroom`. The rendered room as a backplate, eight cutouts
placed in 3D space at their desk coordinates, name placards, hover to see the
role. Gentle camera drift so it breathes. **No live data yet.**

Why this first: it gets the *look* to 90% for a fraction of the effort of a
real 3D set, and it's the thing you can put on screen for the show immediately.

### Phase 2 — The Pulse *(~1 week)*
Durable Object goes in. n8n gets its extra HTTP node. Desks light up, folders
slide, status dots go green. **This is the moment it stops being a picture and
starts being a dashboard.** Start with one workflow wired up — the receptionist,
since you're building that anyway — and prove the loop end to end before wiring
the other seven.

### Phase 3 — The Wall *(~1 week)*
Artifacts become visible. A finished image textures onto the designer's monitor.
A finished video plays on the wall TV. An invoice stacks up on Penny's desk.
The out-tray fills through the day.

### Phase 4 — The Voice *(~1–2 weeks)*
Click a desk → a conversation opens with that agent, in that agent's voice.
The intercom button broadcasts to the room: everyone turns to camera, and you
get a round-robin standup. This is where it becomes something you *use* rather
than watch.

### Phase 5 — The Set *(ongoing)*
Swap the backplate for a true 3D room. Camera moves, depth of field, render
passes you can cut into episodes. Only worth doing once the first four phases
have proven the thing is worth the polish.

---

## 5. The cutouts — and the trap to avoid

You asked for full-body cutouts, and that instinct is exactly right — better
than it may look at first.

The obvious approach is rigged 3D characters. It is also the approach that
kills projects like this. Eight rigged, textured, animated humans is weeks of
work, thousands of dollars, and lands squarely in the uncanny valley, where
they look *worse* than a photo, not better.

**Cutouts sidestep all of it.** A photoreal full-body PNG with a clean alpha
edge, standing in a 3D room, reads as *more* real than a mid-budget 3D
character — the same trick paper-cutout animation and South Park have always
used. And they're cheap: regenerate one, drop in the file, done. Rename an
agent and reshoot in ten minutes.

The pipeline:
1. Generate the lineup render (done — concept image 2).
2. Split into eight, run background removal, save to `public/buzzroom/cutouts/`.
3. Place as billboarded planes at each desk's coordinates.
4. Add a soft contact shadow under each so they sit on the floor rather than
   float above it. This one detail does most of the work of selling it.

Later, if a character needs to actually move, generate 3–4 poses per agent
(seated / leaning in / turned to camera / standing) and cross-fade. Still
sprites, still cheap, reads as animation.

---

## 6. Reading the room without reading text

The thing that will make this feel alive rather than like a dashboard with a
3D skin: **status should be legible as physical facts**, not labels. A glance
should tell you the state of the business.

| What you see | What it means |
|---|---|
| Desk lamp off | Agent is idle |
| Monitor glowing, agent leaning in | Working |
| Stack of folders on the desk | Queue depth — a tall stack is a visible backlog |
| Lamp gone amber, agent still | Blocked or errored |
| Empty chair | Agent offline |
| Wall TV filling with thumbnails | Output accumulating through the day |
| Out-tray height | How much shipped today |

No numbers, no legend. You learn it in about four seconds and then you can read
the whole company from across a room. That is the actual product.

---

## 7. Ideas that make this notably better

Roughly in order of payoff per unit of work.

**The job is an object, not a line.** Glowing arrows between desks are the
obvious choice and they're forgettable. A physical folder that slides across
the floor, gets picked up, sits in a stack, and drops into an out-tray is
readable from twenty feet away and on a phone screen. It also makes backlog
visible for free — folders pile up. Do this instead of arrows.

**Time machine.** Because everything is an ordered event log, add a scrubber.
Replay the whole day at 60×. Tuesday becomes a 40-second time-lapse of an
office working, and *that clip is the show.* It is close to free once Phase 2
exists — it's the same renderer reading from D1 instead of the socket — and it
is the single highest-value idea in this document.

**Director cam.** An auto-cutting camera that pushes in on whichever agent just
started something, holds, then cuts wide. Turns the dashboard into a live
broadcast feed you could stream unattended for hours. Small amount of code,
disproportionate effect.

**Sound.** A phone ring at Vera's desk, a keyboard flurry when work starts, a
soft chime on completion, each agent with a distinct cue. Audio sells presence
harder than any visual, and you can hear the business working from the next
room with the screen off.

**Idle life.** When nothing is happening, an empty room reads as broken. Give
each agent small loops — leaning back, coffee, glancing at a neighbor. Ten
minutes of work that changes the entire impression.

**The morning standup.** Once a day the intercom fires, everyone turns to
camera, and each agent gives one line about their queue. Free content for the
show, and a genuinely useful daily briefing.

**Your desk.** A chair in the room that's yours. Sit in it and the camera goes
first person. Small thing, changes how it feels to open the tab.

**A visible clock and a whiteboard.** Wall clock on real time, whiteboard with
today's totals. Grounds the room in the present and stops it feeling like a
render.

---

## 8. Risks, honestly

- **Scope drift into a game engine.** The pull toward "real 3D characters, real
  physics, walk around" is strong and it's a year of work. Phases 1–4 stop
  short of it deliberately. The value is in the *live data*, not the fidelity.
- **Voice cost.** Eight always-on conversational agents is expensive and nobody
  needs it. Voice is on-demand: click a desk, or hit the intercom.
- **Event spam.** An agent that emits every internal step turns the room into a
  strobe. Emit at business milestones, not function calls. If it wouldn't be
  worth a coworker looking up, don't send it.
- **Name changes.** Names get baked into shirts and placards in the renders.
  `roster.ts` is the source of truth, but changing a name means regenerating
  images. Settle the cast before Phase 1.
- **Empty-room problem.** Early on there won't be much traffic and the room
  will look dead. Ship the replay scrubber early so there's always something to
  watch.

---

## 9. What happens next

1. You react to the concept images — cast names, shirt colors, room feel.
2. Lock `roster.ts`.
3. Cut the lineup into eight alpha cutouts.
4. Build Phase 1, the Diorama, at `/buzzroom`.
5. Wire the receptionist workflow as the first live agent in Phase 2, since
   that work is happening anyway.

The single most important thing to get right early is the event schema in §3.
Everything downstream — the room, the replay, the recap, the show — is a
consumer of it. Get eight verbs agreed on and the rest is just rendering.
