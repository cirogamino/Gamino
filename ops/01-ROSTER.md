# THE ROSTER — seats, lanes, write-locks, challenger pairs

Ten seats. Each is assigned to the AI whose genuine architectural strengths fit
the lane — not arbitrarily. If you don't have one of these AIs, leave the seat
empty and reassign its lane to the nearest seat; if you have one not listed, use
`ops/prompts/_TEMPLATE.md`.

The rule that makes this work: **every seat operates as though it is the only AI
on the team** (Law 1), while still owning one lane it is accountable for. The lane
is what you're graded on. The rest is what you do anyway when nobody else moves.

---

| Seat | Assigned AI | Why this AI | Owns (write-lock) | Challenger |
|---|---|---|---|---|
| **CHAIR / BUILD** | Claude Code | Only seat with a real filesystem, git, deploys, and scheduled execution. It can actually ship and it holds the written record. | `/app`, `/ops/board`, infra, deploys | PRODUCT |
| **PRODUCT** | ChatGPT | Strongest all-round reasoning plus code interpreter, image generation, and agentic browsing in one surface. Best at offer design and conversion copy. | `/product`, offer, pricing, landing copy, checkout flow | CHAIR |
| **RESEARCH** | Gemini | Very large context window, Deep Research, and native Google/YouTube surface access. Best at ingesting a market whole. | `/research`, market sizing, competitor teardowns, demand validation | VERIFY |
| **DISTRIBUTION** | Grok | Native real-time X access and a voice that survives on that platform. Best at what is spiking right now. | `/distribution`, launch threads, trend-jacking, hooks | VERIFY |
| **VERIFY** | Perplexity | Citation-first architecture. Its answers come with sources by construction, which is exactly what a fact desk needs. | `/verify`, claim checks, pricing benchmarks, compliance sanity | RESEARCH |
| **OPS** | Copilot | Deepest Office/Excel/Windows integration. Best at the documents and models a business actually runs on. | `/ops-docs`, SOPs, financial model, unit economics, invoicing | CHAIR |
| **ENGINEERING** | DeepSeek | Strong technical reasoning at very low cost — the right seat for volume code review and algorithmic grind. | `/engineering`, code review, automation scripts, technical QA | CHAIR |
| **COMMUNITY** | Meta AI / Llama | Native to the Meta surfaces (IG/FB) where a consumer digital product finds its audience; open weights for anything self-hosted. | `/community`, IG/FB content, comment handling, audience building | DISTRIBUTION |
| **VOLUME** | Mistral / Le Chat | Fast and cheap at bulk generation and multilingual variants. The seat for "produce 200 of these." | `/volume`, bulk assets, localization, variant testing | PRODUCT |
| **EXECUTION** | Manus / autonomous browser agent | The only seat that can drive a browser through multi-step real-world tasks unattended. | `/execution`, signups, uploads, posting, listing submission | OPS |

---

## Challenger pairs (adversarial review map)

```
CHAIR  ⇄  PRODUCT
RESEARCH  ⇄  VERIFY
DISTRIBUTION  →  VERIFY  →  RESEARCH
COMMUNITY  →  DISTRIBUTION
VOLUME  →  PRODUCT
ENGINEERING  →  CHAIR
EXECUTION  →  OPS
```

A Challenger's job is to **try to kill the work**, in writing, before it ships.
"Looks good" is not a review. A valid review names at least one specific way the
artifact fails, or states explicitly: `ATTEMPTED KILL, FAILED — reason: <x>`.

---

## The one-decider rule

At any moment exactly one seat is **Chair**. The Chair:

- tallies scores and issues the Build Order,
- breaks every tie within one cycle,
- holds the written record in `board/DECISIONS.md`,
- may override a score with a one-sentence written reason,
- declares kills.

Default Chair is **Claude Code**, because it is the only seat that can write to
the permanent record without a human relaying. Rotate the Chair between runs, not
during one.

---

## If you have fewer than ten AIs

Collapse in this order — the lanes that matter most stay staffed longest:

1. CHAIR/BUILD (never collapse)
2. PRODUCT (never collapse)
3. VERIFY (never collapse — this is the seat that stops you shipping something false)
4. DISTRIBUTION
5. RESEARCH
6. OPS
7. ENGINEERING
8. EXECUTION
9. COMMUNITY
10. VOLUME

A three-AI team of CHAIR + PRODUCT + VERIFY is a functioning company. Everything
above that is throughput.
