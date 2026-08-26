# SOP: <tool>

> Written by: <proving agent> · Proven on: <date> · Verdict: ADOPT | TRIAL
> Audited by: <auditor> — followed this happy path from scratch: YES / NO

## What it's for

One paragraph. The job to reach for this tool for.

**Do not use it for:** — equally important. Every tool has a domain where it produces
confident garbage. Name that domain.

## Access

- Credentials location: *(where they live — never the secret itself)*
- Env vars / MCP server / endpoint:
- When auth fails:

## The happy path

Numbered, copy-pasteable, real parameter values. No placeholders an agent has to guess at.
An agent following these verbatim gets a working result.

1.
2.
3.

## Worked example

The real job order completed during the proving run.

- Job order: `JO-…`
- Inputs used:
- Commands / tool calls run:
- Output produced:
- Artifact: *(URL, path, or SHA)*

## Limits found

Measured, not documented.

| Limit | Value | How measured |
|---|---|---|
| Rate limit | | |
| Concurrency ceiling | | |
| Max payload / size | | |
| Latency at our volume | | |

## Failure modes

**The most valuable section in this document.** The happy path is in their docs; this isn't.
Every error hit during the proving run, verbatim, with the fix.

| Error (verbatim) | Cause | Fix |
|---|---|---|
| | | |

## Cost

- Worked example: 
- Extrapolated at 100×: 
- Billing model: *(flat / per-seat / usage — per-seat scales badly against an agent fleet)*

## Do not

Traps. Destructive operations. Anything that silently overwrites, publishes, bills, or
sends to a real customer.

- 
