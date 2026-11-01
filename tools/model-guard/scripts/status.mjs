// One line of JSON saying whether model-guard is installed and what it has been doing, in the shape
// the agent-notify dashboard's Resources tab reads (see tools/concurrency, "resources").
//
//   node scripts/status.mjs [--json] [projectDir ...]
//
// The decision log is per project (<dir>/.claude/model-guard.log.jsonl), so the "last 24h" counts cover
// only the project folders named on the command line. Only whether a classifier key is set is reported,
// never the key itself.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './jev.mjs';

const EVENTS = { UserPromptSubmit: 'promptAdvisor.mjs', PostModelSwitch: 'recordModelSwitch.mjs', SessionStart: 'recordModelSwitch.mjs' };
const DAY_MS = 24 * 3600 * 1000;

/** How many of the three hooks `settings` has registered, matched the way install.mjs matches them. */
export function hooksFound(settings) {
  return Object.entries(EVENTS).filter(([event, file]) =>
    (settings?.hooks?.[event] ?? []).some((e) => e?.hooks?.some((h) => String(h.command).includes(file)))).length;
}

/** Counts the decisions logged since `since` (ms since epoch). Lines that are not JSON are ignored. */
export function summarizeLog(text, since) {
  const out = { prompts: 0, nudge: 0, block: 0 };
  for (const line of String(text).split('\n')) {
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }
    if (!(Date.parse(r?.at) >= since)) continue;
    out.prompts++;
    if (r.action === 'nudge') out.nudge++;
    if (r.action === 'block') out.block++;
  }
  return out;
}

export function buildStatus({ settings, hasKey, logs = [], now = Date.now() }) {
  const found = hooksFound(settings);
  const total = Object.keys(EVENTS).length;
  const state = found === total ? 'running' : found === 0 ? 'stopped' : 'error';
  const blocking = (settings?.env?.CLAUDE_GUARD_BLOCK_DOWNGRADES ?? process.env.CLAUDE_GUARD_BLOCK_DOWNGRADES) === '1';
  const fields = [
    { label: 'Hooks', value: `${found} of ${total} installed` },
    { label: 'Downgrades', value: blocking ? 'blocked' : 'advisory only' },
    { label: 'Classifier key', value: hasKey ? 'set' : 'missing' },
  ];
  if (logs.length) {
    const n = summarizeLog(logs.join('\n'), now - DAY_MS);
    fields.push({ label: 'Last 24h', value: `${n.prompts} prompts, ${n.nudge} nudged, ${n.block} blocked` });
  }
  const note = state === 'error' ? 'Only some of the hooks are installed.' : state === 'running' && !hasKey ? 'No classifier key, so nothing is being checked.' : undefined;
  return { state, title: 'Model guard', note, fields, actions: state === 'running' ? ['uninstall'] : state === 'stopped' ? ['install'] : ['install', 'uninstall'] };
}

function readLogs(dirs) {
  const out = [];
  for (const d of dirs) {
    for (const f of ['model-guard.log.jsonl.1', 'model-guard.log.jsonl']) {
      try {
        out.push(fs.readFileSync(path.join(d, '.claude', f), 'utf8'));
      } catch {
        // No log in this project yet.
      }
    }
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude', 'settings.json'), 'utf8'));
  } catch {
    // No settings file: nothing installed.
  }
  const dirs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  console.log(JSON.stringify(buildStatus({ settings, hasKey: Boolean(config().apiKey), logs: readLogs(dirs) })));
}
