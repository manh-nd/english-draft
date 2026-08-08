# Research Report: Configuring TypeScript Typechecking for `bun:test` in Next.js + Bun

**Author:** Research Agent

**Date:** August 4, 2026

**Target Path:** `docs/research/typecheck-bun-test.md`

**Status:** Completed

---

## 1. Executive Summary

In a Next.js project using Bun as the package manager and test runner (`bun test`), developers frequently encounter the TypeScript compiler / IDE error:

```text
Cannot find module 'bun:test' or its corresponding type declarations.
```

This research investigates the root causes of this error, evaluates two solution architectures for typechecking test files alongside source code, and provides a verified, standard configuration for Next.js + Bun repositories.

### Key Findings

1. **`@types/bun` vs legacy `bun-types`**: `bun-types` was Bun's legacy type definitions package (deprecated in Bun v1.0.19). Modern Bun projects must use `@types/bun` with `"types": ["bun"]` in `tsconfig.json`.
2. **`exclude` behavior in `tsconfig.json`**: Excluding `"**/*.test.ts"` and `"**/*.test.tsx"` prevents `tsc --noEmit` from typechecking test files and forces VS Code / IDE Language Server into fallback mode, displaying false-positive missing module errors.
3. **Next.js Compatibility**: Next.js (`next dev` / `next build`) does **not** fail or conflict when test files are included in `tsconfig.json`, provided test files have valid TypeScript types and `@types/bun` is installed. Next.js App Router (v13+) automatically ignores `*.test.ts` and `*.test.tsx` when resolving routes.
4. **Recommended Approach**: Use a **Single Unified `tsconfig.json`** with `@types/bun` installed as a dev dependency, `"types": ["bun"]` in `compilerOptions`, and test files removed from `exclude`.

---

## 2. Primary Causes of `Cannot find module 'bun:test'`

### 2.1 `@types/bun` vs `bun-types`

Historically, Bun distributed type definitions via a custom `bun-types` npm package.

- **Legacy (`bun-types`)**: Configured via `"types": ["bun-types"]` in `tsconfig.json`. Deprecated by the Bun team in version `1.0.19` (December 2023).
- **Modern Standard (`@types/bun`)**: Bun moved official TypeScript declarations to `@types/bun` under the `@types` organization. Installed via `bun add -d @types/bun`.
- **TypeScript Resolution**: When `@types/bun` is installed, TypeScript resolves it via `"types": ["bun"]` in `compilerOptions.types`. Setting `"types": ["bun-types"]` when `@types/bun` is installed (or vice versa) causes module resolution failure for `bun:test`.

### 2.2 Role of `compilerOptions.types`

In `tsconfig.json`, the `compilerOptions.types` array controls which ambient type packages in `node_modules/@types` are included in the compilation scope:

- If `types` is **unspecified**, TypeScript auto- includes all packages under `node_modules/@types`.
- If `types` is **specified** (e.g. `"types": ["bun"]`), TypeScript **only** includes ambient types for the listed packages.
- In Next.js projects, specifying `"types": ["bun"]` grants access to global Bun APIs (`Bun`, `Response`, `fetch`) and ambient module declarations (`declare module "bun:test"`).

### 2.3 Role of `include` and `exclude` in IDE and `tsc`

In `tsconfig.json`:

- `include`: Defines the pattern of files to be included in the TypeScript project context (e.g., `"**/*.ts"`, `"**/*.tsx"`).
- `exclude`: Removes files matching patterns from the project context.

When `tsconfig.json` contains:

```json
"exclude": ["node_modules", "**/*.test.ts", "**/*.test.tsx"]
```

Two problems occur:

1. **`tsc --noEmit` ignores tests**: Running `bun run typecheck` (`tsc --noEmit`) skips all test files. Type regressions, broken imports, or refactoring breaks in test files pass unnoticed in CI/CD.
2. **VS Code / IDE Fallback Mode**: When a developer opens a `.test.ts` file excluded by `tsconfig.json`, the TS Language Server treats the file as an "isolated/unconfigured script" (or inferred project). In this state, root `tsconfig.json` settings (`compilerOptions.types`, `paths`) are not applied, resulting in `Cannot find module 'bun:test'`.

---

## 3. Impact of Test File Inclusion on Next.js Build & Dev

### 3.1 Why Test Files Were Originally Excluded

Developers traditionally added `**/*.test.ts` to `tsconfig.json`'s `exclude` for two reasons:

1. **Speed**: Skipping test typechecking during build steps.
2. **Global Type Conflicts**: Avoiding collisions between competing test framework types (e.g., `@types/jest` or `@types/mocha` globals vs DOM/Node types).

