// Decides, without calling Jev, whether the reply Claude just finished is worth asking Jev about.
// Cheap and deliberately loose: Jev makes the real call, this only keeps the Stop hook from
// sending every short answer over the network.
import fs from 'node:fs';

const TAIL_BYTES = 512 * 1024;
const MAX_CHARS = 4000;
export const MIN_CHARS = 300;

const MODEL_MENTION = /\b(haiku|sonnet|opus|fable)\b/i;
const PLAN_MARKER = new RegExp(
  [
    '^\\s*(?:\\d+[.)]|[-*])\\s', // list item
    '\\b(?:plan|proposal|approach|option|recommend|suggest|propose|next steps?)\\b',
    "\\b(?:I(?:'d| would| will| can)|you (?:could|can|might|should)|want me to|shall I)\\b",
  ].join('|'),
  'im',
);

/** Text of the newest main-thread assistant message that has any, or ''. */
export function lastAssistantText(transcriptPath) {
  if (!transcriptPath) return '';
  let fd;
  try {
    fd = fs.openSync(transcriptPath, 'r');
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    const lines = buf.toString('utf8').split('\n');
    if (size > len) lines.shift();
    for (let i = lines.length - 1; i >= 0; i--) {
      let rec;
      try {
        rec = JSON.parse(lines[i]);
      } catch {
        continue;
      }
      if (rec?.type !== 'assistant' || rec.isSidechain) continue;
      const c = rec.message?.content;
      const text = (typeof c === 'string' ? c : Array.isArray(c)
        ? c.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n')
        : '').trim();
      if (text) return text;
    }
  } catch {
    // Unreadable transcript: nothing to check.
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  return '';
}

/**
 * @returns {{ask: boolean, reason?: string, text?: string}} ask=false means leave the reply alone;
 *   `reason` says why (it goes in the decision log).
 */
export function classifyReply(text) {
  if (!text || text.length < MIN_CHARS) return { ask: false, reason: 'short' };
  if (MODEL_MENTION.test(text)) return { ask: false, reason: 'has-model' };
  if (!PLAN_MARKER.test(text)) return { ask: false, reason: 'no-plan-markers' };
  // The proposal usually sits at the end of a reply; keep the tail if it is long.
  return { ask: true, text: text.length > MAX_CHARS ? text.slice(-MAX_CHARS) : text };
}
