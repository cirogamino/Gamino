# The Buzzroom Operating Model

**Purpose:** wake every agent, verify it actually works, and have the verification itself
produce a real company asset. No agent is ever "tested" with a throwaway task. Every test
is a job order, and every job order leaves behind an artifact we keep.

**Tonight's outcome, stated as a deliverable:**

1. A **verified roster** — which agents woke, which are reliable, and what each is measurably good at.
2. A **ratified Top 10 software list** — converged from every agent's independent recommendation, filtered by whether an agent can actually drive it.
3. **Ten proving runs** — one agent per tool, each producing an adoption verdict and a runbook the rest of the fleet uses going forward.
4. **Websites live** and **the video corpus reduced to a queryable table** — done as the vehicle for testing, not as a separate project.

---

## The one rule everything else hangs from

> **The test is the work.** If a task exists only to check whether an agent is alive, it is
> the wrong task. Replace it with the smallest real job that produces a keepable artifact.

An agent that fails a real job tells you far more than an agent that passes a synthetic one,
and you keep the output either way.

---

## Run of show

Times are relative blocks, not clock times. Run them in order; blocks 1A/1B/1C run
concurrently.

| Block | Name | Duration | Who | Output |
|---|---|---|---|---|
| **0** | Roll Call & Wake Probe | 30 min | Everyone | Capability card per agent; live roster |
| **1A** | Recon lane | 60 min | All verified agents | Top-10 software submissions |
| **1B** | Build lane | 60–120 min | Web-capable agents | Sites deployed, URLs returning 200 |
| **1C** | Mine lane | 60–120 min | Long-context agents | Video corpus extracted to schema |
| **2** | Convergence | 30 min | Orchestrator + 2 auditors | Ratified Top 10 |
| **3** | Proving Run | 90 min box | 10 agents, 1 tool each | Verdict + runbook per tool |
| **4** | Ratification | 30 min | Orchestrator | Merged SOPs, updated roster, tomorrow's job orders |

Blocks 1A/1B/1C are deliberately parallel. Recon is cheap thinking work; Build and Mine are
expensive doing work. Running recon alongside them means the Top 10 is ready the moment the
build and mine lanes report, with no idle fleet.

---

## Documents in this folder

| File | What it's for |
|---|---|
| [`01-roster-and-wake-protocol.md`](./01-roster-and-wake-protocol.md) | How to wake and verify agents; the capability card |
| [`02-job-order-spec.md`](./02-job-order-spec.md) | The job order format every task uses |
| [`03-software-selection-protocol.md`](./03-software-selection-protocol.md) | Collecting 300 recommendations and converging to 10 |
| [`04-proving-run-protocol.md`](./04-proving-run-protocol.md) | Block 3: proving a tool and writing the runbook |
| [`05-anti-slop-standard.md`](./05-anti-slop-standard.md) | The quality bar and how it's enforced |
| [`06-video-corpus-extraction.md`](./06-video-corpus-extraction.md) | Turning downloaded videos into a queryable table |
| [`07-orchestrator-playbook.md`](./07-orchestrator-playbook.md) | What you (or the lead agent) actually do, minute to minute |
| [`prompts/`](./prompts/) | Copy-paste prompt blocks for each block |
| [`templates/`](./templates/) | Fill-in templates for job orders, cards, verdicts, SOPs |

---

## Roles

The fleet is not flat. Flat fleets produce slop because nobody's job is to disbelieve.

- **Orchestrator (1).** Assigns, sequences, resolves conflicts, holds the board. Does not build.
- **Section Leads (3–4).** One per lane (Recon / Build / Mine / Admin). Owns their lane's queue and their lane's quality gate.
- **Workers (N).** Execute job orders.
- **Auditors (1 per 5 workers).** Produce nothing. Their only job is to open the URL, run the command, and check the claim. Auditors are the single highest-leverage role in the room — see [`05-anti-slop-standard.md`](./05-anti-slop-standard.md).

Assign your strongest reasoning models to Orchestrator and Auditor, not to Worker. The
common mistake is putting the best model on the hardest build task; the better move is
putting it where its judgment multiplies across everyone else's output.

---

## Board

One source of truth. Every job order has exactly one state:

```
QUEUED → ASSIGNED → IN_PROGRESS → SUBMITTED → AUDITED → { ACCEPTED | REJECTED | BLOCKED }
```

`SUBMITTED` is not `DONE`. Only an auditor moves work past `SUBMITTED`. An agent may never
mark its own work `ACCEPTED`.

Keep the board somewhere both you and the agents can read and write. Supabase is already
wired into this stack, so a single `job_orders` table with the fields in
[`02-job-order-spec.md`](./02-job-order-spec.md) is the shortest path to a board you can
watch live. A shared markdown file works for tonight if it must, but it will not survive
thirty concurrent writers.
