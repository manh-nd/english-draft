# Code Review

Use the `code-review` skill (`.agents/skills/code-review/SKILL.md`) to review changes since a fixed point (commit, branch, tag, or merge-base) along two axes in parallel:

- **Standards** — does the code follow this repo's documented coding standards?
- **Spec** — does the code match what the originating issue or spec asked for?

Trigger when the user wants to review a branch, a PR, work-in-progress changes, or asks to "review since X".
