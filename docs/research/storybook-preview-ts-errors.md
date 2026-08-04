# Research Report: Resolving TypeScript Diagnostics in Storybook Preview (`TS2882` & `TS7017`)

**Author:** Research & Coding Assistant  
**Date:** August 4, 2026  
**Target Path:** `docs/research/storybook-preview-ts-errors.md`  
**Status:** Completed

---

## 1. Executive Summary

When opening or typechecking `.storybook/preview.ts` in Next.js + Storybook projects with strict TypeScript configurations, developers encounter two specific TypeScript compiler/IDE diagnostics:

1. **TS2882**: `Cannot find module or type declarations for side-effect import of '../app/globals.css'.`
2. **TS7017**: `Element implicitly has an 'any' type because type 'typeof globalThis' has no index signature.` (on `globalThis.IS_REACT_ACT_ENVIRONMENT = true;`).

This report provides the primary root-cause analysis for both diagnostics and documents the standard, type-safe resolution implemented in `types/global.d.ts`.

---

## 2. Root Cause Analysis

### 2.1 TS2882 (Side-Effect CSS Import)

- **Line:** `import "../app/globals.css";`
- **Cause:** In TypeScript 5.0+, the compiler strictly checks side-effect imports (`import "..."`) against known module declarations. While Next.js provides auto-generated types in `.next/types`, Next.js's standard `next-env.d.ts` does not include ambient declarations for generic `.css` files (`declare module "*.css"`).
- **Effect:** Without an ambient module declaration covering `*.css`, TypeScript issues TS2882 whenever non-JavaScript/TypeScript assets are imported directly.

### 2.2 TS7017 (Implicit 'any' on `globalThis`)

- **Line:** `globalThis.IS_REACT_ACT_ENVIRONMENT = true;`
- **Cause:** In standard TypeScript definitions (`lib.dom.d.ts` / `lib.esnext.d.ts`), `globalThis` is typed without an index signature (`[key: string]: any`). Setting custom global flags on `globalThis` (such as React 19's test environment flag `IS_REACT_ACT_ENVIRONMENT`) violates `strict` / `noImplicitAny` type rules.
- **Effect:** TypeScript raises TS7017 indicating that `IS_REACT_ACT_ENVIRONMENT` is not a recognized property on `globalThis`.

---

## 3. Resolution & Implementation

To resolve both diagnostics cleanly without using unsafety or type-assertion hacks (`as any`), ambient global declarations were created in `types/global.d.ts`.

### 3.1 `types/global.d.ts`

```typescript
// Global type declarations for project dependencies and environment flags

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

export {};
```

### 3.2 How `tsconfig.json` Picks Up `types/global.d.ts`

The repository's `tsconfig.json` includes `"**/*.ts"` under `"include"`:

```json
"include": [
  "next-env.d.ts",
  "**/*.ts",
  "**/*.tsx",
  ".next/types/**/*.ts",
  ".next/dev/types/**/*.ts",
  "**/*.mts"
]
```

`"**/*.ts"` automatically incorporates all `.d.ts` files under `types/` into the workspace compiler scope, making `*.css` declarations and `globalThis.IS_REACT_ACT_ENVIRONMENT` available to `.storybook/preview.ts` and all component files.

---

## 4. Verification & Validation

The solution was verified with the following empirical checks:

1. **TypeScript Typecheck (`bun run typecheck`)**: Exited with code 0 (no errors across workspace).
2. **ESLint (`bun run lint`)**: Exited with code 0 (clean lint output).
3. **Storybook Build (`bun run build-storybook`)**: Storybook preview and manager built successfully in 1.60s.
