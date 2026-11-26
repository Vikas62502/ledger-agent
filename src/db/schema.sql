CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'agent'
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY,
  serial TEXT NOT NULL UNIQUE,
  vrn TEXT,
  agent_id INTEGER,
  previous_owner_id INTEGER,
  status TEXT NOT NULL,
  activated INTEGER NOT NULL DEFAULT 0,
  order_id TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY,
  transaction_id TEXT NOT NULL UNIQUE,
  agent_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  bank_reference TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  from_agent_id INTEGER NOT NULL,
  to_agent_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  tags_ordered INTEGER NOT NULL,
  tags_dispatched INTEGER NOT NULL,
  tags_pending INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_logs (
  id INTEGER PRIMARY KEY,
  level TEXT NOT NULL,
  job TEXT NOT NULL,
  message TEXT NOT NULL,
  correlation_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_txn_reference ON transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_txn_bank_ref ON transactions(bank_reference);
CREATE INDEX IF NOT EXISTS idx_tags_serial ON tags(serial);
CREATE INDEX IF NOT EXISTS idx_tags_vrn ON tags(vrn);
CREATE INDEX IF NOT EXISTS idx_orders_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_logs_corr ON app_logs(correlation_id);
