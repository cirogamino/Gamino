# Block 1C — Video Corpus Extraction

You have a large library of downloaded videos and transcripts. The goal is **not** summaries.

> Do not ask agents to "watch the videos and tell me what's useful." That instruction is a
> slop factory: N agents produce N essays, each individually reasonable, collectively
> unusable, and you end up reading all of them yourself. You've moved the bottleneck back
> to you.

The goal is to **collapse the corpus into one queryable table**, so that "which tools were
mentioned in more than three videos, have an API, and cost under $100/mo" becomes a query
instead of a research project.

---

## The extraction schema

One row per **claim**, not per video. A 40-minute video yields 5–20 rows.

```yaml
claim_id:          # video_id + timestamp, e.g. "dQw4w9WgXcQ@12:34"
video_id:
video_url:
video_title:
channel:
published_at:      # video's own date — a 2023 tool claim is likely stale
duration_min:
transcript_path:

claim_type:        TOOL | WORKFLOW | TECHNIQUE | PRICING | WARNING | RESULT
timestamp:         # where in the video, so it's re-checkable
verbatim:          # ≤ 2 sentences quoted from the transcript. Not paraphrased.

# TOOL claims:
canonical_name:    # SAME normalization as the software protocol — this is the join key
what_it_does:      # ≤ 15 words
agent_drivable:    API | MCP | CLI | BROWSER_ONLY | HUMAN_ONLY | UNKNOWN
cost_mentioned:
prerequisite:      # what else you need for this to work

# WORKFLOW claims:
steps:             # ordered list, as described
inputs_needed:
claimed_outcome:

applies_to_us:     # which of our lanes: build | content | media | ops | none
status:            CLAIMED          # always. Only a proving run changes this.
hype_score:        1-5              # 5 = pure affiliate pitch, 1 = demonstrated on screen
extractor_agent:
```

---

## Why one row per claim

Per-video summaries can't be aggregated. Per-claim rows can:

- `GROUP BY canonical_name` → which tools does the corpus actually converge on? A tool named
  in 14 videos across 9 channels is a real signal. A tool in one video is one person's opinion.
- `WHERE claim_type = 'WARNING'` → everything the corpus says *doesn't* work. This is the most
  valuable slice and it is completely invisible in per-video summaries, because warnings are
  always an aside.
- `WHERE hype_score >= 4` → the affiliate-driven recommendations, quarantined.
- `JOIN` against the Block 1A software submissions on `canonical_name` → **tools your agents
  recommended that the corpus also validates.** That intersection is your highest-confidence
  shortlist and it costs you a join.

`canonical_name` using the same normalization rule as
[`03-software-selection-protocol.md`](./03-software-selection-protocol.md) is what makes that
join possible. Get that field right and the corpus and the recommendations become one dataset.

---

## The `hype_score` field

Rate 1–5 on this rubric — it's the corpus's built-in bullshit filter:

| Score | Signal |
|---|---|
| 1 | Tool demonstrated working on screen, with visible output, including a failure |
| 2 | Demonstrated working, only the happy path |
| 3 | Described in detail but not shown |
| 4 | Named in a list, with an affiliate/discount code mentioned |
| 5 | "This changes everything", no demonstration, sponsored segment |

Anything ≥4 requires two independent sources before it can reach the Top 10 shortlist.

---

## Running the lane

**Assignment:** agents with `best_at: extraction` and large context. Extraction is patient,
low-creativity work — do not put your strongest reasoning model here, it's the wrong use of it.

**Batching:** one agent per 10–15 videos, not one agent per video. Per-video agents produce
inconsistent schemas because each one re-decides what counts as a claim. Batching gives each
extractor enough volume to be internally consistent.

**Calibration pass first.** Before the lane runs, have three agents extract the *same* video
independently. Compare. If their rows differ substantially, the schema is ambiguous — fix it
before you spend the fleet's night on it. Fifteen minutes here saves you a corpus you can't
trust, and an inconsistent corpus is worth roughly zero.

**Verbatim quotes are mandatory.** The `verbatim` field is the receipt (see
[`05-anti-slop-standard.md`](./05-anti-slop-standard.md)). It makes every row spot-checkable
against the transcript in seconds, and it makes fabricated claims nearly impossible — an agent
can invent a summary, but inventing a quote that isn't in a transcript you hold is a check
that takes one `grep`.

**Audit:** the auditor samples 5% of rows and greps the transcript for the verbatim string.
Any extractor with a miss gets its whole batch re-run.

---

## Output of Block 1C

`corpus_claims` — one table, thousands of rows, joinable to the software list. Plus, for free:

- A ranked list of tools by cross-video mention count
- A warnings list of everything the corpus says fails
- A workflows library, deduped, ready to become job orders
- A per-channel reliability score (`AVG(hype_score) GROUP BY channel`) — so you know which
  sources to weight next time

That last one compounds. After one night you know which five channels are worth watching and
which twenty are noise.
