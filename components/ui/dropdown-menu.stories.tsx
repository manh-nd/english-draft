import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  FilePlus2,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = {
  title: "UI/Dropdown Menu",
  component: DropdownMenu,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

function MenuTrigger({ label }: { label: string }) {
  return (
    <DropdownMenuTrigger asChild>
      <Button variant="outline">
        <MoreHorizontal data-icon="inline-start" />
        {label}
      </Button>
    </DropdownMenuTrigger>
  );
}

export const DocumentActions: Story = {
  render: () => (
    <DropdownMenu open>
      <MenuTrigger label="Document options" />
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput />
              Move to…
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuGroup>
                <DropdownMenuItem>Root (no folder)</DropdownMenuItem>
                <DropdownMenuItem>Client work</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive">
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const FolderActions: Story = {
  render: () => (
    <DropdownMenu open>
      <MenuTrigger label="Folder options" />
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <FilePlus2 />
            New Document
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Pencil />
            Rename
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive">
            <Trash2 />
            Delete folder
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
