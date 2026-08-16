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
  tags: ["autodocs"],
} satisfies Meta<typeof InlineSuggestionActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    activeAction: "improve-style",
  },
};

export const DiffPreviewGrammar: Story = {
  args: {
    pendingSuggestion: {
      action: "fix-grammar",
      originalText: "She go to work yesterday.",
      suggestedText: "She went to work yesterday.",
      errorType: "grammar",
      from: 0,
      to: 26,
    },
    onAcceptSuggestion: () => {},
    onDismissSuggestion: () => {},
  },
};

export const DiffPreviewStyle: Story = {
  args: {
    pendingSuggestion: {
      action: "improve-style",
      originalText: "I think that this feature is very very good for users.",
      suggestedText:
        "This feature offers substantial benefits and convenience for our users.",
      errorType: "style",
      from: 0,
      to: 54,
    },
    onAcceptSuggestion: () => {},
    onDismissSuggestion: () => {},
  },
};

export const DiffPreviewVocabulary: Story = {
  args: {
    pendingSuggestion: {
      action: "make-natural",
      originalText: "I make a party for my birthday.",
      suggestedText: "I'm throwing a party for my birthday.",
      errorType: "vocabulary",
      from: 0,
      to: 31,
    },
    onAcceptSuggestion: () => {},
    onDismissSuggestion: () => {},
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
