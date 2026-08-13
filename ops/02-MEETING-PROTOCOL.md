# THE BOARDROOM — how to actually run the meeting

## The honest constraint

Ten separate chat windows cannot hear each other. There is no room, no raised
hands, no interruption. Any system that claims otherwise is either using an API
message bus behind the scenes or it is theater.

So the room is **written**, and the meeting is **turn-based**. You are not the
bottleneck in this design — you are the router, and you route exactly three
times. After Round 3 the team executes without you for the rest of the run.

What you lose: live interruption.
What you keep: independent proposals, real adversarial challenge, a scored
decision, a permanent record, and ten AIs executing in parallel.

What you gain over live chat, genuinely: seats can't anchor on whoever spoke
first. In Round 1 nobody sees anyone else's answer, which is a better idea-
generation protocol than a real meeting, not a worse one.

---

## Setup (once)

1. Open one chat per AI. Name each chat after its seat: `GAMINO — PRODUCT`, etc.
2. Paste that seat's file from `ops/prompts/` as the **first message**. Where the
   AI supports persistent instructions (Custom Instructions, Gems, Projects,
   System Prompt, Saved Memory), put the CORE OPERATING SYSTEM section there
   instead so it survives across conversations.
3. Confirm each seat replies with an ACK Report Block. A seat that doesn't ACK in
   the right format is misconfigured — repaste before continuing.

---

## Round 1 — PROPOSE

Paste this to **every** seat. Do not show any seat another seat's answer.

```
=== BOARDROOM: ROUND 1 — PROPOSE ===
RUN: RUN-01
SITUATION: <one paragraph. What's true today: assets, audience, budget, skills,
existing accounts, anything already built.>
CONSTRAINT: Budget cap $<X>. Deadline: first dollar within <N> hours.
MANDATE: Digital deliverable, instant fulfillment, AI-servable sales, non-linear.
ASK: One proposal, Proposal Schema, nothing else. Do not hedge with three
options. Pick your best one and defend it.
=== END ===
```

Collect all ten answers into one document, unedited, labeled by seat.

---

## Round 2 — CHALLENGE

Paste the **full collected set** to every seat, with:

```
=== BOARDROOM: ROUND 2 — CHALLENGE ===
Below are all proposals from the table, unedited.
DO THIS, IN ORDER:
1. Score every proposal on the rubric (Speed 0-5, Autonomy 0-5, Margin 0-5,
   Defensibility 0-5, Risk -5-0). Include your own. Score yours honestly — a seat
   caught inflating its own score loses its vote.
2. Write your single strongest objection to the highest-scoring proposal that is
   NOT yours. Be specific and be brutal. Vague objections are worthless.
3. Name the ONE proposal you would bet your seat on, and why in two sentences.
4. Name the one thing in YOUR OWN proposal you now believe was wrong.
=== PROPOSALS ===
<paste all>
=== END ===
```

Item 4 matters more than it looks. A seat that cannot find a flaw in its own
proposal is not thinking, and you should discount its scores accordingly.

---

## Round 3 — COMMIT

Send everything to the **Chair** (Claude Code) only:

```
=== BOARDROOM: ROUND 3 — COMMIT ===
You are Chair. Tally all scores, weigh the objections, and issue the Build Order.
Output exactly:
- DECISION: the one offer we are building, in one sentence
- WHY IT WON: three bullets, referencing scores and objections
- WHY THE RUNNER-UP LOST: two bullets
- BUILD ORDER: a table of Workstream | Owner seat | Deliverable | Evidence
  required | Deadline (hour)
- KILL CRITERIA: the specific conditions under which we declare this dead
- IDEA FREEZE: in effect as of now
- PERMISSIONS NEEDED FROM CIRO BEFORE HE LEAVES: numbered list, each one a
  concrete action he takes in under 5 minutes
Write it to ops/board/DECISIONS.md.
=== ALL ROUND 2 OUTPUT ===
<paste>
=== END ===
```

Then paste the Build Order back to all seats as their marching orders. That is the
last routing you do before you walk out the door.

---

## During the run — the standup relay

Every 4 hours (or whenever you check in), paste to each seat:

```
=== STANDUP H<hour> ===
Post your Report Block. Then answer:
- What did you ship since last standup? Evidence required.
- What is the single biggest risk to the deadline right now?
- What do you need from a named seat?
=== END ===
```

Collect, append to `board/STANDUP.md`, and paste the digest back out so every seat
sees the whole table. That digest is the closest thing to "everyone hearing each
other," and one round of it per 4 hours is enough.

---

## Emergency protocol

Any seat may post `RED ALERT` at any time. When you see one, immediately paste it
to the Chair and the affected seat's Challenger only — not the whole table. Two
seats resolving a fire beats ten seats discussing it.

---

## Phase 2 — making it live (removing you entirely)

Everything above still routes through your clipboard. To remove that:

1. **Shared board over HTTP.** This repo is a Cloudflare Worker. Add `GET
   /board` returning the current state as plain text, and `POST /board` writing a
   seat's Report Block with a per-seat key. Scaffolded at `ops/board/board.json`.
2. **Read for free, today.** Any seat with browsing (ChatGPT, Gemini, Grok,
   Perplexity, Copilot, Manus) can be told to fetch `/board` at the start of every
   response. That alone gets you *shared awareness* with zero pasting.
3. **Write via the seats that have tools.** Manus and Claude Code can POST
   directly. Everyone else returns a block you or a scheduled job relays.
4. **The bus.** Once read+write works for 3+ seats, they are genuinely talking to
   each other, and the boardroom runs on a cron instead of on you.

Build Phase 2 only after RUN-01 produces a real result. A message bus with nothing
to say is a very sophisticated way to avoid shipping.
