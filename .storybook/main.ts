import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";

const config: StorybookConfig = {
  stories: [
    "../components/**/*.mdx",
    "../components/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: async (config) => {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        // Native Vite tsconfig path resolution (no plugin needed since Vite 6)
        tsconfigPaths: true,
        alias: {
          ...config.resolve?.alias,
          // Mock next/font/google — not supported outside Next.js runtime
          "next/font/google": path.resolve(
            __dirname,
            "./__mocks__/next-font.ts"
          ),
        },
      },
    };
  },
};

export default config;
