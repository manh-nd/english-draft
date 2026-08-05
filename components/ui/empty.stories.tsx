import type { Meta, StoryObj } from "@storybook/react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "./empty";
import { Button } from "./button";
import { FileQuestion } from "lucide-react";

const meta = {
  title: "UI/Empty",
  component: Empty,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Empty className="w-80">
      <EmptyMedia variant="icon">
        <FileQuestion />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>No documents found</EmptyTitle>
        <EmptyDescription>
          Get started by creating a new document or importing one.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm">Create Document</Button>
      </EmptyContent>
    </Empty>
  ),
};
