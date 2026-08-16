import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listDueReviewItems } from "@/lib/db/review";
import { ReviewSessionClient } from "./review-client";
import { BrainCircuit } from "lucide-react";

export const metadata = {
  title: "Review Session | English Draft",
};

export default async function ReviewPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const dueItems = await listDueReviewItems(session.user.id);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <BrainCircuit className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Review Session
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dueItems.length === 0
              ? "You're all caught up! Come back later."
              : `${dueItems.length} item${dueItems.length === 1 ? "" : "s"} ready for review.`}
          </p>
        </div>
      </div>

      <ReviewSessionClient dueItems={dueItems} />
    </div>
  );
}
