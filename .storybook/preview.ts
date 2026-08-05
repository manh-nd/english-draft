import type { Preview, Decorator } from "@storybook/react";
import "../app/globals.css";

// React 19 requires this flag to suppress act() warnings in test environments
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Inject the font CSS variables that next/font normally provides via html element
// class attributes (e.g. `inter.variable` → `--font-sans`). In Storybook these
// variables are never set by Next.js, so we fall back to system fonts.
const withFontVariables: Decorator = (Story) => {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.style.setProperty("--font-sans", "system-ui, sans-serif");
    root.style.setProperty("--font-geist-sans", "system-ui, sans-serif");
    root.style.setProperty("--font-geist-mono", "ui-monospace, monospace");
  }
  return Story();
};

const preview: Preview = {
  decorators: [withFontVariables],
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
