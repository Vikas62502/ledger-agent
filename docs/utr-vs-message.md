# UTR vs PhonePe Message

On Chairbord-style Cashfree top-ups:

- **Message** (often 10 digits, e.g. `6821438796`) is the Cashfree payment id.
  It is stored on the wallet ledger as `reference_id`.
- **UTR** (often 12 digits, e.g. `826840318056`) is the bank/UPI reference.
  It maps through payment webhook `bank_reference` to the same credit.

When an agent asks "why wasn't my PhonePe credited?", first search Message/`reference_id`.
If they pasted the labeled UTR, search `bank_reference`.

Never invent whether money was credited — always query the ledger tools.
