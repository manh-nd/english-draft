import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CorrectionBank } from "./correction-bank";
import type { CorrectionWithDocument } from "@/lib/db/corrections";

const mockCorrections: CorrectionWithDocument[] = [
  {
    id: "c-1",
    userId: "user-1",
    documentId: "doc-1",
    documentTitle: "Q3 Strategy Proposal",
    originalText: "We was discussing about the new feature roadmap yesterday.",
    correctedText: "We were discussing the new feature roadmap yesterday.",
    errorType: "grammar",
    context:
      "During the quarterly sync, we was discussing about the new feature roadmap yesterday with the leadership team.",
    starred: true,
    createdAt: new Date("2026-08-16T10:00:00Z"),
    reviewItem: {
      id: "rev-1",
      interval: 3,
      easeFactor: 2.5,
      nextReviewAt: new Date("2026-08-19T10:00:00Z"),
      lastReviewedAt: null,
    },
  },
  {
    id: "c-2",
    userId: "user-1",
    documentId: "doc-2",
    documentTitle: "Technical Architecture Memo",
    originalText:
      "The system is very good at making things fast and not breaking.",
    correctedText:
      "The architecture provides high throughput, low latency, and robust fault tolerance.",
    errorType: "style",
    context:
      "In conclusion, the system is very good at making things fast and not breaking when concurrent traffic spikes occur.",
    starred: false,
    createdAt: new Date("2026-08-15T14:30:00Z"),
    reviewItem: {
      id: "rev-2",
      interval: 1,
      easeFactor: 2.5,
      nextReviewAt: new Date("2026-08-16T08:00:00Z"), // Due!
      lastReviewedAt: null,
    },
  },
  {
    id: "c-3",
    userId: "user-1",
    documentId: "doc-1",
    documentTitle: "Q3 Strategy Proposal",
    originalText:
      "We need to do an explanation to explain the problem clearly.",
    correctedText: "We need to clarify the core issue.",
    errorType: "vocabulary",
    context:
      "Before presenting to stakeholders, we need to do an explanation to explain the problem clearly to align team expectations.",
    starred: true,
    createdAt: new Date("2026-08-14T09:15:00Z"),
    reviewItem: {
      id: "rev-3",
      interval: 25,
      easeFactor: 2.7,
      nextReviewAt: new Date("2026-09-10T09:15:00Z"), // Mastered!
      lastReviewedAt: new Date("2026-08-14T09:15:00Z"),
    },
  },
];

const meta: Meta<typeof CorrectionBank> = {
  title: "Components/CorrectionBank",
  component: CorrectionBank,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof CorrectionBank>;

export const Default: Story = {
  args: {
    initialCorrections: mockCorrections,
  },
};

export const EmptyState: Story = {
  args: {
    initialCorrections: [],
  },
};
