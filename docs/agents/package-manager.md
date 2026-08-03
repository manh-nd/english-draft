# Package Manager

This project uses **`bun`** exclusively as its package manager (instead of `npm`, `yarn`, or `pnpm`).

- **Install packages**: `bun add <package>` (or `bun add -d <package>` for devDependencies)
- **Run scripts**: `bun run <script>` (e.g., `bun run dev`, `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`)
- **Run CLI tools**: `bunx <tool>` or `bunx --bun <tool>` (e.g., `bunx --bun shadcn@latest ...`, `bunx lint-staged`)
