import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppSidebarClient } from "@/components/sidebar/app-sidebar-client";
import { AppContentArea } from "@/components/sidebar/app-content-area";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebarClient
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          }}
        />
      </Sidebar>

      {/* ── Main content area ───────────────────── */}
      <SidebarInset>
        <AppContentArea>{children}</AppContentArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
