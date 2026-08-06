import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./alert";

const meta = {
  title: "UI/Alert",
  component: Alert,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs", "ticket-13"],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-80">
      <CircleAlert />
      <AlertTitle>Search failed</AlertTitle>
      <AlertDescription>Showing your document tree.</AlertDescription>
    </Alert>
  ),
};
