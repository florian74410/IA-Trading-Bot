#!/usr/bin/env python3
"""P2.1 isolated storage tests: fictitious SQLite, never GEN-1 or wallets."""
from __future__ import annotations

import hashlib
from contextlib import closing
import hmac
import os
import subprocess
from pathlib import Path
import sqlite3
import stat
import tempfile
import time
import unittest

import auth_storage_preflight as p

REPO = Path(__file__).resolve().parents[2]
MIGRATIONS = REPO / "App/Core/Clients/migrations"
FIXTURE_ID = "CL000101"
FIXTURE_EPOCH = "coherent-generation-1"


def mkdir_private(pth: Path) -> None:
    pth.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(pth, 0o700)


class StoragePreflightTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="iatb-p21-fixture-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        os.chmod(self.root, 0o700)
        (self.root / p.TEST_MARKER).write_text("IA-TB-AUTH-P21-FIXTURE\n")
        self.key = os.urandom(32)  # Ephemeral, fictitious and never sent anywhere.
        self.live_connections: list[sqlite3.Connection] = []
        for rel in ["runtime", "data", "state", "annexes", "updates",
                    "data/Database", "data/Security", "data/User Data/default",
                    "runtime/state/security"]:
            mkdir_private(self.root / rel)
        key_path = self.root / p.CLIENT_KEY
        key_path.write_text(self.key.hex() + "\n")
        os.chmod(key_path, 0o600)
        self._create_sqlite_fixture()
        self.addCleanup(self._close_live_connections)

    def _close_live_connections(self) -> None:
        for db in self.live_connections:
            db.close()
        self.live_connections.clear()

    def _create_sqlite_fixture(self) -> None:
        for rel in p.FIXTURE_DATABASES:
            db = sqlite3.connect(self.root / rel)
            db.execute("PRAGMA foreign_keys=ON")
            if rel.endswith("clients.sqlite"):
                result = db.execute("PRAGMA journal_mode=DELETE").fetchone()[0].lower()
                self.assertEqual(result, "delete")
                for script in ("001_clients_v1.sql", "002_client_accounts_v1.sql"):
                    db.executescript((MIGRATIONS / script).read_text())
                marker = hmac.new(self.key, p.TEST_CANARY + FIXTURE_ID.encode(), hashlib.sha256).hexdigest()
                db.execute("INSERT INTO clients(client_id,external_ref_hash,first_name_enc,created_at,updated_at) VALUES(?,?,?,?,?)",
                           (FIXTURE_ID, "fictitious-external-hash", marker, "2000-01-01", "2000-01-01"))
                db.execute("INSERT INTO client_accounts(client_id,username_enc,username_hash,password_salt,password_hash,role,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                           (FIXTURE_ID, "fictitious-user", "fake-index", "fake-salt", "fake-hash", "USER", "2000-01-01", "2000-01-01"))
            else:
                mode = db.execute("PRAGMA journal_mode=WAL").fetchone()[0].lower()
                self.assertEqual(mode, "wal")
                db.execute("CREATE TABLE public_fixture(payload TEXT NOT NULL)")
                db.execute("INSERT INTO public_fixture(payload) VALUES('fictitious-sample')")
            db.execute("CREATE TABLE fixture_generation(epoch TEXT NOT NULL)")
            db.execute("INSERT INTO fixture_generation(epoch) VALUES(?)", (FIXTURE_EPOCH,))
            db.commit()
            if not rel.endswith("clients.sqlite"):
                # Keep a WAL connection alive: committed data can remain in -wal.
                self.live_connections.append(db)
                self.assertTrue(Path(str(self.root / rel) + "-wal").exists())
            else:
                db.close()
            os.chmod(self.root / rel, 0o600)

    def test_readonly_preflight_never_changes_files(self):
        before = {str(x.relative_to(self.root)): (x.stat().st_mtime_ns, x.stat().st_size)
                  for x in self.root.rglob("*") if x.is_file()}
        result = p.metadata_preflight(self.root)
        after = {str(x.relative_to(self.root)): (x.stat().st_mtime_ns, x.stat().st_size)
                 for x in self.root.rglob("*") if x.is_file()}
        self.assertEqual(result["mode"], "READ_ONLY_METADATA")
        self.assertEqual(result["targets"][p.CLIENT_KEY]["mode"], "0600")
        self.assertTrue(result["ready_for_change"])
        self.assertEqual(before, after)

    def test_wal_delete_online_backup_and_restore_preserve_fixture(self):
        start = time.monotonic()
        snapshot = p.fixture_snapshot(self.root)
        self.assertTrue(snapshot.exists())
        self.assertEqual(stat.S_IMODE(snapshot.stat().st_mode), 0o700)
        for rel in p.FIXTURE_DATABASES:
            copied = snapshot / rel
            self.assertTrue(copied.exists())
            self.assertEqual(stat.S_IMODE(copied.stat().st_mode), 0o600)
            self.assertFalse(Path(str(copied) + "-wal").exists())
            self.assertFalse(Path(str(copied) + "-shm").exists())
        self.assertEqual(stat.S_IMODE((snapshot / p.CLIENT_KEY).stat().st_mode), 0o600)
        self.assertEqual(p._validate_fixture_bundle(snapshot), (FIXTURE_ID, FIXTURE_EPOCH))
        restored = p.fixture_restore(self.root, snapshot)
        self.assertEqual(p._validate_fixture_bundle(restored), (FIXTURE_ID, FIXTURE_EPOCH))
        self.assertTrue((self.root / "data/User Data/default/user_data.db-wal").exists())
        self.assertLess(time.monotonic() - start, 10.0, "Only smoke performance in CI, not real p95 benchmark")

    def test_missing_client_key_never_autogenerates(self):
        key_file = self.root / p.CLIENT_KEY
        key_file.unlink()
        self.assertFalse(p.metadata_preflight(self.root)["ready_for_change"])
        with self.assertRaisesRegex(p.UnsafeStorage, "CLIENT_MASTER_KEY_REQUIRED"):
            p.fixture_snapshot(self.root)
        self.assertFalse(key_file.exists())
        self.assertFalse((self.root / "_snapshots").exists())

    def test_mismatched_client_key_rejected_without_replacement(self):
        key_file = self.root / p.CLIENT_KEY
        new_key = os.urandom(32).hex() + "\n"
        key_file.write_text(new_key)
        with self.assertRaisesRegex(p.UnsafeStorage, "DOES_NOT_MATCH"):
            p.fixture_snapshot(self.root)
        self.assertEqual(key_file.read_text(), new_key)
        self.assertFalse((self.root / "_snapshots").exists())

    def test_broken_sqlite_rejected(self):
        self._close_live_connections()
        path = self.root / p.FIXTURE_DATABASES[2]
        path.write_bytes(b"NOT A SQLITE FILE")
        with self.assertRaises(sqlite3.DatabaseError):
            p.fixture_snapshot(self.root)
        self.assertFalse((self.root / "_snapshots").exists())

    def test_foreign_key_violation_rejected(self):
        path = self.root / p.FIXTURE_DATABASES[0]
        with closing(sqlite3.connect(path)) as db:
            db.execute("PRAGMA foreign_keys=OFF")
            db.execute("INSERT INTO client_accounts(client_id,username_enc,username_hash,password_salt,password_hash,role,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
                       ("CL999999", "bad", "bad", "bad", "bad", "USER", "x", "x"))
            db.commit()
        with self.assertRaisesRegex(p.UnsafeStorage, "FOREIGN_KEY"):
            p.fixture_snapshot(self.root)

    def test_inter_database_epoch_drift_rejected(self):
        db = self.live_connections[0]
        db.execute("UPDATE fixture_generation SET epoch='different-generation'")
        db.commit()
        with self.assertRaisesRegex(p.UnsafeStorage, "INTER_DATABASE_DRIFT"):
            p.fixture_snapshot(self.root)

    def test_failed_mid_backup_removes_partial_stage(self):
        with self.assertRaisesRegex(p.UnsafeStorage, "INJECTED_BACKUP_FAILURE"):
            p.fixture_snapshot(self.root, injected_failure_after=1)
        stage = self.root / "_snapshots"
        self.assertEqual(list(stage.iterdir()), [])
        self.assertEqual(p._validate_fixture_bundle(self.root), (FIXTURE_ID, FIXTURE_EPOCH))

    def test_symlink_in_path_rejected_without_follow(self):
        linked = self.root / "data/Security/client_master.key"
        linked.unlink()
        linked.symlink_to(self.root / "not-to-be-created.key")
        outcome = p.metadata_preflight(self.root)
        self.assertEqual(outcome["targets"][p.CLIENT_KEY]["kind"], "symlink_refused")
        self.assertFalse(outcome["ready_for_change"])
        with self.assertRaises(p.UnsafeStorage):
            p.fixture_snapshot(self.root)
        self.assertFalse((self.root / "not-to-be-created.key").exists())

    def test_fixture_guard_rejects_nonfixture_directories(self):
        with self.assertRaisesRegex(p.UnsafeStorage, "FIXTURE_SANDBOX_REQUIRED"):
            p.fixture_snapshot(Path("/var/lib/iatb/debug"))
        with self.assertRaisesRegex(p.UnsafeStorage, "FIXTURE_SANDBOX_REQUIRED"):
            p.fixture_snapshot(self.root / "data")

    def test_snapshot_key_deleted_before_restore_fails_closed(self):
        snap = p.fixture_snapshot(self.root)
        (snap / p.CLIENT_KEY).unlink()
        with self.assertRaisesRegex(p.UnsafeStorage, "CLIENT_MASTER_KEY_REQUIRED"):
            p.fixture_restore(self.root, snap)
        self.assertFalse((self.root / "_restored").exists())

    def test_real_client_crypto_aes_fixture_restoration(self):
        # Invoke the existing ClientCrypto module ONLY with an explicitly created
        # test key and temp DB. The normal metadata preflight imports no runtime.
        client_crypto = REPO / "App/Core/Clients/client_crypto.js"
        crypto_js = """const C=require(process.argv[1]);
const c=new C(process.argv[2]);
const command=process.argv[3], value=process.argv[4];
process.stdout.write(command==='seal'?c.seal(value):c.open(value));
"""

        def invoke(keyfile, operation, payload):
            return subprocess.run(
                ["node", "-e", crypto_js, str(client_crypto), str(keyfile), operation, payload],
                capture_output=True, text=True, timeout=10,
            )

        keyfile = self.root / p.CLIENT_KEY
        fictitious_identity = "SIMULATION-ONLY-NO-REAL-USER"
        sealed = invoke(keyfile, "seal", fictitious_identity)
        self.assertEqual(sealed.returncode, 0, sealed.stderr[:160])
        client_db = self.root / p.FIXTURE_DATABASES[0]
        with closing(sqlite3.connect(client_db)) as db:
            db.execute("UPDATE clients SET last_name_enc=? WHERE client_id=?", (sealed.stdout, FIXTURE_ID))
            db.commit()
        snapshot = p.fixture_snapshot(self.root)
        restored = p.fixture_restore(self.root, snapshot)
        with closing(sqlite3.connect(restored / p.FIXTURE_DATABASES[0])) as db:
            encrypted = db.execute("SELECT last_name_enc FROM clients WHERE client_id=?", (FIXTURE_ID,)).fetchone()[0]
        opened = invoke(restored / p.CLIENT_KEY, "open", encrypted)
        self.assertEqual(opened.returncode, 0, opened.stderr[:160])
        self.assertEqual(opened.stdout, fictitious_identity)
        # A different key cannot decrypt the copied AES-GCM identity.
        restored_key = restored / p.CLIENT_KEY
        restored_key.write_text(os.urandom(32).hex() + "\n")
        wrong = invoke(restored_key, "open", encrypted)
        self.assertNotEqual(wrong.returncode, 0)

    def test_no_wallet_created_or_modified(self):
        self.assertFalse((self.root / "data/Security/wallet_master.key").exists())
        snap = p.fixture_snapshot(self.root)
        p.fixture_restore(self.root, snap)
        self.assertFalse((self.root / "data/Security/wallet_master.key").exists())
        self.assertFalse((snap / "data/Security/wallet_master.key").exists())

    def test_snapshot_repeat_does_not_mutate_source_generation(self):
        one = p.fixture_snapshot(self.root)
        two = p.fixture_snapshot(self.root)
        self.assertNotEqual(one, two)
        self.assertEqual(p._validate_fixture_bundle(self.root), (FIXTURE_ID, FIXTURE_EPOCH))
        self.assertEqual(p._validate_fixture_bundle(one), p._validate_fixture_bundle(two))


if __name__ == "__main__":
    unittest.main(verbosity=2)
