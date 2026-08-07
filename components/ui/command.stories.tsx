import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FileText } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

const meta = {
  title: "UI/Command",
  component: Command,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Results: Story = {
  render: () => (
    <Command className="w-80 border" shouldFilter={false}>
      <CommandInput placeholder="Search documents…" defaultValue="project" />
      <CommandList>
        <CommandGroup heading="Documents">
          <CommandItem value="project-proposal">
            <FileText data-icon="inline-start" />
            Project proposal
          </CommandItem>
          <CommandItem value="project-retrospective">
            <FileText data-icon="inline-start" />
            Project retrospective
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const Empty: Story = {
  render: () => (
    <Command className="w-80 border">
      <CommandInput placeholder="Search documents…" defaultValue="missing" />
      <CommandList>
        <CommandEmpty>No documents found.</CommandEmpty>
      </CommandList>
    </Command>
  ),
};
