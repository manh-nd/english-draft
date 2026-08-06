import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { AppSidebarClient } from "@/components/sidebar/app-sidebar-client";
import { AppContentArea } from "@/components/sidebar/app-content-area";
import {
  parseSidebarPinnedPreference,
  SIDEBAR_PINNED_COOKIE,
} from "@/lib/sidebar-preference";

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
  const sidebarPinned = parseSidebarPinnedPreference(
    (await cookies()).get(SIDEBAR_PINNED_COOKIE.name)?.value
  );

  return (
    <SidebarProvider defaultPinned={sidebarPinned}>
      <Sidebar>
        <AppSidebarClient
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          }}
        />
        <SidebarRail />
      </Sidebar>

      {/* ── Main content area ───────────────────── */}
      <SidebarInset>
        <AppContentArea>{children}</AppContentArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
