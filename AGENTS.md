<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Package Manager

This project uses **`bun`** exclusively as its package manager (instead of `npm`, `yarn`, or `pnpm`).

- **Install packages**: `bun add <package>` (or `bun add -d <package>` for devDependencies)
- **Run scripts**: `bun run <script>` (e.g., `bun run dev`, `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`)
- **Run CLI tools**: `bunx <tool>` or `bunx --bun <tool>` (e.g., `bunx --bun shadcn@latest ...`, `bunx lint-staged`)

## Agent skills

### Issue tracker

GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

### UI & Components

Use the `shadcn` skill (`.agents/skills/shadcn/SKILL.md`) when adding, searching, styling, building, debugging, or composing UI components and design systems.
