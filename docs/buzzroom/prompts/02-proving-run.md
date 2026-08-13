# Prompt — Block 3 Proving Run

One per tool. Send to the assigned proving agent. 90-minute hard box.

---

```
You are running a PROVING RUN on: [TOOL NAME]

The company is deciding whether to adopt this tool across a fleet of AI agents. Your output
decides that, and every other agent will work from what you write. Assume the marketing is
wrong until you have made the tool do our actual work.

You have 90 minutes. Hard stop. At 90 minutes you submit what you have.

=== DELIVERABLE 1: DO REAL WORK ===
Complete this genuinely queued job order using the tool:
  [PASTE A REAL JOB ORDER FROM THE BACKLOG]
Not a demo. Not a sample project. This is work we actually need done.
Report the artifact: URL, file path, or commit SHA.

=== DELIVERABLE 2: STRESS IT ===
Push until something breaks. Measure, do not estimate:
  - CONCURRENCY: fire 10 operations simultaneously. Where does it rate-limit, queue, or fail?
    Report the exact ceiling. This is the most important number you will produce — we intend
    to point many agents at this tool at once.
  - VOLUME: run 10x the size of your real task.
  - AUTH UNDER LOAD: does the token survive, or do you get mid-run 401s?
  - IDEMPOTENCY: run the identical operation twice. Duplicate, overwrite, or no-op?
    Agents retry. A non-idempotent tool plus a retrying agent is a data-loss incident.

=== DELIVERABLE 3: WRITE THE SOP ===
Write `sop-[tool].md`. This is the deliverable that outlives tonight. Write it for an agent
that has never seen this tool and cannot ask you anything.

Required sections:
  - What it's for (and explicitly what NOT to use it for)
  - Access: where credentials live, which env vars / MCP server, what to do when auth fails
  - The happy path: numbered, copy-pasteable, real parameter values, no placeholders
  - Worked example: the real job order above, with its artifact link
  - Limits found: measured rate limits, quotas, max sizes, latency at volume
  - Failure modes: EVERY error you hit, verbatim, with the fix. This section is worth more
    than the happy path — the happy path is already in their docs. This isn't.
  - Cost: measured for the worked example, extrapolated at 100x
  - Do not: traps, destructive ops, anything that silently overwrites/publishes/bills

An auditor will follow your happy path from scratch, verbatim. If they have to improvise,
your SOP failed and the tool is not adopted.

=== DELIVERABLE 4: VERDICT ===
verdict: ADOPT | TRIAL | REJECT
confidence: HIGH | MED | LOW
job_order_completed:      # ID + artifact URL
adopt_because:            # cite your artifact, not their marketing
reject_because:
trial_conditions:         # what must be true to promote it, and by when
replaces:                 # the named tool or manual process this RETIRES.
                          # If it replaces nothing, say "NOTHING" — and know that additions
                          # face a much higher bar than replacements.
concurrency_ceiling:      # measured
cost_at_100x:
integration_effort:       # hours to wire into the fleet properly
blast_radius:             # what breaks if this goes down mid-workflow
sop_path:

If you cannot complete the real job order in 90 minutes, your verdict is REJECT with reason
"could not complete a real job in 90 minutes." That is not your failure — it is a finding
about the tool, and it is exactly as valuable as a success. Report it plainly.
```
