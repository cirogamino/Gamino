# RUN-01 — THE 24-HOUR AUTONOMY TEST

The test: Ciro grants every permission, states the assignment, walks out, and is
unreachable for 24 hours. The team strategizes, decides, builds, launches, and
sells. Goal: **real money from a digital product, with no human in the loop.**

---

## What "success" means (declare this before you leave, not after)

Grade the run against these, in order. Be honest about which tier you hit.

| Tier | Bar |
|---|---|
| **S** | Real revenue from a stranger. Any amount. A stranger paying $7 is a categorically different event from a friend paying $700. |
| **A** | Live, working funnel: product exists, checkout works, a real test transaction cleared, traffic is arriving. No sale yet. |
| **B** | Product built and deployed, checkout not live or not tested end-to-end. |
| **C** | Decision made, assets partially built, nothing deployed. |
| **F** | Debate, documents, no artifact a stranger can reach. |

Most first runs land at B or C. That is not failure — it tells you exactly which
permission or capability gap to close before RUN-02. **F is the only real
failure, and it is almost always caused by missing pre-authorization**, which is
what the checklist below exists to prevent.

Predict your tier before you leave. Write it down. Compare on return. That
comparison is worth more than the run itself.

---

## PRE-DEPARTURE CHECKLIST — do all of this before you walk out

The entire run dies on any unchecked box. Every one of these is a thing only a
human with ID and a credit card can do, which is exactly why it must happen now.

### Money in
- [ ] Payment processor live and **out of test mode** (Stripe, Gumroad, Lemon
      Squeezy, Paddle). Gumroad or Lemon Squeezy if you want zero setup; Stripe
      if you want control.
- [ ] Payouts connected to a real bank account. A processor that can charge but
      can't pay out is a trap.
- [ ] One test purchase made by you, at $1, refunded. Confirm the money moved.
- [ ] A product/price object already created and its checkout link copied into
      `board/LEDGER.md`. The team can then change copy around a link that works.

### Hosting and delivery
- [ ] Domain purchased and DNS pointed, or an accepted subdomain confirmed.
- [ ] Hosting/deploy credentials available to CHAIR (Cloudflare/Vercel/Netlify).
- [ ] Delivery mechanism decided and tested: does the buyer get a download link,
      an email, or account access? Test it once with your own address.
- [ ] Transactional email working (a real sending domain, verified). Buyers who
      pay and receive nothing generate chargebacks.

### Accounts and access
- [ ] Every social/publishing account the run needs already exists and is logged
      in, on the surface the EXECUTION seat will use. Account creation mid-run
      triggers phone verification, and the run stops dead.
- [ ] API keys placed where seats can reach them (never pasted into a chat window
      — use the repo's secret store or the platform's env vars).
- [ ] GitHub access for CHAIR confirmed, on the working branch.

### Authorization
- [ ] Spend cap set, stated as a number, and enforced by a prepaid card or a
      processor limit rather than by trust. Suggested first run: **$50–100**.
- [ ] Written scope: what the team may publish publicly under which brand name.
- [ ] Written blacklist: what they may never touch (local business, personal
      accounts, existing clients).
- [ ] Refund policy decided and written, so support answers can be automated.
- [ ] Someone reachable for genuine emergencies (account compromise, legal
      notice) — this is not you being the bottleneck, it is a fire alarm.

### The board
- [ ] `board/LEDGER.md` seeded with: checkout link, domain, deploy target, spend
      cap, delivery mechanism, brand name.
- [ ] Every seat has its prompt pasted and has ACK'd.
- [ ] Rounds 1–3 complete and the Build Order is posted.
- [ ] Idea Freeze declared.

**If more than three boxes are unchecked, do not start the run.** Run the
boardroom rounds anyway — they're free and the output is valuable — but call it a
planning run, close the gaps, and start the clock tomorrow.

---

## The hour map

Hours are relative to departure. Every seat works its lane continuously; this is
the checkpoint spine, not a schedule of when to start.

| Hours | Phase | Gate to pass |
|---|---|---|
| **H0** | Departure. Build Order live, Idea Freeze on. | Every seat has ACK'd its workstream. |
| **H0–H2** | Foundations. CHAIR stands up the repo/deploy. PRODUCT locks the offer spec and price. RESEARCH delivers demand evidence. VERIFY audits every public claim. | Offer spec frozen. If the offer isn't frozen at H2, kill the run and restart the boardroom. |
| **H2–H8** | Build. VOLUME and PRODUCT produce the deliverable. ENGINEERING reviews. CHAIR deploys the landing page. OPS writes the unit economics and the support SOP. | Product artifact exists at a path. Landing page deployed. |
| **H8–H10** | Wire the money. CHAIR connects checkout to the pre-made link. EXECUTION runs a real end-to-end test purchase. | **Hard gate: a real transaction has cleared and delivered.** Nothing else matters until this is true. |
| **H10–H16** | Distribution. DISTRIBUTION and COMMUNITY publish. EXECUTION submits to directories/marketplaces. VERIFY vetoes any unsupportable claim before it goes out. | Traffic is measurably arriving. |
| **H16–H22** | Iterate on evidence. Read the funnel data. Fix the biggest drop-off. Do not redesign the product. | One measured improvement shipped. |
| **H22–H24** | Close out. CHAIR writes the after-action report: what shipped, what it earned, what broke, what permission was missing, what to change for RUN-02. | Report in `board/DECISIONS.md`. |

**The H8–H10 gate is the whole test.** A team that reaches a cleared transaction
has built a business. A team that reaches H16 with a beautiful product and no
working checkout has built a hobby. If the run is behind, sacrifice the product's
quality to protect the money path — a mediocre product that can be bought beats a
great one that cannot.

---

## Kill criteria for RUN-01

Declare the run dead and stop burning cycles if:

- No offer spec frozen by H2.
- No deployed URL by H10.
- No cleared test transaction by H12.
- Spend exceeds the cap (immediate stop, no discussion).
- Any seat proposes something that fails the Law 10 floor and another seat
  supports it — stop and wait for Ciro. That is a judgment failure, not a task
  failure, and it needs a human.

A killed run is a successful experiment with a negative result. Write down which
criterion fired and why, and RUN-02 starts smarter.

---

## What to expect, honestly

First run, ten AIs, twenty-four hours, no human: **expect tier B or C.** Not
because the AIs are slow — they aren't — but because the friction is almost never
cognitive. It's a phone verification, a payout account in review, an unverified
sending domain, a platform that requires a human click. Those are permission and
identity walls, and no amount of AI throughput goes through them.

Which is the actual finding worth having: the bottleneck was never your thinking
speed. It's the small number of places where the world demands a legal person.
Every run, you close a few of those permanently, and the ceiling rises. That's the
path to the six-month vacation — not a smarter prompt, but a shorter list of
things that require you specifically.

Run it four times and the list gets short.
