import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
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
    onClose: fn(),
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
    onClearSelectedText: fn(),
  },
};

export const CustomWidth: Story = {
  decorators: [
    (Story) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("english-draft:side-panel-width", "520");
      }
      return (
        <div className="flex h-[600px] w-full border bg-background">
          <div className="flex-1 p-6 text-sm text-muted-foreground">
            Editor with 520px expanded AI side panel
          </div>
          <Story />
        </div>
      );
    },
  ],
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};

export const TypeAndSendMessageInteraction: Story = {
  args: {
    documentId: "doc-1",
    isOpen: true,
    onClose: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = await canvas.findByPlaceholderText(/Ask AI anything/i);
    await expect(textarea).toBeInTheDocument();
    await userEvent.type(
      textarea,
      "Explain the difference between will and going to"
    );
    const sendButton = await canvas.findByRole("button", {
      name: /send message/i,
    });
    await expect(sendButton).toBeInTheDocument();
    await userEvent.click(sendButton);
    await expect(
      await canvas.findByText(
        /Explain the difference between will and going to/i
      )
    ).toBeInTheDocument();
  },
};

export const ClearSelectedContextInteraction: Story = {
  args: {
    documentId: "doc-1",
    isOpen: true,
    selectedText: "The team will conduct a comprehensive retrospective.",
    onClose: fn(),
    onClearSelectedText: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const clearBtn = await canvas.findByRole("button", {
      name: /clear selected text context/i,
    });
    await expect(clearBtn).toBeInTheDocument();
    await userEvent.click(clearBtn);
    await expect(args.onClearSelectedText).toHaveBeenCalled();
  },
};

export const ToggleFullDocumentSwitchInteraction: Story = {
  args: {
    documentId: "doc-1",
    isOpen: true,
    onClose: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggleSwitch = await canvas.findByRole("switch");
    await expect(toggleSwitch).toHaveAttribute("aria-checked", "false");
    await userEvent.click(toggleSwitch);
    await expect(toggleSwitch).toHaveAttribute("aria-checked", "true");
  },
};
