import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentStatusBar } from "./document-status-bar";

const meta = {
  title: "Editor/DocumentStatusBar",
  component: DocumentStatusBar,
  parameters: {
    layout: "centered",
  },
  args: {
    wordCount: 428,
    characterCount: 2680,
    readingTimeMinutes: 3,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DocumentStatusBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    wordCount: 428,
    characterCount: 2680,
    readingTimeMinutes: 3,
  },
};

export const ShortDraft: Story = {
  args: {
    wordCount: 45,
    characterCount: 280,
    readingTimeMinutes: 1,
  },
};

export const LongEssay: Story = {
  args: {
    wordCount: 3250,
    characterCount: 19840,
    readingTimeMinutes: 17,
  },
};
