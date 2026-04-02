# Contributing to cronai

cronai is intentionally small. The goal is a codebase you can read in one sitting. Contributions should keep it that way.

## Philosophy

**The agent is the integration layer.** cronai doesn't need a GitHub client, Linear SDK, or Slack library. The agent already knows how to use those. cronai just schedules and watches. If you're about to add an integration, ask yourself: can the agent just do this as part of its task?

**Small changes over big features.** A 10-line change to `runner.ts` that adds Cursor support is better than a 200-line plugin system. Keep it simple.

**No abstraction without repetition.** Don't add interfaces, registries, or factories for things that exist once. Three similar lines are better than a premature abstraction.

## Project structure

```
src/
  index.ts          # CLI entry — commander setup, routes to start/run/init/stop
  app.tsx            # Root Ink component — connects to daemon via socket
  config.ts          # Zod schema, YAML loader, credential management
  scheduler.ts       # node-cron wrapper, cron state, overlap prevention
  runner.ts          # Spawns claude --print with streaming output
  notify.ts          # Slack webhook notification
  ui.tsx             # TUI components — dashboard, cron table, output view
  cron.ts            # Natural language → cron parser, time formatting
  init.ts            # Interactive setup wizard
  daemon.ts          # Background scheduler daemon, Unix socket server
```

## Development

```bash
npm install          # install dependencies
npm run dev          # run without building
npx tsc --noEmit     # type check
npm run build        # build for distribution
```

## Making changes

1. Fork and clone
2. Make your change
3. `npx tsc --noEmit` to type-check
4. `npm run build` to verify
5. Test with a real `cronai.yml`
6. PR with a clear description of what and why

## Good contributions

- **Bug fixes** — always welcome
- **New schedule patterns** — add to `parseToCron()` in `cron.ts`
- **Agent support** — modify `runner.ts` to support a new CLI
- **TUI improvements** — better layout, keybinds, views
- **Small, self-contained changes** that others can apply to their fork

## What to avoid

- Abstraction layers (adapter interfaces, plugin systems, registries)
- Dependencies for things Node.js or the agent can do natively
- Config options for things that should be code changes
- Integration clients (GitHub, Linear, Slack) — the agent handles those
- Features that make the codebase harder to read in one sitting

## Code style

- TypeScript, strict mode, ESM
- No comments unless the logic isn't self-evident
- Functions over classes where possible
- Let the types do the documenting
