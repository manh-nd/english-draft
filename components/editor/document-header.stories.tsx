import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DocumentHeader } from "./document-header";

const dummyFolders = [
  { id: "folder-1", name: "Work Emails" },
  { id: "folder-2", name: "Technical Docs" },
  { id: "folder-3", name: "English Exercises" },
];

const meta = {
  title: "Editor/DocumentHeader",
  component: DocumentHeader,
  parameters: {
    layout: "padded",
  },
  args: {
    documentId: "doc-1",
    initialTitle: "Q3 Strategy Proposal",
    initialFolderId: "folder-1",
    folders: dummyFolders,
    updatedAt: new Date().toISOString(),
    saveStatus: "saved",
    wordCount: 428,
    sidePanelOpen: false,
    onToggleSidePanel: () => {},
    onScanDocument: () => {},
    onExportMarkdown: () => {},
    onExportPlainText: () => {},
    onTitleChange: () => true,
    onFolderChange: () => true,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DocumentHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialTitle: "Q3 Strategy Proposal",
    initialFolderId: "folder-1",
    saveStatus: "saved",
    wordCount: 428,
  },
};

export const SavingState: Story = {
  args: {
    initialTitle: "Drafting Client Email",
    initialFolderId: null,
    saveStatus: "saving",
    wordCount: 156,
  },
};

export const SidePanelOpen: Story = {
  args: {
    initialTitle: "Quarterly Performance Review",
    initialFolderId: "folder-2",
    sidePanelOpen: true,
    wordCount: 890,
  },
};
