# Ops diagnose (demo)

When agents ask:

- why a **tag is not assigning / OTP blocked**
- why an **order is not showing**
- why **fewer tags were mapped** than ordered

…use grounded tools (`explain_tag`, `explain_order`), not guesses.

Common demo codes:

- `TAG_PENDING_ACK` — status Dispatched, needs Acknowledged
- `TAG_UNMAPPED` — Available with no agent owner
- `ORDER_PARTIAL_DISPATCH_STUCK` — Dispatched while tags_pending > 0

For runtime exceptions, use `search_logs` (fake Loki). Money facts still come from ledger SQL tools.
