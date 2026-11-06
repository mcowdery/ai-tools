// Stop hook: when Claude finishes a reply that is a plan or a suggestion but names no model,
// send it back once to add a one-line model recommendation, starting from Jev's tier.
//
// Jev answers two questions about the reply: is it a plan/suggestion, and which tier should do the
// work. Jev's tier is only a starting point: Claude is told to confirm it or override it with a
// reason, because Claude knows things about the code that Jev, seeing only the reply, does not.
//
// Never gets in the way on its own account: no API key, network error, Jev slow, unreadable
// transcript - all exit 0 with no output, as if the hook weren't installed. It blocks at most once
// per reply (Claude Code sets stop_hook_active on the follow-up stop). Bypass with
// CLAUDE_SKIP_PLAN_GUARD=1; turn off with CLAUDE_GUARD_PLAN=0.
import fs from 'node:fs';
import { askJevAboutReply, rankedProbabilities } from './jev.mjs';
import { lastAssistantText, classifyReply } from './planFilter.mjs';
import { logDecision } from './decisionLog.mjs';

const TIMEOUT_MS = 2500;
const MIN_KIND_CONFIDENCE = 0.8;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

async function main() {
  if (process.env.CLAUDE_SKIP_PLAN_GUARD || process.env.CLAUDE_GUARD_PLAN === '0') return;
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  if (input?.stop_hook_active) return; // Already sent back once for this reply.

  const projectDir = process.env.CLAUDE_PROJECT_DIR || input?.cwd;
  try {
    if (projectDir && fs.existsSync(projectDir)) process.chdir(projectDir);
  } catch {
    // Stay where we are.
  }
  const log = (record) => logDecision(projectDir, { session: input.session_id, hook: 'stop', ...record });

  const reply = input.last_assistant_message || lastAssistantText(input.transcript_path);
  const filtered = classifyReply(reply);
  if (!filtered.ask) return log({ action: 'plan-skip', reason: filtered.reason, prompt: reply });

  const { kind, tier } = await askJevAboutReply(filtered.text, { timeoutMs: TIMEOUT_MS });
  const isPlan = (kind.choice === 'plan' || kind.choice === 'suggestion') && kind.confidence >= MIN_KIND_CONFIDENCE;
  const record = {
    kind: kind.choice,
    kindConfidence: Number(kind.confidence.toFixed(3)),
    choice: tier.choice,
    confidence: Number(tier.confidence.toFixed(3)),
    prompt: reply,
  };
  if (!isPlan) return log({ action: 'plan-none', ...record });

  log({ action: 'plan-block', ...record });
  const pct = Math.round(tier.confidence * 100);
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason:
        `Your reply proposes work (${kind.choice}) but doesn't say which model should do it. ` +
        `Jev suggests ${tier.choice} (confidence ${pct}%; ${rankedProbabilities(tier)}) from the text alone. ` +
        'Add one closing line: the model you recommend (haiku, sonnet, opus) and a one-line reason. ' +
        "Use Jev's tier unless you know something from the code that changes it; if you differ, say why. " +
        'Do not repeat the rest of the reply.',
    }),
  );
}

main().catch(() => {}); // Jev unavailable/unconfigured/timed out: fail silent, never block.
