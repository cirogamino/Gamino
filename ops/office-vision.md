# THE OFFICE — V1 → V2 → V3

Three versions. Each one ships, stands alone, and is useful on its own. Nothing
in a later version requires throwing away an earlier one.

**The bar, in Ciro's words:** someone walks into the office, sees the screen, and
says *holy shit, he has real employees.* V3 is where that lands. V1 and V2 are
how you get there without guessing.

| | Headline | Costs | Status |
|---|---|---|---|
| **V1** | It **works** | Nothing | ✅ Shipped |
| **V2** | It's **real** | Nothing | Spec'd below |
| **V3** | It's **alive** | Generation credits | Spec'd below |

---

## LOCKED DECISIONS (apply to all three)

| Decision | Answer |
|---|---|
| Surfaces | All four — wall display, laptop, phone, on camera for the show |
| The people | Photoreal, pre-rendered |
| Camera | Fixed cinematic angles |
| Budget | Browser-only, no new spend |

### The architectural consequence

The fixed camera is what makes the whole thing affordable. A locked angle means
nothing ever has to hold up from a direction nobody will look from — which is how
film has always done it. That collapses this from a 3D problem into a video
compositing problem: no engine, no walkable geometry, no streaming bill, and one
build that serves the wall, the laptop, the phone, and the camera.

```
LAYER 4   Live HTML overlay — nameplates, status, run strip, drawer
LAYER 3   Live monitor surfaces — real HTML, perspective-mapped onto each screen
LAYER 2   Character clips — one looping video per seat per state, fixed position
LAYER 1   The plate — the empty office at this camera angle
```

Layers 1, 3 and 4 are V2 and cost nothing. Layer 2 is V3 and costs credits.

---

# V1 — IT WORKS ✅ shipped

`ops/office.html`

Isometric floor. War room at the far side for shared work, ten desks below for
own-lane work. Posture encodes state, monitors carry each seat's current
artifact, and clicking a station opens its screen, task, shipped history, and a
send-work box.

**What V1 exists to prove:** that the *data* is real before a single dollar or
credit goes into making it look good. A gorgeous office wired to nothing is a
screensaver. This is the unglamorous half, and skipping it is the most common way
this kind of project dies.

**What V1 establishes that V2 and V3 inherit unchanged:**

- The Report Block contract — `PLACE` (ROOM or DESK) and `ARTIFACT` (what is
  literally on the screen) — already live in all eleven seat prompts.
- The six states: `working`, `shipped`, `yellow`, `red`, `idle`, `nosignal`.
- Per-seat trust: **LIVE** (posts its own status) vs **RELAY** (only as current
  as its last relayed block, with the age shown).
- `board.json` as the single source every version reads.

**Honest limits.** Relayed seats are only as fresh as your last paste. It looks
like good software, not like a room.

---

# V2 — IT'S REAL

Two changes, both free, and together they are the biggest jump in the project.

## V2a — the live board

`GET /board` on the Worker, `POST /board/:seat` for wired seats. Any seat with
browsing fetches the board at the start of every response; Claude Code and the
browser agent POST directly.

This is the phase that removes you from the loop, and it is the one most likely
to get skipped because it isn't the fun part. **Do it first anyway.** Everything
V3 spends credits on is worthless if the underlying data is stale.

## V2b — the photoreal plate with live screens

A photoreal empty office at the locked camera angle. Real light, real glass,
reflections, ten desks, chairs pushed out, a coat over one back. **No rendered
people at all.**

Then the part that does the work: because the camera never moves, every monitor
occupies a fixed quadrilateral on screen forever. One CSS `matrix3d` per monitor
maps a **live HTML panel** into that quad. The screens show each seat's actual
current artifact, updating in real time, in correct perspective, inside otherwise
baked imagery.

**That is the detail that sells it.** A visitor watches a monitor change while
they are standing there. Nobody expects the screens to be real, which is exactly
why it lands. It is also the one effect a pre-rendered video can never fake.

**Why an empty office is not a consolation prize.** It reads as *the team just
stepped out* — and the hardest thing to fake is simply absent, so there is
nothing to catch. It is also, literally, the background layer V3 composites onto.
Building it is never wasted work, and it means V3 has a shipped fallback if the
character library disappoints.

**Done when:** the board serves live over HTTP, the plate is rendered at the
locked angle, all ten monitors are perspective-mapped and updating, and it holds
up on a wall display, a phone, and through a camera.

---

# V3 — IT'S ALIVE

The people, and the camera work.

## The people

Ten photoreal synthetic employees, composited onto the V2 plate at fixed
positions.

**Character sheets first, locked, one per seat, before a single clip is
generated.** The same ten faces every time or the illusion dies on second
viewing. This is the single highest-risk step and the one where rushing costs the
most.

**Clip library (~22):** ten seats × two states — `working` (leaning in, typing,
the occasional shift) and `idle` (back from the desk, phone out, feet up) — plus
two war-room group loops. Each 6–10 seconds and seamlessly looping.

**`nosignal` needs no asset.** Composite nothing: empty chair, dark screen. The
most important state is free, which is fitting, since it is the one that has to be
unmistakable.

## The camera work

Two or three angles with slow drift, cutting on events rather than on a timer:
hold on the floor, push into the war room when seats gather there, snap to a desk
that just went red. Motion driven by what is actually happening is the difference
between a room and a screensaver.

## The cost, stated plainly

**This is the only version that costs anything.** Photoreal humans have to be
generated, and generation costs money or credits — anyone claiming otherwise is
about to hand over stock footage of strangers, which fails on the second look.

The resolution: **spend credits, not dollars.** The generation tools already
connected to this account can produce the library. That is capacity already paid
for, not new spend. It needs exactly one decision from Ciro — how many credits
the character library is worth — and **nothing gets generated until that number
exists.**

If the answer is zero, V2 stands on its own indefinitely. That is a real option,
not a failure.

---

## THE RULE THAT SURVIVES ALL THREE VERSIONS

**Idle and no-signal never look the same.** Feet-up means the seat reported an
empty queue and wants work. An empty chair means it went quiet and nobody knows
why. As the visuals get more convincing this matters *more*, not less — a
photoreal office that renders silence as a relaxed employee is a very expensive
way to lie to yourself.

Believability is the goal. Accuracy is the constraint. When they conflict,
accuracy wins — the moment this shows something untrue it stops being an
instrument and becomes a prop.
