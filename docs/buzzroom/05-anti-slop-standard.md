# The Anti-Slop Standard

Slop is not a style problem. It is a **verification** problem. Slop is what you get when
producing output is rewarded and checking output is nobody's job.

Everything below is one idea applied four ways: **make claims expensive and checking cheap.**

---

## 1. The Receipt Rule

> No job order reaches `SUBMITTED` without a receipt. A claim without a receipt is not a
> report, it is a guess with confidence.

A receipt is exactly one of:

| Type | What it looks like |
|---|---|
| `url_200` | A URL, plus the response line, plus what you saw on the page |
| `commit_sha` | Full SHA + branch + files changed |
| `command_output` | The exact command and its actual stdout/stderr, pasted |
| `screenshot` | Image file path, for anything visual |
| `record_id` | Row/document ID in a system of record you can query back |

### Banned phrases — automatic `REJECTED`

- "should now work" / "should be live"
- "I've deployed the site" (without a URL that returns 200)
- "the tests pass" (without the test runner output)
- "I've updated the configuration" (without the diff)
- "this is production-ready"
- Any summary of what an agent *intended* to do, written in the past tense

These aren't nitpicks. Every one of them is the exact form a hallucinated completion takes.
An agent that cannot produce a receipt did not do the work — and it will not tell you that
unless you make the receipt mandatory.

---

## 2. Auditors produce nothing

One auditor per five workers. Auditors write no code, deploy no sites, generate no content.
Their entire function is: open the URL, run the command, check the claim.

This feels wasteful. It is the opposite. An agent fleet without auditors converges on
plausible-sounding completion reports, because that's what gets a task marked done. Twenty
percent of your capacity spent on verification is what makes the other eighty percent
trustworthy — and untrustworthy output has negative value, because you have to check it all
yourself anyway. Which makes *you* the bottleneck, which is the exact thing you're building
this room to escape.

**The audit is adversarial by instruction.** Auditors are prompted to *disprove*:

> Your job is to find the reason this work is not done. Assume the claim is false until the
> receipt proves otherwise. Open every URL. Run every command. If you cannot reproduce the
> claimed result from the evidence provided, the verdict is REJECTED — not "needs more
> information."

An auditor that accepts 100% of submissions is broken. Rotate it out and check its capability
card's `tool_honesty` score.

---

## 3. Structured output over prose

Slop is verbose by nature — free text is where padding hides. Every deliverable in this
system has a schema: capability cards, job orders, software submissions, verdicts, extraction
rows.

**Where a schema exists, prose is rejected unread.** This is not pedantry:

- Schemas make aggregation mechanical. Three hundred structured rows is a `GROUP BY`.
  Three hundred essays is a night of reading.
- Schemas make gaps visible. An empty required field is obvious; a paragraph that never quite
  addresses the point is not.
- Schemas make padding impossible. There is no room to write around a number you don't have.

The one place free prose belongs is the SOP "Failure modes" section, where the specific,
verbatim, weird detail is the entire value.

---

## 4. Right agent, right job — enforced by the board

The `why_this_agent` field on every job order is the mechanism. If you cannot cite the
capability card line that justifies the assignment, don't make it.

The strongest anti-slop move available to you is the negative one: **leave a job order
`QUEUED` rather than assign it to an agent that will produce something plausible.** An agent
working outside its measured strength doesn't produce nothing — it produces something that
looks like the right answer. That's worse than an empty queue, because empty queues are
visible and bad output isn't until it's downstream.

Update capability cards as evidence comes in. An agent that gets `REJECTED` twice on the
same kind of work has `do_not_assign` updated, tonight, not in someone's memory.

---

## 5. Anti-hype filter (for the video corpus and the software list)

Everything extracted from a YouTube video or a vendor page is a **claim**, not a fact.
It carries `status: CLAIMED` until an agent has run it and produced a receipt, at which point
it becomes `VERIFIED` or `DEBUNKED`.

Never let a `CLAIMED` item into a decision. The entire creator economy is paid to make tools
sound like they work. The Block 3 proving run exists precisely to convert claims into
verdicts, and the corpus is a source of hypotheses, not conclusions.

---

## Quick reference — the five gates

| Gate | Question | Fails → |
|---|---|---|
| Receipt | Is there a checkable artifact? | REJECTED |
| Auditor | Did someone who didn't do it verify it? | Stays SUBMITTED |
| Schema | Is it in the required format? | Rejected unread |
| Assignment | Is this agent measurably right for this? | Don't assign |
| Claim status | Verified, or just repeated? | Can't inform a decision |
