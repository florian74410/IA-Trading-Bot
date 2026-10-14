'use strict';
/* IA-TB Auth P2.2 — isolated coordinator primitive (NOT wired to runtime).
 * This module does not access disks, databases, wallets, network or secrets.
 * A participant must block NEW writes before it returns a QUIESCED ACK, and
 * must invalidate an epoch on RELEASE/ABORT, including if a prepare finishes late.
 * This primitive alone DOES NOT guarantee inter-service consistency.
 */

class SnapshotCoordinator {
  constructor({ writerIds, timeoutMs = 3000 } = {}) {
    if (!Array.isArray(writerIds) || !writerIds.length ||
        writerIds.some(id => typeof id !== 'string' || !/^[a-z0-9][a-z0-9._-]*$/i.test(id)) ||
        new Set(writerIds).size !== writerIds.length) {
      throw new Error('SNAPSHOT_INVALID_WRITER_ALLOWLIST');
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) {
      throw new Error('SNAPSHOT_INVALID_TIMEOUT');
    }
    this.writerIds = [...writerIds];
    this.timeoutMs = timeoutMs;
    this.writers = new Map();
    this.state = 'IDLE';
    this.epoch = 0;
  }

  register(id, hooks) {
    if (this.state !== 'IDLE') throw new Error('SNAPSHOT_COORDINATOR_BUSY');
    if (!this.writerIds.includes(id)) throw new Error('SNAPSHOT_UNKNOWN_WRITER');
    if (this.writers.has(id)) throw new Error('SNAPSHOT_DUPLICATE_WRITER');
    if (!hooks || ['prepare', 'release', 'abort'].some(key => typeof hooks[key] !== 'function')) {
      throw new Error('SNAPSHOT_INVALID_HOOKS');
    }
    this.writers.set(id, hooks);
  }

  unregister(id) {
    if (this.state !== 'IDLE') throw new Error('SNAPSHOT_COORDINATOR_BUSY');
    this.writers.delete(id);
  }

  async withTimeout(action) {
    let timer;
    try {
      return await Promise.race([
        Promise.resolve().then(action),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('SNAPSHOT_ACK_TIMEOUT')), this.timeoutMs);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async execute(capture) {
    if (this.state !== 'IDLE') throw new Error('SNAPSHOT_COORDINATOR_BUSY');
    if (typeof capture !== 'function') throw new Error('SNAPSHOT_INVALID_CAPTURE');
    if (this.writerIds.some(id => !this.writers.has(id))) throw new Error('SNAPSHOT_WRITER_MISSING');

    this.state = 'PREPARING';
    const epoch = ++this.epoch;
    const visited = [];
    let error = null;
    let result;
    try {
      // Serial ACKs are deliberate here: simple, bounded and infrequent.
      // The caller does not receive permission to capture before ALL ACKs.
      for (const id of this.writerIds) {
        const hooks = this.writers.get(id);
        visited.push({ id, hooks });
        const ack = await this.withTimeout(() => hooks.prepare(epoch));
        if (!ack || ack.epoch !== epoch || ack.writerId !== id || ack.pending !== 0) {
          throw new Error('SNAPSHOT_INVALID_ACK');
        }
      }
      this.state = 'QUIESCED';
      result = await capture({ epoch });
    } catch (e) {
      error = e;
    }

    this.state = error ? 'ABORTING' : 'RELEASING';
    // Always signal all visited writers, including the one whose prepare failed.
    // A late prepare must ignore an already-aborted generation.
    const failures = [];
    for (const { id, hooks } of visited.reverse()) {
      try {
        await this.withTimeout(() => (error ? hooks.abort(epoch) : hooks.release(epoch)));
      } catch (_) {
        failures.push(id);
      }
    }
    if (failures.length) {
      // Never report readiness if any participant cannot be released/aborted.
      this.state = 'BLOCKED';
      throw new Error('SNAPSHOT_CLEANUP_FAILED');
    }
    this.state = 'IDLE';
    if (error) throw error;
    return result;
  }
}

module.exports = { SnapshotCoordinator };
