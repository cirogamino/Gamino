# Job Order Spec

A job order is the only unit of work in the buzzroom. No agent does anything that isn't one.
This is what makes thirty concurrent agents legible instead of chaotic — you're not watching
thirty conversations, you're watching one board with thirty rows.

---

## The format

```yaml
id:            JO-20260813-014        # date + sequence, never reused
lane:          build | recon | mine | admin | prove
title:                                # one line, imperative: "Deploy gamino.com to Cloudflare"
assigned_to:                          # agent_id from the roster
why_this_agent:                       # cite the capability card. If you can't, you're guessing.
box:           90m                    # hard timebox
priority:      P0 | P1 | P2

inputs:                               # everything the agent needs; no scavenger hunts
  - repo/branch/path or URL
  - credentials location (never the credential itself)
  - upstream job order IDs it depends on

definition_of_done:                   # checkable by someone who wasn't there
  - "https://gamino.com returns HTTP 200 with the new hero section"
  - "Commit pushed to <branch>, CI green"

evidence_required:                    # see 05-anti-slop-standard.md — at least one per DoD line
  - url_200
  - commit_sha
  - command_output
  - screenshot

kill_criteria:                        # when to stop and report instead of grinding
  - "DNS not delegated to us → report BLOCKED, do not attempt registrar changes"
  - "Any single error repeats 3 times → report BLOCKED with the error"

escalate_to:                          # section lead agent_id
state:         QUEUED
audited_by:                           # auditor agent_id, filled at AUDITED
verdict:                              # ACCEPTED | REJECTED | BLOCKED
```

---

## Rules that keep this from degrading

**1. `why_this_agent` is mandatory.**
If you can't name the line on the capability card that justifies the assignment, you are
assigning by availability, not by strength. That is exactly how slop enters a fleet: the
wrong model doing work it can only fake. When in doubt, leave the job `QUEUED` and wait for
the right agent to free up.

**2. `definition_of_done` must be checkable by a stranger.**
"Website looks good" is not a DoD. "`curl -sI https://x.com | head -1` returns `HTTP/2 200`"
is. Write every DoD line as something an auditor with no context can verify in under a minute.

**3. `kill_criteria` are not optional.**
The most expensive failure mode in an agent fleet is not a wrong answer — it's an agent
spending ninety minutes in a retry loop against a wall it can't get over, while you think
it's working. Every job order names the walls in advance.

**4. One agent, one job order at a time.**
Parallelism comes from more agents, not from multitasking agents. An agent holding three job
orders will finish none of them well and will report on all three optimistically.

**5. Timebox is a hard stop, not a target.**
At the box, the agent submits what it has with an honest state. Partial work with an accurate
status is worth more than complete work you can't trust.

**6. The agent never sets its own verdict.**
`SUBMITTED` is the furthest an agent moves its own job order. See
[`05-anti-slop-standard.md`](./05-anti-slop-standard.md).

---

## Dependencies

Express them as `inputs`, not as prose. If JO-014 needs JO-009's output, JO-014 stays `QUEUED`
until JO-009 is `ACCEPTED` — not until it's `SUBMITTED`. Building on unaudited work is how one
bad claim propagates into ten downstream failures at 2am.

---

## Board schema (Supabase)

```sql
create table job_orders (
  id              text primary key,
  lane            text not null,
  title           text not null,
  assigned_to     text references agents(agent_id),
  why_this_agent  text not null,
  box_minutes     int  not null,
  priority        text not null default 'P1',
  inputs          jsonb not null default '[]',
  definition_of_done jsonb not null,
  evidence_required  jsonb not null,
  kill_criteria      jsonb not null default '[]',
  escalate_to     text,
  state           text not null default 'QUEUED',
  evidence        jsonb default '[]',   -- filled by the worker at SUBMITTED
  audited_by      text,
  verdict         text,
  audit_notes     text,
  created_at      timestamptz default now(),
  submitted_at    timestamptz,
  closed_at       timestamptz
);

create index on job_orders (state, lane, priority);
```

A view of `state, lane, assigned_to, title, box_minutes` sorted by `submitted_at`
is your buzzroom floor view — one screen, everyone working, who's stuck, what's waiting on audit.
