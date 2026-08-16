import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeroLearningWidget } from "./hero-learning-widget";
import { QuickStartTemplates } from "./quick-start-templates";
import { RecentDocuments } from "./recent-documents";
import { DashboardClient } from "./dashboard-client";
import type { DocumentWithFolder } from "@/lib/db/documents";

const sampleDocuments: DocumentWithFolder[] = [
  {
    id: "doc-1",
    title: "Client Proposal & Project Roadmap",
    folderId: "f-1",
    folderName: "Client Work",
    textContent:
      "This document outlines the proposed roadmap, architecture, and weekly milestones for our upcoming client engagement.",
    createdAt: new Date("2026-08-15T10:00:00Z"),
    updatedAt: new Date("2026-08-16T08:30:00Z"),
  },
  {
    id: "doc-2",
    title: "English Idioms & Business Expressions",
    folderId: null,
    folderName: null,
    textContent:
      "A curated collection of professional English idioms, phrasal verbs, and nuance examples used in daily communication.",
    createdAt: new Date("2026-08-14T14:00:00Z"),
    updatedAt: new Date("2026-08-15T16:45:00Z"),
  },
  {
    id: "doc-3",
    title: "Weekly Engineering Sync Notes",
    folderId: "f-2",
    folderName: "Meetings",
    textContent:
      "Meeting notes covering system performance, database index optimization, and upcoming feature deadlines.",
    createdAt: new Date("2026-08-13T09:00:00Z"),
    updatedAt: new Date("2026-08-14T11:20:00Z"),
  },
];

const meta = {
  title: "Dashboard/Workspace",
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const FullDashboard: Story = {
  render: () => (
    <div className="bg-background min-h-screen">
      <DashboardClient
        user={{
          id: "user-1",
          name: "Alex Johnson",
          email: "alex@example.com",
        }}
        dueCount={4}
        totalVocabulary={28}
        totalCorrections={19}
        recentDocuments={sampleDocuments}
      />
    </div>
  ),
};

export const HeroWidgetDueReviews: Story = {
  render: () => (
    <div className="p-6 max-w-4xl mx-auto bg-background">
      <HeroLearningWidget
        dueCount={6}
        totalVocabulary={34}
        totalCorrections={21}
      />
    </div>
  ),
};

export const HeroWidgetCaughtUp: Story = {
  render: () => (
    <div className="p-6 max-w-4xl mx-auto bg-background">
      <HeroLearningWidget
        dueCount={0}
        totalVocabulary={42}
        totalCorrections={15}
      />
    </div>
  ),
};

export const TemplatesGrid: Story = {
  render: () => (
    <div className="p-6 max-w-5xl mx-auto bg-background">
      <QuickStartTemplates onSelectTemplate={() => {}} />
    </div>
  ),
};

export const RecentDocumentsList: Story = {
  render: () => (
    <div className="p-6 max-w-5xl mx-auto bg-background">
      <RecentDocuments documents={sampleDocuments} onNewDocument={() => {}} />
    </div>
  ),
};

export const RecentDocumentsEmptyState: Story = {
  render: () => (
    <div className="p-6 max-w-5xl mx-auto bg-background">
      <RecentDocuments documents={[]} onNewDocument={() => {}} />
    </div>
  ),
};
