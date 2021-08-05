PRAGMA auto_vacuum = INCREMENTAL;

CREATE TABLE IF NOT EXISTS token_price (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token   VARCHAR(42) NOT NULL,
    price   VARCHAR(64) NOT NULL,
    price_usd   VARCHAR(64) NULL,
    created_at INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token ON token_price (token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_token_created_at ON token_price (token, created_at);

CREATE TABLE IF NOT EXISTS lp_token_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token   VARCHAR(42) NOT NULL,
    token0   VARCHAR(42) NOT NULL,
    token1   VARCHAR(42) NULL,
    created_at INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lp_history_token ON lp_token_history (token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lp_created_at ON lp_token_history (token, created_at);
