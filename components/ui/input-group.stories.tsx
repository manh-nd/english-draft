import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Search, X } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./input-group";

const meta = {
  title: "UI/Input Group",
  component: InputGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SearchInput: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupInput
        type="text"
        placeholder="Search documents…"
        aria-label="Search documents"
      />
      <InputGroupAddon align="inline-start">
        <Search />
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const SearchWithClearAction: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupInput
        type="text"
        value="project"
        readOnly
        aria-label="Search documents"
      />
      <InputGroupAddon align="inline-start">
        <Search />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" aria-label="Clear search">
          <X data-icon="inline-start" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
