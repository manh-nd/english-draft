"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 text-xs font-normal text-muted-foreground hover:text-foreground"
      onClick={handleSignOut}
    >
      <LogOut data-icon="inline-start" />
      Sign out
    </Button>
  );
}
