import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { InlineSuggestionActions } from "./inline-suggestion-menu";

const meta = {
  title: "Editor/Inline Suggestion Menu",
  component: InlineSuggestionActions,
  parameters: {
    layout: "centered",
  },
  args: {
    onAction: fn(),
    onSaveVocabulary: fn(),
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
    onAcceptSuggestion: fn(),
    onDismissSuggestion: fn(),
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
    onAcceptSuggestion: fn(),
    onDismissSuggestion: fn(),
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
    onAcceptSuggestion: fn(),
    onDismissSuggestion: fn(),
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

export const DropdownOpen: Story = {
  args: {
    isDropdownOpen: true,
  },
};

export const OpenAndSelectDropdownItem: Story = {
  args: {
    onAction: fn(),
    onSaveVocabulary: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole("button", {
      name: /ai rewrite/i,
    });
    await expect(trigger).toBeInTheDocument();
    await userEvent.click(trigger);

    const body = within(document.body);
    const grammarOption = await body.findByText("Fix grammar");
    await expect(grammarOption).toBeInTheDocument();
    await userEvent.click(grammarOption);
    await expect(args.onAction).toHaveBeenCalledWith("fix-grammar");
  },
};

export const AcceptDiffInteraction: Story = {
  args: {
    pendingSuggestion: {
      action: "fix-grammar",
      originalText: "She go to work yesterday.",
      suggestedText: "She went to work yesterday.",
      errorType: "grammar",
      from: 0,
      to: 26,
    },
    onAcceptSuggestion: fn(),
    onDismissSuggestion: fn(),
    onSaveVocabulary: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const acceptBtn = await canvas.findByRole("button", {
      name: /accept suggestion/i,
    });
    await expect(acceptBtn).toBeInTheDocument();
    await userEvent.click(acceptBtn);
    await expect(args.onAcceptSuggestion).toHaveBeenCalled();
  },
};

export const DismissDiffInteraction: Story = {
  args: {
    pendingSuggestion: {
      action: "improve-style",
      originalText: "Very good feature.",
      suggestedText: "Highly advantageous feature.",
      errorType: "style",
      from: 0,
      to: 18,
    },
    onAcceptSuggestion: fn(),
    onDismissSuggestion: fn(),
    onSaveVocabulary: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const dismissBtn = await canvas.findByRole("button", {
      name: /dismiss suggestion/i,
    });
    await expect(dismissBtn).toBeInTheDocument();
    await userEvent.click(dismissBtn);
    await expect(args.onDismissSuggestion).toHaveBeenCalled();
  },
};

export const SaveVocabInteraction: Story = {
  args: {
    onAction: fn(),
    onSaveVocabulary: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const saveBtn = await canvas.findByRole("button", {
      name: /save to vocabulary/i,
    });
    await expect(saveBtn).toBeInTheDocument();
    await userEvent.click(saveBtn);
    await expect(args.onSaveVocabulary).toHaveBeenCalled();
  },
};
