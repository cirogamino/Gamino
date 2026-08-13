# Orchestrator Playbook

> "It all comes down to the orchestrator." Correct — and the orchestrator's job is smaller
> than it looks. It is not to think hardest. It is to keep the queue full, keep the box
> honest, and never let unverified work move downstream.

---

## The orchestrator's only four jobs

1. **Keep every verified agent holding exactly one job order.**
2. **Enforce the box.** At the timebox, take what exists.
3. **Never let `SUBMITTED` become `ACCEPTED` without an auditor.**
4. **Update capability cards as evidence arrives.**

Everything else — analysis, synthesis, building — is delegated. An orchestrator that starts
doing the work becomes the bottleneck, and then you have thirty agents waiting on one.

---

## Minute-to-minute loop

Every 10 minutes, in this order:

```
1. Any job order past its box?        → force SUBMITTED, take what exists
2. Any agent idle?                    → assign from QUEUED, matching best_at
3. Any SUBMITTED unaudited > 15 min?  → assign an auditor now
4. Any BLOCKED?                       → unblock, reassign, or kill. Never leave it sitting.
5. Any REJECTED twice on same work?   → update do_not_assign on the card, reroute
6. Queue depth < agent count?         → write more job orders. This is the real failure mode.
```

**Item 6 is the one that kills fleets.** An idle agent is worse than a slow one, because you
paid for the wake-up and got nothing. Keep the `QUEUED` backlog at 2× your agent count at all
times. If you're writing job orders faster than agents finish them, you're orchestrating
correctly.

---

## Escalation ladder

| Situation | Action | Do not |
|---|---|---|
| Agent stuck on one error 3× | BLOCKED, reassign to a different agent | Let it keep retrying |
| Two agents contradict each other | Third agent adjudicates with receipts | Pick the more confident one |
| Auditor rejects, worker disagrees | Auditor wins. Escalate to lead only if the receipt itself is disputed | Let the worker re-submit unchanged |
| Tool/API down | BLOCKED on all job orders touching it, batch for later | Have 5 agents discover it separately |
| Agent produces confident output with no receipt | REJECTED, card updated | Accept it because it reads well |

The second row is worth sitting with: **confidence is not evidence, and models are calibrated
to sound certain.** When two agents disagree, the tiebreaker is always a third agent that goes
and checks, never the tone of the disagreement.

---

## What you personally watch

You asked to *see* everyone working. That's one screen:

```sql
select lane, state, assigned_to, title,
       extract(epoch from (now() - submitted_at))/60 as mins_waiting
from job_orders
where state not in ('ACCEPTED','REJECTED')
order by lane, state;
```

Three numbers tell you if the room is healthy:

- **Idle agents** — should be 0
- **`SUBMITTED` awaiting audit** — should be < 3; if it climbs, you need more auditors
- **`QUEUED` depth** — should be ≥ 2× agent count

If all three are green, the room is running and you don't need to look at any individual
conversation. That is the actual goal: watching the board, not reading the transcripts.

---

## End-of-night close-out (Block 4)

1. Every `SUBMITTED` gets audited. No overnight ambiguity — an unaudited claim rots into an
   assumption by morning.
2. `roster.yaml` updated with the night's evidence. This is the compounding asset: tomorrow's
   assignments are better than tonight's because the cards are better.
3. SOPs from Block 3 merged into the fleet's skill library.
4. Tomorrow's job orders written **tonight**, while the context is live. Writing job orders
   cold in the morning costs an hour of re-derivation.
5. One-page close: what shipped, what got proven, what got rejected, what's blocked.

---

## Ten things that will go wrong tonight (and the pre-decided answer)

| # | Failure | Answer |
|---|---|---|
| 1 | Rate limits look like agent failures | Wake in waves of 10. Check for 429 before diagnosing capability. |
| 2 | Agents report success without receipts | Receipt Rule, enforced at SUBMITTED. |
| 3 | Two agents edit the same file | One writer per path. Assign paths in `inputs`. |
| 4 | Credentials missing mid-run | Pre-flight credential check as a Block 0 job order. |
| 5 | An agent burns 90 min in a retry loop | `kill_criteria` on every job order. |
| 6 | 300 recommendations, all the same 20 tools | Mandatory contrarian/already-owned/removal slots. |
| 7 | Convergence becomes an argument | Mechanical Borda + rubric. Two auditors re-run it. |
| 8 | Proving runs prove hello-worlds | Every proving run completes a real queued job order. |
| 9 | You become the bottleneck reviewing everything | Auditors, at 1:5. Watch the board, not the transcripts. |
| 10 | Tomorrow starts from scratch | Capability cards + SOPs committed to the repo tonight. |
