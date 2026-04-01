# Contributing to overtime

overtime is intentionally small. The goal is a codebase you can read in one sitting. Contributions should keep it that way.

## Philosophy

**Skills over features.** Instead of adding config options and abstraction layers, modify the source directly. A 10-line change to `runner.ts` that adds Cursor support is better than a 200-line plugin system.

**No abstraction without repetition.** Don't add interfaces, registries, or factories for things that exist once. Three similar lines are better than a premature abstraction.

**The whole thing is 8 files.** Try to keep it that way. If a change needs a new file, it should be worth the added complexity.

## Project structure

```
src/
  index.ts          # CLI entry — commander setup, routes to start/run/init
  app.tsx            # Root Ink component — wires scheduler to TUI
  config.ts          # Zod schema, YAML loader, credential management
  scheduler.ts       # node-cron wrapper, job state, overlap prevention
  runner.ts          # Spawns claude --print, collects result
  notify.ts          # Slack webhook notification
  ui.tsx             # TUI components — dashboard, job table, output view
  cron.ts            # Natural language → cron parser, time formatting
  init.ts            # Interactive setup wizard
```

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (no build step)
npm run dev

# Type check
npx tsc --noEmit

# Build
npm run build
```

## Making changes

1. Fork and clone the repo
2. Make your change
3. Run `npx tsc --noEmit` to type-check
4. Run `npm run build` to verify the build
5. Test manually with a real `overtime.yml`
6. Open a PR with a clear description of what and why

## What makes a good contribution

- **Bug fixes** — always welcome
- **New schedule patterns** — add to `parseToCron()` in `cron.ts`
- **New notification targets** — add a function to `notify.ts`, wire it in `scheduler.ts`
- **Agent support** — modify `runner.ts` to support a new CLI (Cursor, Codex, etc.)
- **TUI improvements** — better layout, more keybinds, new views

## What to avoid

- Adding abstraction layers (adapter interfaces, plugin systems, registries)
- Adding dependencies for things Node.js can do natively
- Config options for things that should be code changes
- Features that make the codebase harder to read in one sitting

## Code style

- TypeScript, strict mode
- ESM (`"type": "module"`)
- No comments unless the logic isn't self-evident
- Functions over classes where possible
- Let the types do the documenting
