# Block 3 — The Proving Run

Ten agents, ten tools, one tool each, 90-minute box.

> **A tool is not adopted when it is purchased. It is adopted when another agent can pick up
> the runbook and get a result on the first try, without asking anyone anything.**

That sentence is the whole point of this block. The output of a proving run is not "I tried
it and it works." The output is a runbook that turns the tool into fleet capability.

---

## Assignment

Match tool to agent by `best_at` on the capability card, not by availability:

| Tool category | Assign to |
|---|---|
| build / agent-infra | Agent with `best_at: build`, highest `tools_verified` |
| content / media | Agent with `best_at: writing` or a media-capable model |
| data / analytics | Agent with `best_at: extraction` |
| comms / ops | Agent with `best_at: ops`, highest `tool_honesty` |

Never assign an agent to prove a tool it recommended at rank 1. It will find what it expected
to find. Cross-assign: the agent that championed a tool gets a different one to prove, and
reviews the verdict on its own pick as a second reader.

---

## The four required deliverables

A proving run that produces fewer than all four is `REJECTED`, regardless of how well the
tool performed.

### 1. The real task (not a hello world)

Each proving agent must complete **one genuine, currently-queued job order** using the tool.
Pull it from the Build, Mine, or Admin lane backlog. Not a demo. Not a sample project. A thing
you actually needed done today.

This is the difference between "the API returned 200" and "this tool can do our work." Tools
pass hello-worlds and fail real jobs constantly — the gap is usually auth at scale, rate
limits, output format, or a missing operation two steps into the real workflow.

### 2. The runbook (`sop-<tool>.md`)

The deliverable that outlives tonight. Must contain:

```markdown
# SOP: <tool>

## What it's for
One paragraph. What job to reach for this tool for, and — importantly — what NOT to use it for.

## Access
Where credentials live (the location, never the secret). Which env vars. Which MCP server
or endpoint. What to do when auth fails.

## The happy path
Numbered steps, copy-pasteable. Exact commands or exact tool calls with real parameter values.
An agent following these steps verbatim must get a working result.

## Worked example
The actual job order completed in Block 3: inputs used, commands run, output produced, link
to the artifact.

## Limits found
Rate limits (measured, not documented). Quotas. Max sizes. Latency at our volume.
Where it broke when pushed.

## Failure modes
Every error encountered, verbatim, with the fix. This section is worth more than the happy
path — the happy path is in their docs, this isn't.

## Cost
Measured cost of the worked example. Extrapolated cost at 100× that volume.

## Do not
Traps. Destructive operations. Anything that silently overwrites, publishes, or bills.
```

### 3. The stress result

Push it until something breaks, and record where. Specifically:

- **Concurrency:** run 10 operations simultaneously. Does it rate-limit, queue, or fail?
  This matters more than anything else in the run — you intend to point *many* agents at
  this tool at once, and a tool that's excellent single-threaded and collapses at ten
  parallel callers is a tool that will fail you precisely when the fleet scales.
- **Volume:** 10× the worked example's size.
- **Auth under load:** does the token survive, or do you get mid-run 401s?
- **Idempotency:** run the same operation twice. Duplicate, overwrite, or no-op? Agents retry.
  A non-idempotent tool plus a retrying agent is a data-loss incident waiting to happen.

### 4. The verdict

```yaml
tool:
proving_agent:
job_order_completed:      # the real JO ID, with its artifact URL
verdict:  ADOPT | TRIAL | REJECT
confidence: HIGH | MED | LOW

adopt_because:            # required if ADOPT — cite the artifact, not the marketing
reject_because:           # required if REJECT — cite the specific failure
trial_conditions:         # required if TRIAL — what must be true to promote it, and by when

replaces:                 # named tool/process this retires. If nothing, say so explicitly.
concurrency_ceiling:      # measured, e.g. "8 parallel before 429s"
cost_at_100x:
integration_effort:       # hours to wire into the fleet properly
blast_radius:             # what breaks if this tool goes down mid-workflow
sop_path:
```

**Every ADOPT must name what it replaces.** If a tool replaces nothing, it is an addition to
the stack, and additions need a much higher bar than replacements. This field alone will kill
three of your ten, and that's the field doing its job.

---

## Timebox discipline

90 minutes, hard. At the box:

- Task done + SOP written → `SUBMITTED`
- Task done, SOP thin → `SUBMITTED`, auditor grades the SOP specifically
- Task not done → verdict is `REJECT` with reason `could not complete a real job in 90 minutes`

That last line is not a failure of the agent. It's a finding about the tool: a tool a capable
agent can't get productive with inside ninety minutes is a tool that will cost you a week of
fleet time to roll out. Record it as data and move on.

---

## Audit

Each verdict is audited by an agent that did **not** prove that tool. The auditor's job:

1. Open the artifact. Does it exist and is it correct?
2. Follow the SOP happy path verbatim, from scratch. Does it work without improvisation?
3. Check the stress numbers were measured, not estimated.
4. Confirm `replaces` is real.

**Step 2 is the one that matters.** An SOP the auditor can't follow is an SOP no agent can
follow, which means the tool isn't adopted no matter how well it performed for the person
who already knew how it worked.

---

## Output of Block 3

- 10 verdicts
- N `sop-<tool>.md` files → these become the fleet's permanent skill library
- 10 real job orders completed as a side effect
- A measured concurrency ceiling per tool, which becomes your fleet scheduling constraint
