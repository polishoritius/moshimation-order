CREATE TABLE IF NOT EXISTS credentials (
 number TEXT PRIMARY KEY, callsign TEXT NOT NULL, rank TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('active','revoked')),
 version INTEGER NOT NULL CHECK(version > 0), salt TEXT NOT NULL, hash TEXT NOT NULL,
 failures INTEGER NOT NULL DEFAULT 0, lock_until INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL
);