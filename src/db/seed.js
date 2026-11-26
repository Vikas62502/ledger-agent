const fs = require("fs");
const { getDb, dbPath, resetCache } = require("./connection");

resetCache();
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = getDb();

const insertAgent = db.prepare(
  `INSERT INTO agents (id, name, mobile, role) VALUES ($id, $name, $mobile, $role)`
);
const insertTag = db.prepare(
  `INSERT INTO tags (serial, vrn, agent_id, previous_owner_id, status, activated, order_id)
   VALUES ($serial, $vrn, $agent_id, $previous_owner_id, $status, $activated, $order_id)`
);
const insertTxn = db.prepare(
  `INSERT INTO transactions
   (transaction_id, agent_id, type, amount, reason, reference_id, bank_reference, created_at)
   VALUES ($transaction_id, $agent_id, $type, $amount, $reason, $reference_id, $bank_reference, $created_at)`
);
const insertOrder = db.prepare(
  `INSERT INTO orders
   (order_id, from_agent_id, to_agent_id, status, tags_ordered, tags_dispatched, tags_pending, created_at)
   VALUES ($order_id, $from_agent_id, $to_agent_id, $status, $tags_ordered, $tags_dispatched, $tags_pending, $created_at)`
);
const insertLog = db.prepare(
  `INSERT INTO app_logs (level, job, message, correlation_id, created_at)
   VALUES ($level, $job, $message, $correlation_id, $created_at)`
);

const agents = [
  { id: 1, name: "Asha Verma", mobile: "9876543210", role: "agent" },
  { id: 2, name: "Ravi Kumar", mobile: "9123456780", role: "agent" },
  { id: 3, name: "Demo SubMaster", mobile: "9000011122", role: "sub-master" },
  { id: 4, name: "Demo Master", mobile: "9000099988", role: "master" },
];

const tags = [
  {
    serial: "608268-007-0029555",
    vrn: "RJ14AB1234",
    agent_id: 1,
    previous_owner_id: 4,
    status: "Acknowledged",
    activated: 0,
    order_id: "ORDER0000000001",
  },
  {
    serial: "608268-007-0117501",
    vrn: "KL33K2896",
    agent_id: 2,
    previous_owner_id: 4,
    status: "Activated",
    activated: 1,
    order_id: "ORDER0000000002",
  },
  {
    serial: "608268-007-0117502",
    vrn: null,
    agent_id: null,
    previous_owner_id: 4,
    status: "Available",
    activated: 0,
    order_id: null,
  },
  {
    serial: "608268-007-0117503",
    vrn: null,
    agent_id: 1,
    previous_owner_id: 4,
    status: "Dispatched",
    activated: 0,
    order_id: "ORDER0000000001",
  },
];

const txns = [
  {
    transaction_id: "TRANS261024084359070DEMO01",
    agent_id: 3,
    type: "credit",
    amount: 1,
    reason: "Wallet Topup",
    reference_id: "6821438796",
    bank_reference: "826840318056",
    created_at: "2026-10-24T08:43:59.000Z",
  },
  {
    transaction_id: "TRANS261024083526652DEMO02",
    agent_id: 1,
    type: "credit",
    amount: 100,
    reason: "Wallet Topup",
    reference_id: "6821333885",
    bank_reference: "664134635915",
    created_at: "2026-10-24T08:35:26.000Z",
  },
  {
    transaction_id: "TRANS261024084707353DEMO03",
    agent_id: 2,
    type: "credit",
    amount: 10,
    reason: "KL33K2896_Refund_tag_cost",
    reference_id: null,
    bank_reference: null,
    created_at: "2026-10-24T08:47:07.000Z",
  },
  {
    transaction_id: "TRANS261024084707353DEMO04",
    agent_id: 2,
    type: "credit",
    amount: 25,
    reason: "Offer Applied_EXCLUSIVE RAJASTHAN",
    reference_id: null,
    bank_reference: null,
    created_at: "2026-10-24T08:47:08.000Z",
  },
  {
    transaction_id: "TRANS261024084000000DEMO05",
    agent_id: 1,
    type: "debit",
    amount: 399,
    reason: "Tag Issuance_RJ14AB1234",
    reference_id: null,
    bank_reference: null,
    created_at: "2026-10-24T08:40:00.000Z",
  },
];

const orders = [
  {
    order_id: "ORDER0000000001",
    from_agent_id: 1,
    to_agent_id: 4,
    status: "Dispatched",
    tags_ordered: 10,
    tags_dispatched: 2,
    tags_pending: 8,
    created_at: "2026-10-20T10:00:00.000Z",
  },
  {
    order_id: "ORDER0000000002",
    from_agent_id: 2,
    to_agent_id: 4,
    status: "Acknowledge",
    tags_ordered: 1,
    tags_dispatched: 1,
    tags_pending: 0,
    created_at: "2026-10-18T09:00:00.000Z",
  },
];

const logs = [
  {
    level: "error",
    job: "ledger-agent-demo",
    message: "PGCreateOrder failed for reference_id=9999999999: customer_phone invalid",
    correlation_id: "9999999999",
    created_at: "2026-10-24T09:00:00.000Z",
  },
  {
    level: "info",
    job: "ledger-agent-demo",
    message: "Wallet topup credited reference_id=6821438796 amount=1",
    correlation_id: "6821438796",
    created_at: "2026-10-24T08:43:59.000Z",
  },
  {
    level: "warn",
    job: "ledger-agent-demo",
    message: "Partial dispatch ORDER0000000001: mapped=2 pending=8 status=Dispatched",
    correlation_id: "ORDER0000000001",
    created_at: "2026-10-20T11:00:00.000Z",
  },
  {
    level: "error",
    job: "ledger-agent-demo",
    message: "Bajaj OTP blocked: serial 608268-007-0117503 status=Dispatched (needs Acknowledged)",
    correlation_id: "608268-007-0117503",
    created_at: "2026-10-21T12:00:00.000Z",
  },
];

db.exec("BEGIN");
try {
  for (const a of agents) {
    insertAgent.run({ $id: a.id, $name: a.name, $mobile: a.mobile, $role: a.role });
  }
  for (const t of tags) {
    insertTag.run({
      $serial: t.serial,
      $vrn: t.vrn,
      $agent_id: t.agent_id,
      $previous_owner_id: t.previous_owner_id,
      $status: t.status,
      $activated: t.activated,
      $order_id: t.order_id,
    });
  }
  for (const x of txns) {
    insertTxn.run({
      $transaction_id: x.transaction_id,
      $agent_id: x.agent_id,
      $type: x.type,
      $amount: x.amount,
      $reason: x.reason,
      $reference_id: x.reference_id,
      $bank_reference: x.bank_reference,
      $created_at: x.created_at,
    });
  }
  for (const o of orders) {
    insertOrder.run({
      $order_id: o.order_id,
      $from_agent_id: o.from_agent_id,
      $to_agent_id: o.to_agent_id,
      $status: o.status,
      $tags_ordered: o.tags_ordered,
      $tags_dispatched: o.tags_dispatched,
      $tags_pending: o.tags_pending,
      $created_at: o.created_at,
    });
  }
  for (const l of logs) {
    insertLog.run({
      $level: l.level,
      $job: l.job,
      $message: l.message,
      $correlation_id: l.correlation_id,
      $created_at: l.created_at,
    });
  }
  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  throw err;
}

console.log("Seeded ledger.db", {
  agents: agents.length,
  tags: tags.length,
  txns: txns.length,
  orders: orders.length,
  logs: logs.length,
  dbPath,
});
