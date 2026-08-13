# GAMINO — the AI operating system

Ten AIs. One table. One offer. No bottleneck.

## What this is

A complete operating system for running a multi-AI team as a business: a shared
constitution, a seat prompt per AI customized to that model's actual strengths, a
turn-based boardroom protocol, and a 24-hour autonomy test with real pass/fail
gates.

## The constraint this is designed around

Separate AI chat windows cannot hear each other. There is no live room. Anything
promising ten AIs interrupting each other in real time is either running an API
message bus behind the scenes or it's theater.

So the room here is **written** and the meeting is **turn-based**. You route three
times — Propose, Challenge, Commit — and then the team executes without you.
`ops/02-MEETING-PROTOCOL.md` has the exact paste blocks, and a Phase 2 path to
remove the pasting entirely once a run has produced a real result.

## Read in this order

| File | What it's for |
|---|---|
| `00-CONSTITUTION.md` | The shared law. Ten Laws, forbidden list, Report Block, boardroom cycle, anti-derail mechanisms, Definition of Done. |
| `01-ROSTER.md` | Which AI holds which seat and why, write-locks, challenger pairs, how to collapse to a smaller team. |
| `02-MEETING-PROTOCOL.md` | How to actually run the meeting. Exact copy-paste blocks. |
| `03-24HOUR-RUN.md` | The autonomy test: pre-departure checklist, hour map, hard gates, kill criteria. |
| `prompts/` | One self-contained super prompt per AI. Paste as-is. |
| `board/` | The shared table: LEDGER, STANDUP, BLOCKERS, DECISIONS. |
| `dashboard.html` | The floor plan — every seat, status, and what it's doing, at a glance. |

## Start here

1. Read `03-24HOUR-RUN.md` and work the **pre-departure checklist**. Most of the
   run's outcome is decided before the clock starts.
2. Open one chat per AI. Paste its file from `prompts/`. Confirm each ACKs with a
   Report Block.
3. Run Rounds 1–3 from `02-MEETING-PROTOCOL.md`.
4. Seed `board/LEDGER.md` with the real checkout link, domain, and spend cap.
5. Start the clock.

## The two ideas that make this work

**Every seat operates as though it's the only AI you have.** Ten AIs that each
wait for the others produce zero. The Laws forbid deferring, waiting, and
"someone else should handle this." You get ten full operators, not ten
contributors to one operator.

**Every seat still owns one lane and answers to one adversary.** That's what stops
ten full operators from building ten half-products. Own a lane end to end, do
whatever else is needed when nobody moves, and never ship past your Challenger.

## The thing to actually measure

Not revenue — not on run one. **The blocker log.**

Every entry in `board/BLOCKERS.md` is a place where the world demanded a legal
human. That list is short, specific, and clearable. Close a few permanently before
each run and the ceiling rises every time.

The bottleneck was never your thinking speed. It's the handful of doors that only
open for a person with ID. Run this four times and that list gets very short —
which is the actual mechanism behind a business that runs while you're on a beach.
