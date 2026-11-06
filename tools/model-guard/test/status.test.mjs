import test from 'node:test';
import assert from 'node:assert/strict';
import { applyHooks } from '../scripts/install.mjs';
import { buildStatus, hooksFound, summarizeLog } from '../scripts/status.mjs';

const NOW = Date.parse('2026-11-01T12:00:00Z');
const line = (at, action) => JSON.stringify({ at, action });

test('a fully installed guard is running and offers uninstall', () => {
  const s = buildStatus({ settings: applyHooks({}), hasKey: true, now: NOW });
  assert.equal(s.state, 'running');
  assert.deepEqual(s.actions, ['uninstall']);
  assert.equal(s.note, undefined);
});
test('no hooks is stopped; some hooks is an error offering both actions', () => {
  assert.equal(buildStatus({ settings: {}, hasKey: true }).state, 'stopped');
  assert.deepEqual(buildStatus({ settings: {}, hasKey: true }).actions, ['install']);
  const some = applyHooks({});
  delete some.hooks.SessionStart;
  assert.equal(hooksFound(some), 3);
  const s = buildStatus({ settings: some, hasKey: true });
  assert.equal(s.state, 'error');
  assert.deepEqual(s.actions, ['install', 'uninstall']);
});
test('installed but no key says nothing is being checked, and never reports the key', () => {
  const s = buildStatus({ settings: applyHooks({}), hasKey: false });
  assert.match(s.note, /nothing is being checked/);
  assert.ok(s.fields.some((f) => f.label === 'Classifier key' && f.value === 'missing'));
});
test('the downgrade mode comes from the settings env', () => {
  const s = buildStatus({ settings: { ...applyHooks({}), env: { CLAUDE_GUARD_BLOCK_DOWNGRADES: '1' } }, hasKey: true });
  assert.equal(s.fields.find((f) => f.label === 'Downgrades').value, 'blocked');
});
test('log counts cover the last day only and skip lines that are not JSON', () => {
  const text = [line('2026-11-01T11:00:00Z', 'nudge'), line('2026-11-01T10:00:00Z', 'block'), line('2026-11-01T09:00:00Z', 'none'), line('2026-10-30T09:00:00Z', 'block'), 'garbage', ''].join('\n');
  assert.deepEqual(summarizeLog(text, NOW - 24 * 3600 * 1000), { prompts: 3, nudge: 1, block: 1, plan: 0 });
  const s = buildStatus({ settings: applyHooks({}), hasKey: true, logs: [text], now: NOW });
  assert.equal(s.fields.at(-1).value, '3 prompts, 1 nudged, 1 blocked');
});
