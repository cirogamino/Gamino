# Block 1A + 2 — Software Selection Protocol

The problem: thirty agents × ten recommendations = three hundred items, most of them
duplicates, most of them the same popular tools every model has memorized. Reading three
hundred free-text answers is a night's work by itself and produces a consensus list that
reflects training data, not your business.

This protocol makes convergence mechanical and pushes the recommendations away from the
obvious.

---

## Part 1 — The submission format (Block 1A)

Every agent submits exactly this. Free-text recommendations are rejected unread.

```yaml
- rank: 1
  canonical_name:   # lowercase, no suffixes: "supabase" not "Supabase.io"
  category:         # one of: build | content | media | data | comms | ops | analytics | agent-infra
  what_it_replaces: # a named bottleneck we have today, or "net-new capability"
  agent_drivable:   # API | MCP | CLI | BROWSER_ONLY | HUMAN_ONLY  ← the gate, see below
  api_docs_url:     # must resolve; leave blank only if HUMAN_ONLY
  pricing_model:    # and the URL you got it from, with retrieval date
  time_to_first_value: # hours to a working integration, your honest estimate
  lock_in_risk:     # LOW | MED | HIGH — how hard to leave once our data is in it
  evidence:         # URL to docs/changelog you actually opened. Not from memory.
  one_line_why:     # ≤ 25 words
```

### Three mandatory slots

Of the ten, at least:

- **One must be `already_owned`** — a tool the company already pays for or has already
  connected, that is underused. These are the highest-ROI items on any list and no model
  suggests them unprompted, because they're not exciting.
- **One must be against consensus** — something the agent believes is right but expects
  most of the fleet to miss. Flag it `contrarian: true`.
- **One must be a *removal*** — a tool, subscription, or manual process to kill. Flag it
  `subtractive: true`. Adding ten tools while removing none is how you get a stack nobody
  can operate.

Without these slots you will get thirty near-identical lists of whatever was popular in
training data, and the convergence step becomes a popularity contest with no new information
in it.

---

## Part 2 — The gate (applied before scoring)

> **If an agent cannot drive it, it does not belong on a list of software for a company run
> by agents.**

Split every submission on `agent_drivable`:

| Value | Where it goes |
|---|---|
| `API` / `MCP` / `CLI` | **Main list.** Eligible for the Top 10 and the proving run. |
| `BROWSER_ONLY` | **Second list.** Only if it's a genuine bottleneck-breaker, and only with a browser-automation plan attached. |
| `HUMAN_ONLY` | **Human tools list.** Real, but never spend agent proving-capacity on it. |

This one gate typically removes 40–60% of submissions and is the single biggest quality
improvement in the protocol. A tool your fleet can't operate is a tool that turns your fleet
back into a bottleneck at you.

**Check your existing MCP connections before scoring anything.** You already have a
substantial set of servers wired up — GitHub, Supabase, Cloudflare, Stripe, Google Workspace,
Zapier, Figma, Canva, Gamma, Descript, ElevenLabs, HeyGen, Higgsfield, Lovable, Replit,
Hugging Face, Zoom. Every one of those is already `agent_drivable: MCP` with credentials
solved. Any submission that duplicates something in that set should be scored as
`already_owned` and, in most cases, beaten by "actually use the one we have."

The most likely honest answer to "top 10 software to implement" is that four or five of the
ten are tools you already own and have never put through a proving run.

---

## Part 3 — Scoring

For each surviving candidate, score 0–3 per criterion, multiply by weight:

| Criterion | Weight | 0 | 3 |
|---|---|---|---|
| Agent-drivable depth | ×3 | Thin API | Full MCP/API, covers the whole workflow |
| Breaks a bottleneck we hit **tonight** | ×3 | Speculative | Named job order it would have unblocked |
| Time to first value | ×2 | > 1 week | < 4 hours |
| Output quality ceiling | ×3 | Produces slop | Produces work we'd ship unedited |
| Cost at our seat count | ×2 | Per-seat, scales badly with agents | Flat or usage-based |
| Already owned / connected | ×2 | Net-new vendor + procurement | Already paid for, already wired |
| Exit cost (inverted) | ×1 | Proprietary lock-in | Export anytime, open format |

Max score: 48.

**"Breaks a bottleneck we hit tonight" carries a ×3 weight for a reason.** By the time you
run convergence, Blocks 1B and 1C have been running for an hour. You will have real, dated,
specific friction — a deploy that failed, a transcript step that took four passes, an asset
you couldn't generate. Score against *that* list, not against a hypothetical. This is why
recon runs concurrently with real work instead of before it.

---

## Part 4 — Convergence (Block 2, 30 min)

1. **Dedupe mechanically** on `canonical_name`. Because the field is constrained, this is a
   `GROUP BY`, not a judgment call. 300 rows collapse to ~40–60 unique tools.
2. **Weighted Borda count.** Each agent's rank-1 is worth 10 points down to rank-10 worth 1.
   Weight each agent's votes by its capability card: agents that scored `PASS` on retrieval
   count ×1.5; agents that scored `HALLUCINATED` count ×0.5. Evidence-based voters get more
   say than confident ones.
3. **Combine** Borda points with the rubric score. Rank.
4. **Force diversity.** Cap the Top 10 at **three tools per category**. Ten tools that all do
   content generation is not a stack, it's a hobby.
5. **Reserve two slots** for `contrarian: true` items that scored well but got few votes.
   These are where the actual edge is — consensus picks are, by definition, what everyone else
   is already doing.
6. **Publish the two removals** with the highest support alongside the Top 10.

Two auditors independently re-run steps 1–3 from the raw submissions. If their Top 10 differs
from the orchestrator's by more than two positions, the scoring was subjective somewhere —
find it and fix it before committing the fleet to ninety minutes of proving runs.

---

## Output of Block 2

`software-top10.yaml` — ten tools, each with a score, a vote count, the named bottleneck it
breaks, and a pre-assigned proving agent chosen from the roster by `best_at`. That file is
the input to Block 3, and each row becomes one job order.
