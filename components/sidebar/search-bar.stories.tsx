import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SearchBar } from "./search-bar";
import { SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";

const meta = {
  title: "Sidebar/SearchBar",
  component: SearchBar,
  parameters: {
    layout: "centered",
  },
  args: {
    value: "",
    onChange: () => {},
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "",
    className: "w-64",
  },
};

export const WithValue: Story = {
  args: {
    value: "Grammar notes",
    className: "w-64",
  },
};

export const InsideSidebarHeader: Story = {
  render: () => (
    <SidebarProvider defaultPinned>
      <div className="w-64 border rounded-md bg-sidebar">
        <SidebarHeader>
          <SearchBar value="Search query" onChange={() => {}} />
        </SidebarHeader>
      </div>
    </SidebarProvider>
  ),
};
