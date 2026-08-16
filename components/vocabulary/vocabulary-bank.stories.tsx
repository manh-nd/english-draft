import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VocabularyBank } from "./vocabulary-bank";
import type { VocabularyItemWithDocument } from "@/lib/db/vocabulary";

const mockVocabulary: VocabularyItemWithDocument[] = [
  {
    id: "v-1",
    userId: "user-1",
    documentId: "doc-1",
    documentTitle: "Q3 Strategy Proposal",
    phrase: "comprehensive",
    definition:
      "/ˌkɒm.prɪˈhen.sɪv/ (adj.) Complete and including everything that is necessary • Toàn diện, bao quát",
    exampleSentence:
      "We conducted a comprehensive analysis of customer feedback before prioritizing Q3 deliverables.",
    createdAt: new Date("2026-08-16T10:00:00Z"),
    reviewItem: {
      id: "rev-v-1",
      interval: 1,
      easeFactor: 2.5,
      nextReviewAt: new Date("2026-08-16T08:00:00Z"), // Due!
      lastReviewedAt: null,
    },
  },
  {
    id: "v-2",
    userId: "user-1",
    documentId: "doc-2",
    documentTitle: "Technical Architecture Memo",
    phrase: "touch base",
    definition:
      "(idiom) To briefly talk with someone or establish contact • Giữ liên lạc, trao đổi ngắn",
    exampleSentence:
      "Let's touch base next Monday to review the initial benchmarks.",
    createdAt: new Date("2026-08-15T14:30:00Z"),
    reviewItem: {
      id: "rev-v-2",
      interval: 6,
      easeFactor: 2.6,
      nextReviewAt: new Date("2026-08-21T14:30:00Z"),
      lastReviewedAt: new Date("2026-08-15T14:30:00Z"),
    },
  },
  {
    id: "v-3",
    userId: "user-1",
    documentId: "doc-1",
    documentTitle: "Q3 Strategy Proposal",
    phrase: "mitigate",
    definition:
      "/ˈmɪt.ɪ.ɡeɪt/ (verb) To make something less harmful, unpleasant, or bad • Giảm nhẹ, làm dịu bớt",
    exampleSentence:
      "Adopting standard type definitions helps mitigate runtime regressions.",
    createdAt: new Date("2026-08-14T09:15:00Z"),
    reviewItem: {
      id: "rev-v-3",
      interval: 28,
      easeFactor: 2.8,
      nextReviewAt: new Date("2026-09-11T09:15:00Z"), // Mastered!
      lastReviewedAt: new Date("2026-08-14T09:15:00Z"),
    },
  },
];

const meta: Meta<typeof VocabularyBank> = {
  title: "Components/VocabularyBank",
  component: VocabularyBank,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof VocabularyBank>;

export const Default: Story = {
  args: {
    initialItems: mockVocabulary,
  },
};

export const EmptyState: Story = {
  args: {
    initialItems: [],
  },
};
