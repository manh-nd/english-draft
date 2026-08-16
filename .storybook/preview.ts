import type { Decorator, Preview } from "@storybook/nextjs-vite";
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

    if (!document.getElementById("visual-test-motion-freeze")) {
      const style = document.createElement("style");
      style.id = "visual-test-motion-freeze";
      style.textContent = `
        *, *::before, *::after {
          animation: none !important;
          caret-color: transparent !important;
          scroll-behavior: auto !important;
          transition: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
  return Story();
};

const withTheme: Decorator = (Story, context) => {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    const theme = context.globals?.theme || "light";
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
  return Story();
};

const preview: Preview = {
  decorators: [withFontVariables, withTheme],
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme for components",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", icon: "sun", title: "Light" },
          { value: "dark", icon: "moon", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
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
