#!/usr/bin/env python3
"""
Migration: add missing federation-intelligence and edge-node columns.
Safe to run multiple times (idempotent).

Usage (from repo root):
    python scripts/migrate_db.py
"""
import sqlite3
import pathlib

DB_PATH = pathlib.Path(__file__).parent.parent / "ibvap.db"

INTELLIGENCE_COLS = [
    ("event_id",           "TEXT"),
    ("edge_node_id",       "TEXT"),
    ("camera_id",          "TEXT"),
    ("event_type",         "TEXT"),
    ("object_type",        "TEXT"),
    ("tracking_reference", "INTEGER"),
    ("risk_level",         "TEXT"),
    ("risk_score",         "INTEGER"),
    ("location_reference", "TEXT"),
    ("evidence_hash",      "TEXT"),
    ("sync_state",         "TEXT"),
    ("idempotency_key",    "TEXT"),
]

EDGE_NODE_COLS = [
    ("last_heartbeat", "DATETIME"),
]

SECTOR_COLS = [
    ("last_sync", "DATETIME"),
]

def migrate_table(cur, table: str, cols: list[tuple[str, str]]) -> list[str]:
    existing = {row[1] for row in cur.execute(f"PRAGMA table_info({table})").fetchall()}
    added = []
    for col_name, col_type in cols:
        if col_name not in existing:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
            added.append(col_name)
    return added

def main():
    print(f"Migrating: {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    added = migrate_table(cur, "intelligence_records", INTELLIGENCE_COLS)
    if added:
        print(f"  intelligence_records: added {added}")
        cur.execute("UPDATE intelligence_records SET sync_state='SYNCED' WHERE sync_state IS NULL")
        cur.execute("UPDATE intelligence_records SET risk_level='MEDIUM' WHERE risk_level IS NULL")
        cur.execute("UPDATE intelligence_records SET object_type='person' WHERE object_type IS NULL")
        cur.execute("UPDATE intelligence_records SET risk_score=50 WHERE risk_score IS NULL")

    added = migrate_table(cur, "edge_nodes", EDGE_NODE_COLS)
    if added:
        print(f"  edge_nodes: added {added}")

    added = migrate_table(cur, "sectors", SECTOR_COLS)
    if added:
        print(f"  sectors: added {added}")

    conn.commit()
    conn.close()
    print("Migration complete (idempotent).")

if __name__ == "__main__":
    main()
