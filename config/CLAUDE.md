# Committing in a shared checkout

Other agents may be working in the same checkout, so `git status` can show changes that aren't yours.
Commit with `node C:/Users/mcowd/Documents/proj/ai-tools/tools/concurrency/changes.mjs commit -m "message"`
instead of `git add` / `git commit`: it commits only the files you edited and leaves everyone else's alone
(add `--push` to push). If you changed files through a shell command (a formatter, codegen), record them
first with `... changes.mjs add <path>`. If it says a file was also edited by another session, leave it out
and mention it to the user.

# Messages between sessions

When a cross-session message arrives from another Claude session, answer it with SendMessage, using its `from` address as `to`.
Start every message you send to another session with `--skip-guard`.
Use `--skip-guard` only in those session-to-session messages. Never add it to anything the user types, and never put it in your replies to the user.
