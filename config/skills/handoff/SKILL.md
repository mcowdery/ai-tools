---
name: handoff
description: When a research, investigation or planning task is finished and implementation has not started, write an implementation brief and recommend which model should implement it. Use at the end of any research/investigate/plan request, before making code changes. Do not use mid-research, or when the user asked to implement directly.
---

# Handoff: brief and model recommendation

Run this after research or investigation, before implementation starts.

1. **Summarize findings.** Files involved, the decision made, constraints, open risks.
2. **Classify the implementation work:**
   - Mechanical (clear spec, repetitive edits, low ambiguity): fast/cheap model.
   - Moderate (multi-file, follows existing patterns): mid-tier model.
   - Judgment-heavy (new architecture, subtle invariants, ambiguous requirements): strongest model.
3. **State the recommendation** and the one-line reason. Say what would change the call (e.g. "if X turns out to be ambiguous, move up a tier").
4. **Write the brief** so a fresh session can implement it without redoing the research: goal, exact files and symbols, the chosen approach, things already ruled out, how to verify.
5. **Offer the switch:** the user runs `/model`, or delegate the implementation to a subagent with `model` set to the recommendation. Do not start implementing unless the user says so.
