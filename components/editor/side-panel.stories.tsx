import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SidePanel } from "./side-panel";

const meta = {
  title: "Editor/Side Panel",
  component: SidePanel,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    documentId: "doc-1",
    isOpen: true,
    onClose: () => {},
  },
  decorators: [
    (Story) => (
      <div className="flex h-[600px] w-full border bg-background">
        <div className="flex-1 p-6 text-sm text-muted-foreground">
          Editor main content placeholder
        </div>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSelectedContext: Story = {
  args: {
    selectedText:
      "Artificial intelligence is rapidly transforming how we collaborate, draft documentation, and learn foreign languages effectively.",
    onClearSelectedText: () => {},
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
