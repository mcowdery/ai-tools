// Runs the real Stop hook as a child process: JSON on stdin, decision on stdout, Jev stubbed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { classifyReply, lastAssistantText } from '../scripts/planFilter.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, '..', 'scripts', 'planAdvisor.mjs');
const STUB = pathToFileURL(path.join(HERE, 'helpers', 'stubFetch.mjs')).href;
const INHERITED_ENV = Object.fromEntries(
  Object.entries(process.env).filter(([k]) => !/^CLAUDE_(GUARD_|SKIP_)/.test(k)),
);

const PLAN =
  'Here is what I would do:\n1. Add planAdvisor.mjs as a Stop hook.\n2. Register it in install.mjs.\n' +
  '3. Add tests for the new hook and update the README so the behaviour is documented.\n' +
  'I can start on this whenever you want me to, and the whole change is small, touching only the model-guard folder, ' +
  'with no changes to the prompt hook or to any of the other tools in this repository.';

function run(reply, { kind = 'plan', tier = 'sonnet', conf = 0.9, input = {}, env = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-plan-'));
  const project = path.join(root, 'project');
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  const transcript = path.join(root, 't.jsonl');
  fs.writeFileSync(
    transcript,
    JSON.stringify({ type: 'assistant', message: { model: 'claude-sonnet-5-5', content: [{ type: 'text', text: reply }] } }) + '\n',
  );
  const out = path.join(root, 'req.json');
  const r = spawnSync(process.execPath, ['--import', STUB, HOOK], {
    input: JSON.stringify({ cwd: project, transcript_path: transcript, ...input }),
    encoding: 'utf8',
    env: {
      ...INHERITED_ENV,
      TYPESAFE_API_KEY: 'test',
      JEV_USER_ENV_FILE: path.join(root, 'none.env'),
      STUB_CHOICE: tier,
      STUB_CONF: String(conf),
      STUB_KIND: kind,
      STUB_OUT: out,
      ...env,
    },
  });
  assert.equal(r.status, 0, r.stderr);
  const logFile = path.join(project, '.claude', 'model-guard.log.jsonl');
  const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [];
  return { result: r.stdout ? JSON.parse(r.stdout) : null, log, called: fs.existsSync(out) };
}

test('a plan with no model is sent back with Jev\'s tier', () => {
  const { result, log } = run(PLAN, { tier: 'opus' });
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /Jev suggests opus/);
  assert.equal(log.at(-1).action, 'plan-block');
  assert.equal(log.at(-1).hook, 'stop');
});

test('a suggestion is treated like a plan', () => {
  assert.equal(run(PLAN, { kind: 'suggestion' }).result.decision, 'block');
});

test('a reply that is neither is left alone', () => {
  const { result, log } = run(PLAN, { kind: 'other' });
  assert.equal(result, null);
  assert.equal(log.at(-1).action, 'plan-none');
});

test('an unsure kind answer is left alone', () => {
  const { result } = run(PLAN, { kind: 'plan', env: { STUB_KIND_CONF: '0.5' } });
  assert.equal(result, null);
});

test('a reply that already names a model never reaches Jev', () => {
  const { result, called } = run(PLAN + '\nI recommend sonnet for this.');
  assert.equal(result, null);
  assert.equal(called, false);
});

test('short replies never reach Jev', () => {
  const { result, called } = run('Done. I can also fix the other one if you like.');
  assert.equal(result, null);
  assert.equal(called, false);
});

test('the follow-up stop is not blocked again', () => {
  const { result, called } = run(PLAN, { input: { stop_hook_active: true } });
  assert.equal(result, null);
  assert.equal(called, false);
});

test('CLAUDE_GUARD_PLAN=0 turns it off', () => {
  assert.equal(run(PLAN, { env: { CLAUDE_GUARD_PLAN: '0' } }).called, false);
});

test('a Jev failure is silent', () => {
  const { result } = run(PLAN, { env: { TYPESAFE_API_KEY: '', JEV_ENV_FILE: path.join(os.tmpdir(), 'nope.env') } });
  assert.equal(result, null);
});

test('classifyReply filters on length, model mention and plan markers', () => {
  assert.equal(classifyReply('x'.repeat(100)).reason, 'short');
  assert.equal(classifyReply('y'.repeat(400)).reason, 'no-plan-markers');
  assert.equal(classifyReply(PLAN + ' opus').reason, 'has-model');
  assert.equal(classifyReply(PLAN).ask, true);
});

test('lastAssistantText returns the newest assistant text, skipping sidechains', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mg-lt-')), 't.jsonl');
  const rec = (o) => JSON.stringify(o);
  fs.writeFileSync(f, [
    rec({ type: 'assistant', message: { content: [{ type: 'text', text: 'older' }] } }),
    rec({ type: 'assistant', message: { content: [{ type: 'text', text: 'newest' }, { type: 'tool_use' }] } }),
    rec({ type: 'assistant', isSidechain: true, message: { content: [{ type: 'text', text: 'agent' }] } }),
  ].join('\n') + '\n');
  assert.equal(lastAssistantText(f), 'newest');
});
