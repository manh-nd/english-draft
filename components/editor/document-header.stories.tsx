import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
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
    sidePanelOpen: false,
    onToggleSidePanel: fn(),
    onScanDocument: fn(),
    onExportMarkdown: fn(),
    onExportPlainText: fn(),
    onTitleChange: fn(() => true),
    onFolderChange: fn(() => true),
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
  },
};

export const SavingState: Story = {
  args: {
    initialTitle: "Drafting Client Email",
    initialFolderId: null,
    saveStatus: "saving",
  },
};

export const SidePanelOpen: Story = {
  args: {
    initialTitle: "Quarterly Performance Review",
    initialFolderId: "folder-2",
    sidePanelOpen: true,
  },
};

export const MultiLineTitleAutoExpanded: Story = {
  args: {
    initialTitle:
      "Comprehensive Architectural Review and Optimization Strategy for Next-Generation Interactive Rich Text Workspace in English Draft",
    initialFolderId: "folder-2",
    saveStatus: "saved",
  },
};

export const EditTitleInteraction: Story = {
  args: {
    initialTitle: "Draft Note",
    onTitleChange: fn(() => true),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const titleInput = await canvas.findByPlaceholderText("Untitled Document");
    await expect(titleInput).toBeInTheDocument();
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Executive Summary Strategy{Enter}");
    await expect(args.onTitleChange).toHaveBeenCalledWith(
      "Executive Summary Strategy"
    );
  },
};

export const ChangeFolderInteraction: Story = {
  args: {
    initialTitle: "Quarterly Review",
    initialFolderId: "folder-1",
    folders: dummyFolders,
    onFolderChange: fn(() => true),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const folderTrigger = await canvas.findByRole("button", {
      name: /work emails/i,
    });
    await userEvent.click(folderTrigger);

    const body = within(document.body);
    const techDocsOption = await body.findByText("Technical Docs");
    await userEvent.click(techDocsOption);
    await expect(args.onFolderChange).toHaveBeenCalledWith("folder-2");
  },
};

export const ToggleAssistantInteraction: Story = {
  args: {
    initialTitle: "Product Plan",
    sidePanelOpen: false,
    onToggleSidePanel: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const toggleBtn = await canvas.findByRole("button", {
      name: /assistant/i,
    });
    await expect(toggleBtn).toBeInTheDocument();
    await userEvent.click(toggleBtn);
    await expect(args.onToggleSidePanel).toHaveBeenCalled();
  },
};
