import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { InlineSuggestionActions } from "./inline-suggestion-menu";

const meta = {
  title: "Editor/Inline Suggestion Menu",
  component: InlineSuggestionActions,
  parameters: {
    layout: "centered",
  },
  args: {
    onAction: () => {},
    onSaveVocabulary: () => {},
  },
  tags: ["autodocs", "ticket-8"],
} satisfies Meta<typeof InlineSuggestionActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    activeAction: "improve-style",
  },
};

export const QuotaExhausted: Story = {
  args: {
    error:
      "AI is temporarily unavailable because all Gemini API keys have reached their rate limits. Please try again later.",
  },
};

export const VocabularySaved: Story = {
  args: {
    vocabularySaved: true,
  },
};
