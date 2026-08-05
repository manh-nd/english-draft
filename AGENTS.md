# Agent Rules & Skills

## Next.js

Breaking changes apply — APIs, conventions, and file structure differ from training data. See `docs/agents/nextjs.md`.

## Package Manager

This project uses **`bun`** exclusively as its package manager. See `docs/agents/package-manager.md`.

## Agent skills

### Issue tracker

GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical role labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

### UI & Components

Use the `shadcn` skill (`.agents/skills/shadcn/SKILL.md`). See `docs/agents/ui.md`.
When creating or modifying UI components in `components/ui/`, ensure a corresponding `.stories.tsx` file exists or is updated. Run `bun run test:visual` to verify no visual regressions occur before completing UI work.

### Gemini API & AI

Gemini 3.6 Flash, Interactions API, and Live API skills. See `docs/agents/gemini.md`.

### Rich Text Editor

Tiptap rich text editor skill. See `docs/agents/tiptap.md`.
