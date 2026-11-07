---
name: handoff
description: When a research, investigation or planning task is finished and implementation has not started, write an implementation brief, split the work into parallel tracks where that pays, and recommend which model should do each part. Use at the end of any research/investigate/plan request, and whenever you write a plan or proposal with three or more steps, before making code changes. Do not use mid-research, or when the user asked to implement directly.
---

# Handoff: brief, parallel tracks and model recommendation

Run this after research or investigation, or when writing any plan of three or more steps, before implementation starts.

0. **Write for someone who has not seen the code.** Open with two or three plain sentences on what changes for the user and what the end state looks like ("after this, X happens when you do Y"), in the user's terms, not file or function names. Define a term the first time it appears or avoid it. Give each step a few words on why. If the plan has a shape, draw it (see "Pictures" below).
1. **Summarize findings.** Files involved, the decision made, constraints, open risks.
2. **Split by dependency.** List the steps and mark what each one needs from the others. Group steps that do not depend on each other and touch different files into tracks. Anything that needs another step's output waits for it.
3. **Decide parallel or in order, and say why in one line.** Running in order is a normal answer. Parallel agents pay only when all of these hold:
   - two or more tracks, each big enough to justify writing a brief (a tiny task costs more to brief than to do);
   - the tracks touch different files or modules (the checkout is shared, so overlapping edits conflict; use worktree isolation if they must overlap);
   - each track has a clear spec and its own way to verify it;
   - the interface between tracks is already agreed.
   Many cheap items (triaging dozens of failures, labelling issues) are also a good fit, with a small model per agent.
4. **Classify each track's work and pick a model:**
   - Mechanical (clear spec, repetitive edits, low ambiguity): fast/cheap model.
   - Moderate (multi-file, follows existing patterns): mid-tier model.
   - Judgment-heavy (new architecture, subtle invariants, ambiguous requirements): strongest model.
5. **Add the merge-and-verify step explicitly**, with its own model (usually the strongest in the plan). Parallel work has to be integrated and checked, and that is the hard part.
6. **State the recommendation** and the one-line reason for each track. Say what would change the call (e.g. "if X turns out to be ambiguous, move up a tier").
7. **Write the brief** so a fresh session or agent can do each track without redoing the research: goal, exact files and symbols, the chosen approach, things already ruled out, how to verify. Agents start with no context, so the brief is all they have.
8. **Offer the next step:** the user runs `/model`, or you launch the tracks as subagents with `model` set per track. Do not start implementing unless the user says so.

A plan with a single track is just one line: the model to use and why.

## Pictures

Draw when the plan is about structure or flow, not for every plan. Worth a picture:
- **Flow or sequence**: how data or events move between parts.
- **Dependencies**: which steps wait on which, and the parallel tracks (this is the usual one).
- **Before and after**: the current setup next to what it becomes.
- **UI changes**: a rough layout sketch.

Skip it for a linear to-do list or a one-file fix; a diagram there only adds length.

How to draw it:
- **Default: a text diagram** (boxes and arrows in a code block). It works in the terminal and on a phone and needs no tools. Keep it to about six boxes; label every arrow with what travels along it.
- **Bigger or visual: a rendered page** via the Artifact tool (inline SVG), when the plan has more than about six parts or is a UI layout. Load the artifact skills first, and give the link in the reply with a one-line summary of what it shows, since the user may only read the text.
- Do not rely on Mermaid; it does not render in the terminal.
- A picture does not replace the plain-language opening. It supports it.

If the user has to ask for a clearer explanation, find out what was unclear (a term, the order, or why a step exists) and fix that in how the next plan is written.
