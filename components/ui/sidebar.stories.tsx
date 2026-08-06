import type { Meta, StoryObj } from "@storybook/react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "./sidebar";
import { FileText, User } from "lucide-react";

const meta: Meta<typeof Sidebar> = {
  title: "UI/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

function SidebarStoryNavigation({ showRail = false }: { showRail?: boolean }) {
  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 font-semibold">
          <FileText />
          <span>App Sidebar</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <FileText />
                  <span>Documents</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {showRail && <SidebarRail />}
    </>
  );
}

export const Default: Story = {
  render: () => (
    <SidebarProvider>
      <Sidebar>
        <SidebarStoryNavigation />
        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <User />
            <span>User Account</span>
          </div>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  ),
};

export const CollapsedHoverAndPin: Story = {
  render: () => (
    <SidebarProvider defaultPinned={false}>
      <Sidebar>
        <SidebarStoryNavigation showRail />
      </Sidebar>
      <main className="flex min-h-svh flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <p className="text-sm text-muted-foreground">
            Hover the left edge to preview, then click to pin.
          </p>
        </div>
      </main>
    </SidebarProvider>
  ),
};
