# SOP — Workers' comp class code audit (lever 21)

**Kind:** SOP. The system tracks whether this is due and estimates the exposure.
It cannot perform the audit — that happens on a phone call with your broker.

**Cadence:** annually, and immediately whenever you add a trade.
**Time:** about 90 minutes, most of it waiting for a callback.
**Owner:** the owner. Do not delegate this one; it needs someone who knows what
the crew actually did all year.

---

## Why this exists

Workers' comp is charged as a percentage of payroll, and the percentage depends
on the class code each employee is assigned. Those codes vary enormously:

| Class code | Indicative rate (% of payroll) |
|---|---|
| Building maintenance | ~6.2% |
| HVAC | ~8.1% |
| Carpentry | ~11.8% |
| Excavation | ~21.3% |

*(Indicative only. Real rates vary by state, carrier, and your experience mod.
`INDICATIVE_COMP_RATES` in `app/ops/cost.ts` carries the same figures and is
labelled the same way.)*

On $80k of payroll, the gap between the maintenance code and the carpentry code
is about **$4,500 a year, per tech**. Nobody sends you a letter about it. The
misassignment simply sits there, and you pay it every month.

Two directions it goes wrong, and both cost you:

- **Assigned too high** — you overpay, quietly, forever.
- **Assigned too low** — you underpay, and at the annual audit the carrier
  reclassifies you and issues a back-charge for the whole period. This is the
  worse one, because it arrives as a single unbudgeted bill.

## Before you call

Run the tracker and take the output with you:

```bash
npm run typecheck   # sanity
node -e "
  const { auditCompCodes } = await import('./app/ops/cost.ts');
  // feed it your real assignments and payroll
"
```

In the app this is `auditCompCodes(assignments, annualPayrollPerTech)`. It
compares each tech's **assigned** code against where their hours **actually**
went and returns the ones that do not match, with the annual variance.

You need three things on the call:

1. The findings list — which techs are misassigned and by how much.
2. Actual hours by activity for the review period, per tech. Not job titles —
   hours. "Carpentry-titled but 70% of hours on filter changes" is the argument.
3. Your current declarations page showing assigned codes and rates.

## The call

Ask your broker, in this order:

1. **"Confirm the class code assigned to each of my employees, and the rate."**
   Get it in writing. Verbal confirmations do not survive an audit.
2. **"Given this actual hours breakdown, is each assignment correct?"** Present
   the hours, not your opinion.
3. **"If a code is wrong, can it be corrected retroactively for this policy
   period, and what does that do to my premium?"**
4. **"Which activities in my mix would trigger a higher code?"** This is how you
   find out in advance that adding excavation reclassifies the crew — before you
   buy the excavator, not after.
5. **"What's my experience mod, and what drives it?"**

## Record the result

Update `lastAuditedAt` so `compAuditDue()` stops flagging it. A completed audit
with no record is an audit you will redo next year.

## Do not

- **Do not assign a lower code to save premium.** That is not a saving, it is a
  deferred back-charge with penalties attached, and it can void coverage on a
  claim in the misassigned activity.
- **Do not skip this after adding a trade.** Adding waterproofing to a carpentry
  shop is exactly the change that reclassifies everyone.
- **Do not let it lapse past a year.** Corrections generally reach back over the
  current policy period; the further you drift, the less is recoverable.

## Definition of done

- [ ] Every tech's assigned code confirmed in writing by the broker
- [ ] Any mismatch corrected, with the premium effect quantified
- [ ] Experience mod understood and recorded
- [ ] `lastAuditedAt` updated in the system
- [ ] Next year's audit on the calendar
