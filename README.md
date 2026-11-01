# ai-tools

The tooling around my AI coding agents, in one place: a dashboard that shows what every agent is doing,
the small tools it reads from, and the Claude Code config I carry between projects.

| Folder | What it is |
|---|---|
| [`dashboard/`](dashboard) | The front end: a live board of every Claude Code session, plus resources like a GPU pod, in a page, a tray icon and a hotkey. |
| [`tools/concurrency/`](tools/concurrency) | Isolated git worktrees, a resource queue, per-session commits and notifications, for running several agents on one codebase. Also serves the dashboard. |
| [`tools/model-guard/`](tools/model-guard) | Picks, and optionally enforces, the right Claude model tier for each prompt using a classifier. |
| [`tools/asset-check/`](tools/asset-check) | Review sheets and fault checks for 3D models and animations, rendered in headless Blender, with a Claude skill. |
| [`config/`](config) | My global `CLAUDE.md` and skills, so the way I like to work follows me into every new project. |

Each tool has its own README; concurrency and model-guard have tests (`npm test` inside the folder). Nothing here is published to npm.

## Adding a tool to the dashboard

The dashboard's Resources tab runs a command you give it and draws the JSON it prints (`state`, `fields`,
the `actions` that apply now). To show a new tool, give it a `status --json` command and add an entry under
`resources` in `~/.agent-notify.json`. See "resources" in [`tools/concurrency/README.md`](tools/concurrency/README.md).

## Using the config

`config/skills/*` are linked into `~/.claude/skills` with junctions (no admin needed), so an edit in one place is an edit in both:

```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\skills\handoff" -Target "<this repo>\config\skills\handoff"
```

`config/CLAUDE.md` is a copy: a file symlink needs admin rights on Windows, and a hard link breaks when an editor
rewrites the file. After editing either one, copy it over the other (`Copy-Item config\CLAUDE.md ~\.claude\CLAUDE.md`).

Machine-specific and private files stay out of the repo: `~/.agent-notify.json` (notification topics),
Jev keys, decision logs and `~/.claude/settings.json`.
