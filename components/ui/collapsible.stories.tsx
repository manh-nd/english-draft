import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";

const meta = {
  title: "UI/Collapsible",
  component: Collapsible,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

function FolderDisclosure({ open }: { open: boolean }) {
  return (
    <Collapsible open={open} className="flex w-72 flex-col gap-1">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          {open ? (
            <FolderOpen data-icon="inline-start" />
          ) : (
            <Folder data-icon="inline-start" />
          )}
          Client work
          <ChevronRight
            data-icon="inline-end"
            className={cn("ml-auto", open && "rotate-90")}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-1 pl-6">
        <Button variant="ghost" className="w-full justify-start">
          <FileText data-icon="inline-start" />
          Project proposal
        </Button>
        <Button variant="ghost" className="w-full justify-start">
          <FileText data-icon="inline-start" />
          Meeting notes
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const Expanded: Story = {
  render: () => <FolderDisclosure open />,
};

export const Collapsed: Story = {
  render: () => <FolderDisclosure open={false} />,
};