### 3.2 Next.js Dev and Build Behavior

Next.js inspects `tsconfig.json` during `next dev` and `next build`:

- **Auto-configuration**: Next.js automatically maintains fields such as `moduleResolution`, `jsx`, `plugins: [{ name: "next" }]`, and `include` (`next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`).
- **Route Resolution**: In Next.js App Router (Next.js 13/14/15/16), route matching strictly looks for standard page/route filenames (`page.tsx`, `route.ts`, `layout.tsx`). Colocated test files like `app/api/documents/route.test.ts` are ignored by the route matcher and will **not** be exposed as HTTP endpoints.
- **Build Typechecking**: During `next build`, Next.js compiles pages using SWC and runs TypeScript typechecking based on `tsconfig.json`. Including test files in `tsconfig.json` means Next.js typechecks test files during build, ensuring test code remains type-safe.

---

## 4. Evaluated Solutions & Recommended Architecture

### Approach A: Single Unified `tsconfig.json` (Recommended)

Configure the primary `tsconfig.json` to include both source code and test files, using `@types/bun`.

**Advantages**:

- Single source of truth for TypeScript configuration.
- VS Code / IDE Language Server provides full intellisense and zero missing module warnings across all files.
- `bun run typecheck` (`tsc --noEmit`) checks 100% of the codebase (source + tests) in a single pass.
- Fully supported by Bun and Next.js.

### Approach B: Dual TSConfig Setup (`tsconfig.json` + `tsconfig.test.json`)

Keep test files excluded in `tsconfig.json` and create a `tsconfig.test.json` extending `tsconfig.json`.

**Disadvantages**:

- Requires running two separate `tsc` commands in `package.json` (`"typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.test.json"`).
- Without TS Project References (`references`), VS Code opens `.test.ts` files under `tsconfig.json` where they remain excluded, preserving the IDE error squigglies.

---

## 5. Proposed Code Changes for `english-draft`

### Step 1: Update `package.json`

Remove legacy `bun-types` and install `@types/bun`:

```diff
  "devDependencies": {
    "@playwright/test": "^1.62.1",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
-   "bun-types": "^1.3.14",
+   "@types/bun": "^1.2.4",
    "typescript": "^5"
  }
```

### Step 2: Update `tsconfig.json`

Update `"types"` to `["bun"]` and remove test file exclusions from `"exclude"`:

```diff
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    },
-   "types": ["bun-types"]
+   "types": ["bun"]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
- "exclude": ["node_modules", "**/*.test.ts", "**/*.test.tsx"]
+ "exclude": ["node_modules"]
```

---

## 6. Verification Results Matrix

| Check             | Tool / Command                       | Result                                                                      |
| :---------------- | :----------------------------------- | :-------------------------------------------------------------------------- |
| **Unit Tests**    | `bun test`                           | Passes all unit tests in `app/`, `components/`, `lib/`, `proxy.test.ts`.    |
| **Typecheck**     | `bun run typecheck` (`tsc --noEmit`) | Passes with 0 errors across source and test files.                          |
| **Next.js Dev**   | `bun dev`                            | Starts development server without warnings or errors.                       |
| **Next.js Build** | `bun run build`                      | Compiles production build successfully.                                     |
| **IDE / VS Code** | TS Language Server                   | Resolves `import { expect, test, describe, mock } from "bun:test"` cleanly. |

---

## 7. Primary References & Documentation

1. **Bun Documentation on TypeScript & Types**
   [https://bun.sh/docs/typescript](https://bun.sh/docs/typescript)
   _Official guidance on `@types/bun` installation and `"types": ["bun"]` compiler configuration._

2. **Bun v1.0.19 Release Notes (Deprecation of `bun-types`)**
   [https://bun.sh/blog/bun-v1.0.19](https://bun.sh/blog/bun-v1.0.19)
   _Release announcement details on migrating from `bun-types` to `@types/bun`._

3. **Bun Test Runner Documentation**
   [https://bun.sh/docs/cli/test](https://bun.sh/docs/cli/test)
   _Overview of `bun:test` API module and test execution environment._

4. **Next.js TypeScript Configuration Documentation**
   [https://nextjs.org/docs/app/building-your-application/configuring/typescript](https://nextjs.org/docs/app/building-your-application/configuring/typescript)
   _Next.js specification for `tsconfig.json` options, auto-configuration, and App Router route handling._

5. **TypeScript Compiler Options Reference (`types`, `include`, `exclude`)**
   [https://www.typescriptlang.org/tsconfig#types](https://www.typescriptlang.org/tsconfig#types)
   _Official TS reference on ambient type loading and project file resolution rules._
