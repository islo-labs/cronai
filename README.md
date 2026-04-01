# overtime

Cron for AI agents. Schedule agent tasks like you schedule cron jobs.

```yaml
# overtime.yml
jobs:
  - name: pr-review
    schedule: "every day at 9am"
    task: "Review open PRs in this repo and leave comments"
    notify: slack

  - name: dep-updates
    schedule: "every monday at 2am"
    task: "Update dependencies, run tests, open PR if passing"

  - name: bug-triage
    schedule: "every 4 hours"
    task: "Check Linear for bugs labeled 'needs-triage', add priority labels"
    notify: slack
```

```
$ npx overtime

┌─ overtime ──────────────────────────────────────────┐
│                                                     │
│  JOB           SCHEDULE        STATUS    NEXT RUN   │
│  pr-review     daily at 9am    idle      in 3h 22m  │
│  dep-updates   Mon at 2am     ✓ done    in 4d 11h  │
│  bug-triage    every 4 hours   ⟳ running in 1h 05m  │
│                                                     │
│  [↑↓] select  [r] run  [enter] view output  [q] quit│
└─────────────────────────────────────────────────────┘
```

## Getting started

```bash
npx overtime init
```

This walks you through connecting GitHub, Linear, and Slack, then creates your first `overtime.yml`. No env vars to manage — credentials are stored in `~/.overtime/credentials.json`.

Then:

```bash
npx overtime          # start the dashboard
npx overtime run pr-review  # test a single job
```

## Schedules

Write schedules in plain English. No cron syntax needed.

| Schedule | Meaning |
|---|---|
| `every hour` | Top of every hour |
| `every 15 minutes` | Every 15 minutes |
| `every day at 9am` | Daily at 9:00 AM |
| `every weekday at 9:30am` | Mon–Fri at 9:30 AM |
| `every monday at 2pm` | Mondays at 2:00 PM |
| `every weekend at 10am` | Sat & Sun at 10:00 AM |
| `hourly` | Same as `every hour` |
| `daily at 3pm` | Same as `every day at 3pm` |

Standard cron expressions (`0 9 * * *`) also work if you prefer them.

## Config

```yaml
# overtime.yml

defaults:
  notify: slack         # notify on all jobs by default
  timeout: 600          # seconds before killing a job

jobs:
  - name: my-job        # lowercase, alphanumeric, dashes
    schedule: "every day at 9am"
    task: "What the agent should do"
    notify: slack       # optional — send Slack notification on completion
    model: sonnet       # optional — Claude model to use
    timeout: 300        # optional — override default timeout (seconds)
    workdir: ./myrepo   # optional — working directory for the agent
```

## Credentials

`overtime init` stores credentials in `~/.overtime/credentials.json` (file mode 600, never committed to git).

You can also use environment variables — they take precedence over stored credentials:

| Env var | Used for |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API access |
| `GITHUB_TOKEN` | Passed to agent for GitHub operations |
| `LINEAR_API_KEY` | Passed to agent for Linear operations |
| `SLACK_WEBHOOK_URL` | Job completion notifications |

## How it works

overtime is a single Node.js process that:

1. Reads `overtime.yml` and parses schedules
2. Runs a cron loop — when a job fires, it spawns `claude --print` with the task
3. Tracks job state and shows it in a live TUI
4. Sends notifications when jobs complete
5. Prevents overlap — if a job is still running when its next cron fires, it skips

The entire codebase is 8 files and ~600 lines. Read it in one sitting.

## Requirements

- Node.js 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

## Design philosophy

Borrowed from [nanoclaw](https://github.com/qwibitai/nanoclaw):

- **One process, handful of files** — small enough to understand completely
- **No plugin systems** — Claude is the agent. Want to add another? Edit `runner.ts`
- **No config wizards** — `overtime init` gets you started, then edit YAML
- **Skills over features** — extend by modifying the source, not adding config options
- **Understandable** — anyone can read the full source and know exactly what it does

## License

MIT
