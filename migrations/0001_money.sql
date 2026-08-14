-- Money page: balance history and refill log.
--
-- Both tables are append-only. Nothing is ever updated in place, because the
-- history IS the chart — an overwritten row is a spike you can no longer see.

CREATE TABLE IF NOT EXISTS readings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id   TEXT    NOT NULL,
  -- Balance in the vendor's own unit (usd / credits / characters).
  balance     REAL    NOT NULL,
  -- How this reading was obtained: manual | email | api.
  source      TEXT    NOT NULL DEFAULT 'manual',
  ts          TEXT    NOT NULL,
  note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_readings_vendor_ts ON readings (vendor_id, ts);

CREATE TABLE IF NOT EXISTS refills (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id   TEXT    NOT NULL,
  -- What you actually paid, always in USD, regardless of what it bought.
  amount_usd  REAL    NOT NULL,
  source      TEXT    NOT NULL DEFAULT 'manual',
  ts          TEXT    NOT NULL,
  note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_refills_vendor_ts ON refills (vendor_id, ts);
